import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is strictly false.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is strictly false, the message if validation fails and message is provided, false otherwise.
 */
export const isFalse: ValidatorFn = (
  value: any,
  message?: string,
): boolean | string => {
  const isValid = value === false;
  return isValid ? true : message || false;
};
