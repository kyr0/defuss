import type { TransformerFn } from "./types.js";

/**
 * Converts a value to a Date object.
 * Handles various types including null, undefined, strings, numbers, and existing Date objects.
 *
 * @param value - The value to convert to a Date.
 * @returns The Date representation of the value, or an invalid Date if conversion fails.
 */
export const asDate: TransformerFn = (value: any): Date => {
  if (value === null || value === undefined) return new Date(Number.NaN);
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(Number.NaN) : date;
};
