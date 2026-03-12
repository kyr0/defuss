import type { Worker } from "node:cluster";
import type { Socket, Server } from "node:net";
import type { TelemetrySink } from "defuss-open-telemetry";

/**
 * Duck-typed Express-compatible application.
 *
 * Accepts any object whose `.listen()` method binds to a port.
 * HTTP verb helpers (`get`, `post`, …) are optional so that
 * lightweight frameworks like `ultimate-express` satisfy the contract.
 */
export type ExpressLike = {
  listen: (...args: any[]) => any;
  disable?: (name: string) => void;
  use?: (...args: any[]) => any;
  get?: (...args: any[]) => any;
  post?: (...args: any[]) => any;
  put?: (...args: any[]) => any;
  patch?: (...args: any[]) => any;
  delete?: (...args: any[]) => any;
  options?: (...args: any[]) => any;
  head?: (...args: any[]) => any;
  all?: (...args: any[]) => any;
} & Record<string, unknown>;

/** Minimal structured logger accepted by defuss-express. */
export type LoggerLike = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
};

/**
 * Result of parsing the HTTP/1.x request-line and headers from a
 * raw TCP buffer.  Produced by {@link parseRequestHead} and fed to
 * load-balancer functions for request-aware routing decisions.
 */
export type ParsedRequest = {
  /** HTTP method (`GET`, `POST`, …) – `undefined` if the buffer was unparseable. */
  method?: string;
  /** Request path including query string. */
  path?: string;
  /** HTTP version string, e.g. `"1.1"`. */
  httpVersion?: string;
  /** Value of the `Host` header, if present. */
  host?: string;
  /** Lowercase header name → trimmed value map. */
  headers: Record<string, string>;
  /** Remote IP of the connecting client. */
  remoteAddress?: string;
  /** Remote port of the connecting client. */
  remotePort?: number;
  /** `"http1"` when the request-line was successfully parsed, otherwise `"unknown"`. */
  protocol: "http1" | "unknown";
  /** The raw header bytes decoded as `latin1`. */
  rawHead: string;
};

/**
 * Point-in-time resource snapshot reported by a worker process via
 * IPC heartbeat messages.  Used by the resource-aware load balancer
 * to steer traffic away from saturated workers.
 */
export type WorkerRuntimeStats = {
  /** OS-level process id. */
  pid: number;
  /** Sampled CPU usage as a percentage of one core (0–100+). */
  cpuPercent: number;
  /** Resident set size in bytes. */
  rssBytes: number;
  /** V8 heap used in bytes. */
  heapUsedBytes: number;
  /** V8 total heap in bytes. */
  heapTotalBytes: number;
  /** V8 external memory in bytes. */
  externalBytes: number;
  /** V8 ArrayBuffer memory in bytes. */
  arrayBuffersBytes: number;
  /** Process uptime in milliseconds. */
  uptimeMs: number;
  /** Number of currently tracked application-level connections. */
  activeConnections: number;
  /** `Date.now()` when the snapshot was taken. */
  sampledAt: number;
};

/**
 * Describes a single worker backend as seen by the primary-process
 * load balancer.
 */
export type BackendCandidate = {
  /** Stable identifier, e.g. `"worker-0"`. */
  id: string;
  /** Zero-based index in the worker pool. */
  workerIndex: number;
  /** Hostname/IP the worker listens on. */
  host: string;
  /** TCP port the worker listens on. */
  port: number;
  /** OS pid of the worker process, set once the worker reports in. */
  pid?: number;
  /** `true` when the worker is considered able to serve traffic. */
  healthy: boolean;
  /** `true` after the worker has sent its `"defuss:worker-ready"` message. */
  ready: boolean;
  /** `Date.now()` of the last heartbeat received from this worker. */
  lastHeartbeatAt?: number;
  /** Number of TCP proxy connections the primary is currently forwarding to this worker. */
  activeProxyConnections: number;
  /** Most recent resource snapshot from the worker. */
  stats?: WorkerRuntimeStats;
};

/**
 * Context object passed to a {@link LoadBalancerFunction} on every
 * inbound connection so it can make a routing decision.
 */
export type LoadBalancerContext = {
  /** Healthy, ready backend candidates to choose from. */
  candidates: BackendCandidate[];
  /** Parsed HTTP request head (method, path, host, headers). */
  request: ParsedRequest;
  /** Raw client TCP socket (for advanced inspection). */
  socket: Socket;
  /** Monotonically incrementing counter for round-robin tracking. */
  previousIndex: number;
};

/**
 * Signature for a pluggable load-balancer strategy.
 *
 * Receives a {@link LoadBalancerContext} and must return (or resolve)
 * the {@link BackendCandidate} that should receive the connection.
 */
export type LoadBalancerFunction = (
  context: LoadBalancerContext,
) => BackendCandidate | Promise<BackendCandidate>;

/**
 * User-facing configuration object passed to {@link startServer} or
 * {@link setServerConfig}.  Every field is optional; omitted values
 * fall back to sensible defaults (see {@link ResolvedServerConfig}).
 */
