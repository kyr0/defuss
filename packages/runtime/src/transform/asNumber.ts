import type { TransformerFn } from "./types.js";

/**
 * Converts a value to a number representation.
 * Handles various types including strings, dates, and numbers.
 *
 * @param value - The value to convert to a number.
 * @returns The numeric representation of the value, or 0 if conversion fails.
 */
export const asNumber: TransformerFn = (value: any): number => {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (value instanceof Date) {
    return value.getTime();
  }
  return 0;
};
