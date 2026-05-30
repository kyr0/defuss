import type { WorkItemOptions, WorkItemResult } from "../../types";
import config, { type RetryConfig } from "../../../config";

export type { RetryConfig };

/** Merge caller-supplied options with defaults from config */
export function resolveRetryConfig(options?: WorkItemOptions): RetryConfig {
  const defaults = config.retry;
  return {
    retry: options?.retry ?? defaults.retry,
    maxRetries: options?.maxRetries ?? defaults.maxRetries,
    retryDelayMs: options?.retryDelayMs ?? defaults.retryDelayMs,
    retryExponentialBackoff:
      options?.retryExponentialBackoff ?? defaults.retryExponentialBackoff,
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
