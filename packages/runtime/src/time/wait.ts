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

    Promise.resolve().then(async () => {
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
    });
  });
}

export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1,
): Promise<T> {
  const start = Date.now();
  console.log(
    `🔍 waitForWithPolling() started - timeout: ${timeout}ms, interval: ${interval}ms`,
  );

  let timer: NodeJS.Timeout;

  const cleanup = () => {
    if (timer) {
      console.log("🛑 Cleaning up polling timer");
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
            console.log(
              `🔄 Poll #${pollCount} (${elapsed}ms elapsed) - result:`,
              result,
            );

            if (result != null) {
              console.log(
                `✅ waitForWithPolling() resolved after ${pollCount} polls (${elapsed}ms)`,
              );
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
  console.log(
    "🔍 waitForRef() called - ref.current:",
    (ref?.current as Node)?.nodeType,
  );
  console.log(`🔍 waitForRef() timeout: ${timeout}ms`);

  return waitForWithPolling(() => {
    console.log(
      "🔄 waitForRef() polling - ref.current:",
      (ref?.current as Node)?.nodeType,
    );
    return ref.current;
  }, timeout);
}
