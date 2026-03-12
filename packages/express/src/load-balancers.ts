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

const scoreResourceAware = (candidate: BackendCandidate): number => {
  const stats = candidate.stats;
  const cpu = stats?.cpuPercent ?? 0;
  const heapRatio =
    stats && stats.heapTotalBytes > 0 ? stats.heapUsedBytes / stats.heapTotalBytes : 0;

  return candidate.activeProxyConnections * 10 + cpu * 2 + heapRatio * 100;
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
 */
export const resourceAwareLoadBalancer: LoadBalancerFunction = ({
  candidates,
}) => {
  const sorted = [...candidates].sort(
    (left, right) => scoreResourceAware(left) - scoreResourceAware(right),
  );
  return withFallback(sorted);
};

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
