import cluster, { type Worker } from "node:cluster";
import net, { type Socket, type Server } from "node:net";
import process from "node:process";

import { parseRequestHead, hasCompleteHttpHeaders } from "./http-request.js";
import { pickBackend } from "./load-balancers.js";
import { primaryRuntime } from "./runtime.js";
import { getServerConfig } from "./config.js";
import type {
  BackendCandidate,
  DefussMessageFromWorker,
  ExpressLike,
  ParsedRequest,
  ResolvedServerConfig,
  StartServerResult,
} from "./types.js";

const now = (): number => Date.now();

const asCandidates = (config: ResolvedServerConfig): BackendCandidate[] =>
  [...primaryRuntime.backends.values()]
    .filter((backend) => backend.ready)
    .map((backend) => {
      const stale = backend.lastHeartbeatAt
        ? now() - backend.lastHeartbeatAt > config.workerHeartbeatStaleAfterMs
        : false;

      return {
        id: backend.id,
        workerIndex: backend.workerIndex,
        host: backend.host,
        port: backend.port,
        pid: backend.pid,
        ready: backend.ready,
        healthy: backend.healthy && !stale,
        lastHeartbeatAt: backend.lastHeartbeatAt,
        activeProxyConnections: backend.activeProxyConnections,
        stats: backend.stats,
      };
    })
    .filter((candidate) => candidate.healthy);

const waitFor = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Buffer the initial bytes of an inbound TCP connection up to
 * `maxHeaderBytes` or `requestInspectionTimeoutMs` (whichever comes
 * first) and parse the HTTP/1.x request head.
 *
 * The 10 ms default timeout keeps the hot path fast: if a full header
 * block arrives in time, the load balancer can inspect it for
 * host/path-based routing.  Otherwise the connection is forwarded
 * blindly with whatever bytes were collected.
 */
const collectPrelude = async (
  socket: Socket,
  config: ResolvedServerConfig,
): Promise<{ buffered: Buffer; request: ParsedRequest }> => {
  socket.pause();

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let total = 0;
    let settled = false;
    let bufferedSoFar = Buffer.alloc(0);

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      socket.pause();
      resolve({
        buffered: bufferedSoFar,
        request: parseRequestHead(bufferedSoFar, socket.remoteAddress, socket.remotePort),
      });
    };

    const onData = (chunk: Buffer) => {
      chunks.push(chunk);
      total += chunk.length;
      bufferedSoFar = Buffer.concat(chunks);
      if (total >= config.maxHeaderBytes || hasCompleteHttpHeaders(bufferedSoFar)) {
        finish();
      }
    };

    const onClose = () => finish();
    const onError = () => finish();

    const timer = setTimeout(finish, config.requestInspectionTimeoutMs);
    timer.unref();

    const cleanup = () => {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("close", onClose);
      socket.off("end", onClose);
      socket.off("error", onError);
    };

    socket.on("data", onData);
    socket.once("close", onClose);
    socket.once("end", onClose);
    socket.once("error", onError);
    socket.resume();
  });
};

const updateBackendFromWorkerMessage = (
  message: DefussMessageFromWorker,
  config: ResolvedServerConfig,
) => {
  const worker = primaryRuntime.workerByIndex.get(message.workerIndex);
  const backend = primaryRuntime.backends.get(message.workerIndex) ?? {
    id: `worker-${message.workerIndex}`,
    workerIndex: message.workerIndex,
    host: config.workerHost,
    port: message.port,
    pid: message.pid,
    ready: false,
    healthy: false,
    activeProxyConnections: 0,
  };

  if (message.type === "defuss:worker-stopping") {
    primaryRuntime.backends.set(message.workerIndex, {
      ...backend,
      worker,
      ready: false,
      healthy: false,
      pid: message.pid,
      lastHeartbeatAt: now(),
    });
    config.telemetry.setGauge("healthy_backends", asCandidates(config).length);
    return;
  }

  primaryRuntime.backends.set(message.workerIndex, {
    ...backend,
    worker,
    pid: message.pid,
    port: message.port,
    host: config.workerHost,
    ready: true,
    healthy: true,
    lastHeartbeatAt: now(),
    stats: message.stats,
  });
  config.telemetry.setGauge("healthy_backends", asCandidates(config).length);
};

const forkWorker = (
  index: number,
  config: ResolvedServerConfig,
): Worker => {
  const worker = cluster.fork({
    ...process.env,
    ...config.workerEnv,
    DEFUSS_WORKER_INDEX: String(index),
  });

  primaryRuntime.workerByIndex.set(index, worker);
  primaryRuntime.workerIndexById.set(worker.id, index);

  worker.on("message", (message: DefussMessageFromWorker) => {
    if (!message || typeof message !== "object" || !("type" in message)) {
      return;
    }
    updateBackendFromWorkerMessage(message, config);
  });

  return worker;
};

const installSignalHandlers = (
  stop: () => Promise<void>,
  config: ResolvedServerConfig,
) => {
  if (!config.installSignalHandlers || primaryRuntime.signalHandlersInstalled) {
    return;
  }

  primaryRuntime.signalHandlersInstalled = true;
  process.on("SIGINT", () => {
    void stop();
  });
  process.on("SIGTERM", () => {
    void stop();
  });
};

const waitForAtLeastOneReadyBackend = async (
  config: ResolvedServerConfig,
): Promise<void> => {
  const deadline = now() + Math.max(5_000, config.gracefulShutdownTimeoutMs);

  while (now() < deadline) {
    if (asCandidates(config).length > 0) {
      return;
    }
    await waitFor(25);
  }

  throw new Error("defuss-express: no worker became ready during startup");
};

