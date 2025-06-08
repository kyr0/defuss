import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the provided value is required.
 * This function checks if the value is truthy, meaning it is not null, undefined, or an empty string.
 *
 * @param value - The value to check if it is required.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is required (truthy), the message if validation fails and message is provided, false otherwise.
 */
export const isRequired: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = !!value;
  return isValid ? true : message || false;
};
