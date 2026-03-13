import cluster from "node:cluster";

import expressDefault, { express } from "./express.js";
import { getServerConfig, resolveServerConfig, setServerConfig } from "./config.js";
import { startPrimaryRuntime, stopPrimaryRuntime } from "./master.js";
import { startWorkerRuntime, stopWorkerRuntime } from "./worker.js";
import {
  createResourceAwareLoadBalancer,
  defaultLoadBalancer,
  leastConnectionsLoadBalancer,
  resourceAwareLoadBalancer,
  roundRobinLoadBalancer,
} from "./load-balancers.js";
import type {
  BackendCandidate,
  ExpressLike,
  LoadBalancerContext,
  LoadBalancerFunction,
  ParsedRequest,
  ResolvedServerConfig,
  ServerConfigInput,
  StartServerResult,
  WorkerRuntimeStats,
} from "./types.js";
import type { ResourceAwareLoadBalancerWeights } from "./load-balancers.js";

// Re-export Express types from ultimate-express for downstream consumers
import type UltimateExpressModule from "ultimate-express";
export type ExpressRequest = UltimateExpressModule.Request;
export type ExpressResponse = UltimateExpressModule.Response;
export type ExpressNextFunction = UltimateExpressModule.NextFunction;
export type ExpressApplication = UltimateExpressModule.Application;
export type ExpressRequestHandler = UltimateExpressModule.RequestHandler;
export type ExpressErrorRequestHandler = UltimateExpressModule.ErrorRequestHandler;
export type ExpressRouter = UltimateExpressModule.Router;
export type ExpressHandler = UltimateExpressModule.Handler;

const normalizeConfig = (next?: ServerConfigInput): ResolvedServerConfig =>
  next ? setServerConfig(next) : resolveServerConfig();

/**
 * Start the defuss-express server.
 *
 * In the **primary** process this forks worker children, waits for at
 * least one to become ready, and opens a TCP load-balancer on the
 * configured public port.
 *
 * In a **worker** process this binds the Express-like app to its
 * assigned worker port and begins IPC heartbeat reporting.
 *
 * @param app        - An Express-compatible application instance.
 * @param nextConfig - Optional partial config (merged with defaults).
 * @returns Metadata about the started process.
 */
export const startServer = async (
  app: ExpressLike,
  nextConfig?: ServerConfigInput,
): Promise<StartServerResult> => {
  const config = normalizeConfig(nextConfig);
  return cluster.isPrimary
    ? startPrimaryRuntime(app, config)
    : startWorkerRuntime(app, config);
};

/**
 * Stop the defuss-express server gracefully.
 *
 * In the primary process this closes the listening socket, sends
 * `SIGTERM` to all workers, and waits for shutdown.  In a worker it
 * destroys active connections and closes the app server.
 */
export const stopServer = async (): Promise<void> =>
  cluster.isPrimary ? stopPrimaryRuntime(getServerConfig()) : stopWorkerRuntime(getServerConfig());

export {
  createResourceAwareLoadBalancer,
  defaultLoadBalancer,
  express,
  expressDefault,
  getServerConfig,
  leastConnectionsLoadBalancer,
  resourceAwareLoadBalancer,
  roundRobinLoadBalancer,
  setServerConfig,
};

export type {
  BackendCandidate,
  ExpressLike,
  LoadBalancerContext,
  LoadBalancerFunction,
  ParsedRequest,
  ResolvedServerConfig,
  ResourceAwareLoadBalancerWeights,
  ServerConfigInput,
  StartServerResult,
  WorkerRuntimeStats,
};

export default expressDefault;
