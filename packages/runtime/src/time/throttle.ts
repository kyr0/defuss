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
