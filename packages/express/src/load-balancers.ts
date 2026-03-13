import type {
  BackendCandidate,
  LoadBalancerContext,
  LoadBalancerFunction,
} from "./types.js";

const withFallback = (candidates: BackendCandidate[]): BackendCandidate => {
  const first = candidates[0];
  if (!first) {
    throw new Error("defuss-express: no healthy backend candidates are available");
  }
  return first;
};

/**
 * Cycle through candidates sequentially.  `previousIndex` is
 * incremented per connection so each worker gets an equal share.
 */
export const roundRobinLoadBalancer: LoadBalancerFunction = ({
  candidates,
  previousIndex,
}) => {
  const index = candidates.length === 0 ? 0 : previousIndex % candidates.length;
  return withFallback(candidates.slice(index).concat(candidates.slice(0, index)));
};

/**
 * Pick the candidate with the fewest active proxy connections.
 * Useful under heterogeneous request durations.
 */
export const leastConnectionsLoadBalancer: LoadBalancerFunction = ({
  candidates,
}) => {
  const sorted = [...candidates].sort(
    (left, right) => left.activeProxyConnections - right.activeProxyConnections,
  );
  return withFallback(sorted);
};

/**
 * Scoring weights for {@link createResourceAwareLoadBalancer}.
 * All values are non-negative multipliers applied to the corresponding metric.
 */
export type ResourceAwareLoadBalancerWeights = {
  /** Multiplier for active proxy connection count (default `10`). */
  connectionWeight?: number;
  /** Multiplier for CPU usage percentage 0–100+ (default `2`). */
  cpuWeight?: number;
  /** Multiplier for heap utilisation ratio 0–1 (default `100`). */
  heapWeight?: number;
};

const scoreResourceAware = (
  candidate: BackendCandidate,
  weights: Required<ResourceAwareLoadBalancerWeights>,
): number => {
  const stats = candidate.stats;
  const cpu = stats?.cpuPercent ?? 0;
  const heapRatio =
    stats && stats.heapTotalBytes > 0 ? stats.heapUsedBytes / stats.heapTotalBytes : 0;

  return (
    candidate.activeProxyConnections * weights.connectionWeight +
    cpu * weights.cpuWeight +
    heapRatio * weights.heapWeight
  );
};

/**
 * Create a composite scoring load balancer with configurable metric weights.
 *
 * The candidate with the **lowest** score wins.  Formula:
 *
 * ```
 * score = connections × connectionWeight
 *       + cpuPercent × cpuWeight
 *       + (heapUsed / heapTotal) × heapWeight
 * ```
 *
 * Default weights (`10 / 2 / 100`) bias toward spreading connections first,
 * then avoiding CPU-hot workers, then avoiding memory pressure.
 *
 * @example
 * ```ts
 * // CPU-first variant — strongly prefer idle workers
 * const balancer = createResourceAwareLoadBalancer({ cpuWeight: 50 });
 * await startServer(app, { loadBalancer: balancer });
 * ```
 */
export const createResourceAwareLoadBalancer = ({
  connectionWeight = 10,
  cpuWeight = 2,
  heapWeight = 100,
}: ResourceAwareLoadBalancerWeights = {}): LoadBalancerFunction => {
  const weights: Required<ResourceAwareLoadBalancerWeights> = {
    connectionWeight,
    cpuWeight,
    heapWeight,
  };
  return ({ candidates }) => {
    const sorted = [...candidates].sort(
      (left, right) => scoreResourceAware(left, weights) - scoreResourceAware(right, weights),
    );
    return withFallback(sorted);
  };
};

/**
 * Composite scoring balancer that accounts for active connections,
 * CPU pressure, and heap utilisation.  Formula:
 *
 * ```
 * score = connections × 10 + cpuPercent × 2 + (heapUsed / heapTotal) × 100
 * ```
 *
 * The candidate with the **lowest** score wins.
 *
 * To customise the scoring weights use {@link createResourceAwareLoadBalancer}.
 */
export const resourceAwareLoadBalancer: LoadBalancerFunction = createResourceAwareLoadBalancer();

/** Default balancer — currently {@link roundRobinLoadBalancer}. */
export const defaultLoadBalancer = roundRobinLoadBalancer;

/**
 * Select a backend using the provided (or default) load-balancer
 * function.  Normalises sync and async balancer return values.
 */
export const pickBackend = async (
  context: LoadBalancerContext,
  loadBalancer?: LoadBalancerFunction,
): Promise<BackendCandidate> => {
  const chooser = loadBalancer ?? defaultLoadBalancer;
  return chooser(context);
};