export type ServerConfigInput = {
  /** Bind address for the public-facing load balancer (default `"0.0.0.0"`). */
  host?: string;
  /** Public-facing TCP port (default `3000`). */
  port?: number;
  /** Bind address for per-worker listeners (default `"127.0.0.1"`). */
  workerHost?: string;
  /** First port in the worker port range (default `3001`). */
  baseWorkerPort?: number;
  /** Number of worker processes, or `"auto"` for one per available core. */
  workers?: number | "auto";
  /** Max time (ms) the load balancer waits for a request head before blind-forwarding (default `10`). */
  requestInspectionTimeoutMs?: number;
  /** Max bytes buffered while sniffing the request head (default `16384`). */
  maxHeaderBytes?: number;
  /** Enable TCP half-open on proxy sockets (default `true`). */
  allowHalfOpen?: boolean;
  /** Interval (ms) at which workers send heartbeat stats (default `60000`). */
  workerHeartbeatIntervalMs?: number;
  /** A worker is considered stale after this many ms without a heartbeat (default `150000`). */
  workerHeartbeatStaleAfterMs?: number;
  /** Max time (ms) to wait for graceful shutdown before force-killing (default `10000`). */
  gracefulShutdownTimeoutMs?: number;
  /** Re-fork workers that exit unexpectedly (default `true`). */
  respawnWorkers?: boolean;
  /** Custom load-balancer function. */
  loadBalancer?: LoadBalancerFunction;
  /** Structured logger override (defaults to `console`). */
  logger?: Partial<LoggerLike>;
  /** Extra environment variables forwarded to forked workers. */
  workerEnv?: Record<string, string>;
  /** Install `SIGINT`/`SIGTERM` handlers automatically (default `true`). */
  installSignalHandlers?: boolean;
  /**
   * Optional telemetry sink for emitting counters, histograms, and
   * gauges.  Defaults to a silent no-op when omitted.
   *
   * @example
   * ```ts
   * import { createOpenTelemetrySink, OtelMeterAdapter } from "defuss-open-telemetry";
   * import { metrics } from "@opentelemetry/api";
   *
   * setServerConfig({
   *   telemetry: createOpenTelemetrySink({
   *     meter: new OtelMeterAdapter(metrics.getMeter("my-app")),
   *     prefix: "defuss.express.",
   *   }),
   * });
   * ```
   */
  telemetry?: TelemetrySink;
};

/**
 * Fully resolved server configuration with all defaults applied.
 * Produced by {@link resolveServerConfig}.
 */
export type ResolvedServerConfig = {
  host: string;
  port: number;
  workerHost: string;
  baseWorkerPort: number;
  workers: number;
  requestInspectionTimeoutMs: number;
  maxHeaderBytes: number;
  allowHalfOpen: boolean;
  workerHeartbeatIntervalMs: number;
  workerHeartbeatStaleAfterMs: number;
  gracefulShutdownTimeoutMs: number;
  respawnWorkers: boolean;
  loadBalancer?: LoadBalancerFunction;
  logger: LoggerLike;
  workerEnv: Record<string, string>;
  installSignalHandlers: boolean;
  /** Active telemetry sink (defaults to {@link noopTelemetrySink}). */
  telemetry: TelemetrySink;
};

/**
 * Discriminated union of IPC messages sent from a worker process to
 * the primary.  The `type` field identifies the message kind.
 */
export type DefussMessageFromWorker =
  | {
      type: "defuss:worker-ready";
      workerIndex: number;
      port: number;
      pid: number;
      stats: WorkerRuntimeStats;
    }
  | {
      type: "defuss:worker-stats";
      workerIndex: number;
      port: number;
      pid: number;
      stats: WorkerRuntimeStats;
    }
  | {
      type: "defuss:worker-stopping";
      workerIndex: number;
      port: number;
      pid: number;
    };

/** Internal backend registry entry that additionally stores the cluster Worker handle. */
export type BackendRegistryEntry = BackendCandidate & {
  worker?: Worker;
};

/** Mutable singleton state for the primary (load-balancer) process. */
export type PrimaryRuntime = {
  mode: "primary";
  listenServer?: Server;
  backends: Map<number, BackendRegistryEntry>;
  workerByIndex: Map<number, Worker>;
  workerIndexById: Map<number, number>;
  signalHandlersInstalled: boolean;
  startPromise?: Promise<StartServerResult>;
  stopPromise?: Promise<void>;
};

/** Mutable singleton state for a worker process. */
export type WorkerRuntime = {
  mode: "worker";
  appServer?: Server;
  heartbeatTimer?: NodeJS.Timeout;
  activeConnections: Set<Socket>;
  signalHandlersInstalled: boolean;
  stopPromise?: Promise<void>;
};

/** Value returned by {@link startServer} describing the running process. */
export type StartServerResult = {
  /** Whether this process is the `"primary"` load balancer or a `"worker"`. */
  mode: "primary" | "worker";
  /** OS-level process id. */
  pid: number;
  /** Host the process is listening on. */
  host: string;
  /** Port the process is listening on. */
  port: number;
  /** Worker index (only set in worker mode). */
  workerIndex?: number;
  /** Worker port (only set in worker mode). */
  workerPort?: number;
  /** Total number of workers (only set in primary mode). */
  workers?: number;
};
