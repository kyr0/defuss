import { asNumber } from "./asNumber.js";
import { asString } from "./asString.js";
import type { TransformerFn } from "./types.js";

/**
 * Converts a value to an integer representation.
 * Handles various types including strings, numbers, and objects.
 *
 * @param value - The value to convert to an integer.
 * @returns The integer representation of the value, or 0 if conversion fails.
 */
export const asInteger: TransformerFn = (value: any): number => {
  const number = asNumber(value);
  if (typeof number === "number" && Number.isInteger(number)) {
    return number;
  }
  return asNumber(Number.parseInt(asString(number), 10).toFixed(0));
};
