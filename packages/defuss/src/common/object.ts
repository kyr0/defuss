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

/**
 * Check deep equality of two values via JSON serialization.
 * Non-serializable values (functions, undefined) are omitted.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if the serialized values are identical, false otherwise
 */
export function equals<T>(a: T, b: T): boolean {
  try {
    const normalizedA = JSON.parse(JSON.stringify(a));
    const normalizedB = JSON.parse(JSON.stringify(b));
    return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
  } catch {
    return false;
  }
}
