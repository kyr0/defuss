/**
 * Check deep equality of two values via JSON serialization.
 * Non-serializable values (functions, undefined) are omitted.
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns True if the serialized values are identical, false otherwise
 */
export function equalsJSON<T>(a: T, b: T): boolean {
  if (typeof a === "undefined" && typeof b === "undefined") {
    return true;
  }
  try {
    const normalizedA = JSON.parse(JSON.stringify(a));
    const normalizedB = JSON.parse(JSON.stringify(b));
    return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
  } catch {
    return false;
  }
}
