/**
 * Wait for a specified amount of time.
 * @param ms - Milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createTimeoutPromise<T>(
  timeoutMs: number,
  operation: () => Promise<T> | T,
  timeoutCallback?: (ms: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      timeoutCallback?.(timeoutMs);
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve().then(async () => {
      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  });
}

export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1,
): Promise<T> {
  const start = Date.now();

  return createTimeoutPromise(timeout, () => {
    return new Promise<T>((resolve, reject) => {
      const timer = setInterval(() => {
        try {
          const result = check();
          if (result != null) {
            clearInterval(timer);
            resolve(result);
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval);
    });
  });
}

export async function waitForRef<T>(
  ref: { current: T | null },
  timeout: number,
): Promise<T> {
  return waitForWithPolling(() => ref.current, timeout);
}
