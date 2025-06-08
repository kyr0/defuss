import type { ValidatorPrimitiveFn } from "./types.js";
import { isSafeNumber } from "./isSafeNumber.js";

/**
 * Checks if a value (number or string) is a numeric and a safe number.
 * @param value - The value to check
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is numeric, the message if validation fails and message is provided, false otherwise
 */
export const isSafeNumeric: ValidatorPrimitiveFn = (
  value,
  message?: string,
) => {
  let isValid = false;
  if (typeof value === "number") {
    const result = isSafeNumber(value);
    isValid = result === true;
  } else if (typeof value === "string") {
    // Return false for empty or whitespace-only strings
    if (value.trim() === "") {
      isValid = false;
    } else {
      // Use Number() instead of parseFloat to ensure entire string is numeric
      const num = Number(value);
      const result = isSafeNumber(num);
      isValid = result === true;
    }
  } else {
    isValid = false;
  }
  return isValid ? true : message || false;
};
