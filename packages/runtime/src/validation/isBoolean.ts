import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is a boolean.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a boolean, the message if validation fails and message is provided, false otherwise.
 */
export const isBoolean: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = typeof value === "boolean";
  return isValid ? true : message || false;
};
