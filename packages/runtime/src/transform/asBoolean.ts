import type { TransformerFn } from "./types.js";

/**
 * Converts a value to a boolean representation.
 * Handles various types including strings, numbers, and existing booleans.
 *
 * @param value - The value to convert to a boolean.
 * @returns The boolean representation of the value.
 */
export const asBoolean: TransformerFn = (value: any): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lowerValue = value.toLowerCase();
    return (
      lowerValue === "true" ||
      lowerValue === "1" ||
      lowerValue === "yes" ||
      lowerValue === "on"
    );
  }
  if (typeof value === "number") return value !== 0;
  return Boolean(value);
};
