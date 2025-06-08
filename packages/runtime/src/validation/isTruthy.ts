import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is truthy.
 * Returns true for all truthy values (non-zero numbers, non-empty strings, objects, etc.)
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is truthy, the message if validation fails and message is provided, false otherwise.
 */
export const isTruthy: ValidatorFn = (
  value: any,
  message?: string,
): boolean | string => {
  const isValid = !!value;
  return isValid ? true : message || false;
};
