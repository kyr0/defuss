/**
 * Return a new array with unique values from the input array.
 * @param a - The array to dedupe
 * @returns Array of unique values
 */
export function unique<T>(a: readonly T[]): T[] {
  return Array.from(new Set(a));
}
