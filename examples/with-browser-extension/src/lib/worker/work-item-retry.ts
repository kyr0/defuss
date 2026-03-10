import type { WorkItemOptions, WorkItemResult } from "../../types";

/** Resolved retry configuration with defaults applied */
export interface RetryConfig {
  retry: boolean;
  maxRetries: number;
  retryDelayMs: number;
  retryExponentialBackoff: number;
}

/** Browser-automation-friendly defaults */
const DEFAULTS: RetryConfig = {
  retry: true,
  maxRetries: 3,
  retryDelayMs: 2_000,
  retryExponentialBackoff: 1.5,
};

/** Merge caller-supplied options with defaults */
export function resolveRetryConfig(options?: WorkItemOptions): RetryConfig {
  return {
    retry: options?.retry ?? DEFAULTS.retry,
    maxRetries: options?.maxRetries ?? DEFAULTS.maxRetries,
    retryDelayMs: options?.retryDelayMs ?? DEFAULTS.retryDelayMs,
    retryExponentialBackoff:
      options?.retryExponentialBackoff ?? DEFAULTS.retryExponentialBackoff,
  };
}

/**
 * Execute `fn` with retry logic derived from `WorkItemOptions`.
 *
 * Returns the first successful result, or the last failed result
 * after all retry attempts are exhausted.
 */
export async function withRetry<R>(
  fn: () => Promise<WorkItemResult<R>>,
  options?: WorkItemOptions,
): Promise<WorkItemResult<R>> {
  const cfg = resolveRetryConfig(options);

  let lastResult: WorkItemResult<R> | undefined;
  const totalAttempts = cfg.retry ? 1 + cfg.maxRetries : 1;
  let delay = cfg.retryDelayMs;

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    lastResult = await fn();

    if (lastResult.success) return lastResult;

    // Don't wait after the final attempt
    if (attempt < totalAttempts) {
      console.warn(
        `[retry] attempt ${attempt}/${totalAttempts} failed, retrying in ${delay}ms…`,
      );
      await sleep(delay);
      delay = Math.round(delay * cfg.retryExponentialBackoff);
    }
  }

  console.warn(
    `[retry] all ${totalAttempts} attempt(s) exhausted – returning last error`,
  );
  return lastResult!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
