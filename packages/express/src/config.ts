import process from "node:process";
import os from "node:os";

import { noopTelemetrySink } from "defuss-open-telemetry";
import { defaultLoadBalancer } from "./load-balancers.js";
import type {
  LoggerLike,
  ResolvedServerConfig,
  ServerConfigInput,
} from "./types.js";

const defaultLogger: LoggerLike = {
  debug: (...args) => console.debug(...args),
  info: (...args) => console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

const availableCpus = (): number =>
  typeof os.availableParallelism === "function"
    ? os.availableParallelism()
    : os.cpus().length;

const fallbackConfig = (): ResolvedServerConfig => ({
  host: process.env.HOST ?? process.env.LISTEN_HOST ?? "0.0.0.0",
  port: Number(process.env.PORT ?? process.env.LISTEN_PORT ?? 3000),
  workerHost: process.env.WORKER_HOST ?? "127.0.0.1",
  baseWorkerPort: Number(process.env.BASE_WORKER_PORT ?? 3001),
  workers: availableCpus(),
  requestInspectionTimeoutMs: 10,
  maxHeaderBytes: 16 * 1024,
  allowHalfOpen: true,
  workerHeartbeatIntervalMs: 60_000,
  workerHeartbeatStaleAfterMs: 150_000,
  gracefulShutdownTimeoutMs: 10_000,
  respawnWorkers: true,
  loadBalancer: defaultLoadBalancer,
  logger: defaultLogger,
  workerEnv: {},
  installSignalHandlers: true,
  telemetry: noopTelemetrySink,
});

let currentConfig = fallbackConfig();

/**
 * Merge partial user input with current and default configuration,
 * producing a fully resolved config.  Called internally by
 * {@link setServerConfig} and {@link startServer}.
 */
export const resolveServerConfig = (
  next?: ServerConfigInput,
): ResolvedServerConfig => {
  const defaults = fallbackConfig();
  const workersInput = next?.workers ?? currentConfig.workers ?? defaults.workers;
  const workers =
    workersInput === "auto"
      ? availableCpus()
      : Math.max(1, Math.floor(workersInput));

  const resolvedLogger: LoggerLike = {
    ...defaultLogger,
    ...(currentConfig.logger ?? {}),
    ...(next?.logger ?? {}),
  };

  return {
    ...defaults,
    ...currentConfig,
    ...next,
    workers,
    logger: resolvedLogger,
    workerEnv: {
      ...(currentConfig.workerEnv ?? {}),
      ...(next?.workerEnv ?? {}),
    },
    loadBalancer: next?.loadBalancer ?? currentConfig.loadBalancer ?? defaults.loadBalancer,
    telemetry: next?.telemetry ?? currentConfig.telemetry ?? defaults.telemetry,
  };
};

/**
 * Apply partial configuration and store it as the current config.
 * Returns the fully resolved result.
 */
export const setServerConfig = (next: ServerConfigInput): ResolvedServerConfig => {
  currentConfig = resolveServerConfig(next);
  return currentConfig;
};

/** Return the current resolved server configuration. */
export const getServerConfig = (): ResolvedServerConfig => currentConfig;
