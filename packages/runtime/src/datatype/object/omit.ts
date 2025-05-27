/**
 * Omit specific keys from an object.
 * @param o - The source object
 * @param keys - Array of keys to omit
 * @returns New object without the omitted keys
 */
export function omit<T extends object, K extends keyof T>(
  o: T,
  keys: readonly K[],
): Omit<T, K> {
  const result = {} as Omit<T, K>;
  const keysToOmit = new Set(keys);

  // Iterate through object keys
  for (const key in o) {
    // Only include if it's an own property and not in the keys to omit
    if (
      Object.prototype.hasOwnProperty.call(o, key) &&
      !keysToOmit.has(key as unknown as K)
    ) {
      // Use a simpler type assertion approach
      (result as any)[key] = o[key as keyof T];
    }
  }
  return result;
}
