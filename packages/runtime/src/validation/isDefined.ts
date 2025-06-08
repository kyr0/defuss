import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is defined (not `undefined`).
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is defined, the message if validation fails and message is provided, false otherwise.
 */
export const isDefined: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = typeof value !== "undefined";
  return isValid ? true : message || false;
};
