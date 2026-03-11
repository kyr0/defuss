export interface RetryConfig {
  /** Whether to retry on failure */
  retry: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Delay in ms before the first retry */
  retryDelayMs: number;
  /** Exponential backoff multiplier applied after each attempt */
  retryExponentialBackoff: number;
}

export interface DomStabilityConfig {
  /** Interval in ms at which mutation counts are reported from the page (default: 500) */
  mutationReportIntervalMs: number;
  /** Interval in ms for internal stability checks (default: 200) */
  checkIntervalMs: number;
  /** Duration in ms with zero mutations before the DOM is considered stable (default: 1000) */
  quietPeriodMs: number;
  /** Maximum time in ms to wait for stability before giving up (default: 15000) */
  timeoutMs: number;
}

export interface SyntheticEventsConfig {
  /** Per-keystroke delay in ms for typing simulation (default: 50) */
  keystrokeDelayMs: number;
  /** Delay in ms between mouse events during a click (default: 50) */
  clickDelayMs: number;
}

export interface Config {
  /** The endpoint URL of the RPC server */
  serverEndpoint: string;
  /** The interval in ms for polling server work items */
  serverTaskPollingIntervalMs: number;
  /** Default retry behaviour for work item execution */
  retry: RetryConfig;
  /** DOM stability detection settings */
  domStability: DomStabilityConfig;
  /** Synthetic event simulation timings */
  syntheticEvents: SyntheticEventsConfig;
}

export default {
  serverEndpoint: "http://localhost:3210",
  serverTaskPollingIntervalMs: 100,
  retry: {
    retry: true,
    maxRetries: 3,
    retryDelayMs: 2_000,
    retryExponentialBackoff: 1.5,
  },
  domStability: {
    mutationReportIntervalMs: 500,
    checkIntervalMs: 200,
    quietPeriodMs: 800,
    timeoutMs: 15_000,
  },
  syntheticEvents: {
    keystrokeDelayMs: 25,
    clickDelayMs: 75,
  },
} as Config;
