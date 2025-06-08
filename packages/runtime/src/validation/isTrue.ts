import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is strictly true.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is strictly true, the message if validation fails and message is provided, false otherwise.
 */
export const isTrue: ValidatorFn = (
  value: any,
  message?: string,
): boolean | string => {
  const isValid = value === true;
  return isValid ? true : message || false;
};
