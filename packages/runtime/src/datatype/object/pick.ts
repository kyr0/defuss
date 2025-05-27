/**
 * Pick specific keys from an object.
 * @param o - The source object
 * @param keys - Array of keys to pick
 * @returns New object with only the picked keys
 */
export function pick<T extends object, K extends keyof T>(
  o: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in o) {
      result[key] = o[key];
    }
  }
  return result;
}
