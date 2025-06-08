import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is an array.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is an array, the message if validation fails and message is provided, false otherwise.
 */
export const isArray: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = Array.isArray(value);
  return isValid ? true : message || false;
};
