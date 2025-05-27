import type { ValidatorPrimitiveFn } from "./types.js";
import { isSafeNumber } from "./isSafeNumber.js";

/**
 * Checks if a value (number or string) is a numeric and a safe number.
 * @param value - The value to check
 * @returns True if the value is numeric, false otherwise
 */
export const isSafeNumeric: ValidatorPrimitiveFn = (value) => {
  if (typeof value === "number") return isSafeNumber(value);
  if (typeof value === "string") {
    // Return false for empty or whitespace-only strings
    if (value.trim() === "") return false;
    // Use Number() instead of parseFloat to ensure entire string is numeric
    const num = Number(value);
    return isSafeNumber(num);
  }
  return false;
};
