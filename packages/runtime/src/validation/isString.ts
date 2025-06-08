import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Validates if the provided value is a string.
 * This function checks if the value is of type string.
 *
 * @param value - The value to validate as a string.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a string, the message if validation fails and message is provided, false otherwise.
 */
export const isString: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = typeof value === "string";
  return isValid ? true : message || false;
};
