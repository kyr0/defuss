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
    let completed = false;

    const timeoutId = setTimeout(() => {
      if (!completed) {
        completed = true;
        timeoutCallback?.(timeoutMs);
        reject(new Error(`Timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    // Execute operation immediately (not deferred to microtask queue)
    // This is critical for event handlers to be attached synchronously
    (async () => {
      try {
        const result = await operation();
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          resolve(result);
        }
      } catch (error) {
        if (!completed) {
          completed = true;
          clearTimeout(timeoutId);
          reject(error);
        }
      }
    })();
  });
}

export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1,
): Promise<T> {
  const start = Date.now();
  let timer: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (timer) {
      clearInterval(timer);
    }
  };

  try {
    return await createTimeoutPromise(timeout, () => {
      return new Promise<T>((resolve, reject) => {
        let pollCount = 0;

        timer = setInterval(() => {
          pollCount++;
          const elapsed = Date.now() - start;

          try {
            const result = check();
            if (result != null) {
              cleanup();
              resolve(result);
            }
          } catch (err) {
            console.log(
              `❌ waitForWithPolling() error on poll #${pollCount}:`,
              err,
            );
            cleanup();
            reject(err);
          }
        }, interval);
      });
    });
  } catch (error) {
    cleanup(); // Ensure cleanup happens on timeout
    throw error;
  }
}

export async function waitForRef<T>(
  ref: { current: T | null },
  timeout: number,
): Promise<T> {
  return waitForWithPolling(() => {
    // Check if ref has been marked as orphaned
    if ((ref as any).orphan) {
      console.log("⚠️ waitForRef() - ref is marked as orphaned, failing fast");
      //throw new Error("Ref has been orphaned from component unmount");
    }
    return ref.current;
  }, timeout);
}
