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
