import process from "node:process";
import type { Socket } from "node:net";

import type {
  DefussMessageFromWorker,
  ExpressLike,
  ResolvedServerConfig,
  StartServerResult,
  WorkerRuntimeStats,
} from "./types.js";
import { workerRuntime } from "./runtime.js";
import { getServerConfig } from "./config.js";

const now = (): number => Date.now();

const getWorkerIndex = (): number => Number(process.env.DEFUSS_WORKER_INDEX ?? 0);

const getWorkerPort = (config: ResolvedServerConfig): number =>
  config.baseWorkerPort + getWorkerIndex();

/**
 * Collect a point-in-time memory and process snapshot.
 *
 * **Note**: `cpuPercent` is always `0` here — CPU utilisation requires a
 * delta between two `process.cpuUsage()` readings and is only available
 * from {@link createCpuSampler}.  Callers that transmit this snapshot over
 * IPC (e.g. {@link createStatsReporter}) overwrite `cpuPercent` with the
 * sampler's result before sending.
 */
const serializeWorkerStats = (): WorkerRuntimeStats => {
  const memory = process.memoryUsage();
  return {
    pid: process.pid,
    cpuPercent: 0,
    rssBytes: memory.rss,
    heapUsedBytes: memory.heapUsed,
    heapTotalBytes: memory.heapTotal,
    externalBytes: memory.external,
    arrayBuffersBytes: memory.arrayBuffers,
    uptimeMs: process.uptime() * 1000,
    activeConnections: workerRuntime.activeConnections.size,
    sampledAt: now(),
  };
};

/**
 * Create a CPU utilisation sampler based on `process.cpuUsage()` deltas.
 *
 * Each call to the returned function computes the percentage of one logical
 * CPU core consumed since the **previous** call (or since construction on
 * the very first call).  A value above 100 means more than one core was
 * active during the interval.
 *
 * The first invocation measures CPU from sampler-construction time onward,
 * which naturally captures any startup work — subsequent readings reflect
 * ongoing steady-state load.
 */
const createCpuSampler = () => {
  let previousUsage = process.cpuUsage();
  let previousTime = process.hrtime.bigint();

  return (): number => {
    const usage = process.cpuUsage(previousUsage);
    const currentTime = process.hrtime.bigint();
    const elapsedMicros = Number(currentTime - previousTime) / 1_000;

    previousUsage = process.cpuUsage();
    previousTime = currentTime;

    if (elapsedMicros <= 0) {
      return 0;
    }

    const consumedMicros = usage.user + usage.system;
    return (consumedMicros / elapsedMicros) * 100;
  };
};

const createStatsReporter = (
  config: ResolvedServerConfig,
  port: number,
) => {
  const sampleCpu = createCpuSampler();

  const buildMessage = (
    type: DefussMessageFromWorker["type"],
  ): DefussMessageFromWorker => {
    const cpuPercent = sampleCpu();
    const stats: WorkerRuntimeStats = {
      ...serializeWorkerStats(),
      cpuPercent,
    };

    config.telemetry.setGauge("active_connections", stats.activeConnections);
    config.telemetry.recordHistogram("cpu_percent", cpuPercent);

    return {
      type,
      workerIndex: getWorkerIndex(),
      port,
      pid: process.pid,
      stats,
    } as DefussMessageFromWorker;
  };

  return {
    announceReady: () => process.send?.(buildMessage("defuss:worker-ready")),
    announceHeartbeat: () => process.send?.(buildMessage("defuss:worker-stats")),
    announceStopping: () =>
      process.send?.({
        type: "defuss:worker-stopping",
        workerIndex: getWorkerIndex(),
        port,
        pid: process.pid,
      } satisfies DefussMessageFromWorker),
    startHeartbeatLoop: () => {
      workerRuntime.heartbeatTimer = setInterval(() => {
        process.send?.(buildMessage("defuss:worker-stats"));
      }, config.workerHeartbeatIntervalMs);
      workerRuntime.heartbeatTimer.unref();
    },
  };
};

const registerConnectionTracking = (socket: Socket) => {
  workerRuntime.activeConnections.add(socket);
  const cleanup = () => {
    workerRuntime.activeConnections.delete(socket);
  };

  socket.once("close", cleanup);
  socket.once("error", cleanup);
};

/**
 * Gracefully shut down the worker: stop the heartbeat loop, destroy
 * all tracked connections, and close the application server.
 */
export const stopWorkerRuntime = async (
  config: ResolvedServerConfig = getServerConfig(),
): Promise<void> => {
  if (workerRuntime.stopPromise) {
    return workerRuntime.stopPromise;
  }

  if (!workerRuntime.appServer) {
    return;
  }

  workerRuntime.stopPromise = new Promise<void>((resolve) => {
    if (workerRuntime.heartbeatTimer) {
      clearInterval(workerRuntime.heartbeatTimer);
      workerRuntime.heartbeatTimer = undefined;
    }

    for (const socket of workerRuntime.activeConnections) {
      socket.destroy();
    }

    const timeout = setTimeout(resolve, config.gracefulShutdownTimeoutMs);
    timeout.unref();

    try {
      workerRuntime.appServer?.close(() => {
        clearTimeout(timeout);
        resolve();
      });
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });

  return workerRuntime.stopPromise;
};

const installSignalHandlers = (
  reporter: ReturnType<typeof createStatsReporter>,
  config: ResolvedServerConfig,
) => {
  if (!config.installSignalHandlers || workerRuntime.signalHandlersInstalled) {
    return;
  }

  workerRuntime.signalHandlersInstalled = true;
  const stop = () => {
    reporter.announceStopping();
    void stopWorkerRuntime(config).finally(() => process.exit(0));
  };

  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
};

/**
 * Start the worker process: bind the Express-like app to its
 * assigned port, announce readiness to the primary via IPC, and begin
 * the periodic heartbeat loop that reports CPU, memory, and
 * connection statistics.
 */
export const startWorkerRuntime = async (
  app: ExpressLike,
  config: ResolvedServerConfig,
): Promise<StartServerResult> => {
  const port = getWorkerPort(config);
  const reporter = createStatsReporter(config, port);

  return new Promise<StartServerResult>((resolve) => {
    const server = app.listen(port, config.workerHost, () => {
      config.logger.info(
        `[defuss-express] worker ${process.pid} listening on http://${config.workerHost}:${port}`,
      );
      reporter.announceReady();
      reporter.announceHeartbeat();
      resolve({
        mode: "worker",
        pid: process.pid,
        host: config.workerHost,
        port,
        workerIndex: getWorkerIndex(),
        workerPort: port,
      });
    });

    workerRuntime.appServer = server;
    server.on?.("connection", registerConnectionTracking);
    reporter.startHeartbeatLoop();
    installSignalHandlers(reporter, config);
  });
};
