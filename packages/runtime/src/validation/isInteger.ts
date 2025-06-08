import type { ValidatorPrimitiveFn } from "./types.js";
import { isSafeNumber } from "./isSafeNumber.js";

/**
 * Checks if the given value is an integer.
 * An integer is a number without a fractional part.
 *
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is an integer, the message if validation fails and message is provided, false otherwise.
 */
export const isInteger: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = isSafeNumber(value) && Number.isInteger(value as number);
  return isValid ? true : message || false;
};
