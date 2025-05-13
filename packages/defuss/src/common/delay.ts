/**
 * Debounce a function: delays invoking `fn` until after `wait` ms have elapsed
 * since the last time the debounced function was called.
 * @param fn - The function to debounce
 * @param wait - Milliseconds to wait
 * @returns Debounced function
 */
export function debounce<F extends (...args: any[]) => any>(
  fn: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Throttle a function: ensures that `fn` is called at most once every `wait` ms.
 * @param fn - The function to throttle
 * @param wait - Milliseconds to wait
 * @returns Throttled function
 */
export function throttle<F extends (...args: any[]) => any>(
  fn: F,
  wait: number,
): (...args: Parameters<F>) => void {
  let lastTime = 0;
  return function (this: ThisParameterType<F>, ...args: Parameters<F>): void {
    const now = Date.now();
    if (now - lastTime >= wait) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * Wait for a specified amount of time.
 * @param ms - Milliseconds to wait
 * @returns A promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
