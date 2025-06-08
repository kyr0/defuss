import type { TransformerFn } from "./types.js";

/**
 * Converts a value to a string representation.
 * Handles various types including null, undefined, numbers, booleans, dates, regexes, arrays, and objects.
 *
 * @param value - The value to convert to a string.
 * @returns The string representation of the value.
 */
export const asString: TransformerFn = (value: any): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof RegExp) {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};