const connectToBackend = async (
  client: Socket,
  config: ResolvedServerConfig,
  request: ParsedRequest,
  buffered: Buffer,
  previousIndexRef: { value: number },
): Promise<void> => {
  const candidates = asCandidates(config);
  if (candidates.length === 0) {
    client.destroy(new Error("defuss-express: no healthy backends are available"));
    return;
  }

  const backend = await pickBackend(
    {
      candidates,
      request,
      socket: client,
      previousIndex: previousIndexRef.value,
    },
    config.loadBalancer,
  );

  previousIndexRef.value += 1;

  const entry = primaryRuntime.backends.get(backend.workerIndex);
  if (!entry) {
    client.destroy(new Error("defuss-express: selected backend disappeared"));
    return;
  }

  entry.activeProxyConnections += 1;
  let released = false;
  const release = () => {
    if (released) {
      return;
    }
    released = true;
    entry.activeProxyConnections = Math.max(0, entry.activeProxyConnections - 1);
  };

  const upstream = net.connect({
    host: entry.host,
    port: entry.port,
    allowHalfOpen: config.allowHalfOpen,
  });

  const cleanup = () => {
    release();
    client.destroy();
    upstream.destroy();
  };

  upstream.once("connect", () => {
    client.setNoDelay(true);
    upstream.setNoDelay(true);
    if (buffered.length > 0) {
      upstream.write(buffered);
    }
    client.pipe(upstream);
    upstream.pipe(client);
    client.resume();
  });

  upstream.once("error", cleanup);
  upstream.once("close", () => {
    release();
    client.destroy();
  });
  client.once("error", cleanup);
  client.once("close", () => {
    release();
    upstream.destroy();
  });
};

const createLoadBalancer = (
  config: ResolvedServerConfig,
): Promise<Server> => {
  const previousIndexRef = { value: 0 };

  const listenServer = net.createServer(
    {
      allowHalfOpen: config.allowHalfOpen,
    },
    async (client) => {
      config.telemetry.incrementCounter("connections");
      try {
        const t0 = performance.now();
        const { buffered, request } = await collectPrelude(client, config);
        config.telemetry.recordHistogram("prelude_duration_ms", performance.now() - t0);
        await connectToBackend(client, config, request, buffered, previousIndexRef);
      } catch (error) {
        config.logger.error("[defuss-express] load balancer connection error", error);
        config.telemetry.incrementCounter("proxy_errors");
        client.destroy();
      }
    },
  );

  return new Promise((resolve, reject) => {
    listenServer.once("error", reject);
    listenServer.listen(config.port, config.host, () => {
      listenServer.off("error", reject);
      config.logger.info(
        `[defuss-express] primary ${process.pid} listening on tcp://${config.host}:${config.port}`,
      );
      resolve(listenServer);
    });
  });
};

/**
 * Gracefully shut down the primary process: close the listening
 * socket, send `SIGTERM` to all workers, and wait up to
 * `gracefulShutdownTimeoutMs` for cleanup.
 */
export const stopPrimaryRuntime = async (
  config: ResolvedServerConfig = getServerConfig(),
): Promise<void> => {
  if (primaryRuntime.stopPromise) {
    return primaryRuntime.stopPromise;
  }

  if (!primaryRuntime.listenServer) {
    return;
  }

  primaryRuntime.stopPromise = new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, config.gracefulShutdownTimeoutMs);
    timeout.unref();

    const finish = () => {
      clearTimeout(timeout);
      resolve();
    };

    try {
      primaryRuntime.listenServer?.close(finish);
    } catch {
      finish();
    }

    for (const worker of primaryRuntime.workerByIndex.values()) {
      worker.kill("SIGTERM");
    }
  });

  return primaryRuntime.stopPromise;
};

/**
 * Start the primary (load-balancer) process: fork `config.workers`
 * child processes, wait for at least one to become ready, then open
 * the public-facing TCP listener that proxies inbound connections to
 * healthy workers via the configured load-balancer strategy.
 */
export const startPrimaryRuntime = async (
  _app: ExpressLike,
  config: ResolvedServerConfig,
): Promise<StartServerResult> => {
  if (primaryRuntime.startPromise) {
    return primaryRuntime.startPromise;
  }

  primaryRuntime.startPromise = (async () => {
    for (let index = 0; index < config.workers; index += 1) {
      forkWorker(index, config);
    }

    cluster.on("exit", (worker) => {
      const index = primaryRuntime.workerIndexById.get(worker.id);
      if (index === undefined) {
        return;
      }

      primaryRuntime.workerIndexById.delete(worker.id);
      primaryRuntime.workerByIndex.delete(index);
      primaryRuntime.backends.delete(index);

      if (config.respawnWorkers && !primaryRuntime.stopPromise) {
        config.logger.warn(
          `[defuss-express] worker ${worker.process.pid ?? "unknown"} exited, respawning index ${index}`,
        );
        forkWorker(index, config);
      }
    });

    await waitForAtLeastOneReadyBackend(config);
    primaryRuntime.listenServer = await createLoadBalancer(config);
    installSignalHandlers(() => stopPrimaryRuntime(config), config);

    return {
      mode: "primary",
      pid: process.pid,
      host: config.host,
      port: config.port,
      workers: config.workers,
    };
  })();

  return primaryRuntime.startPromise;
};
