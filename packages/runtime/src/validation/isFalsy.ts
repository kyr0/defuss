import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is falsy.
 * Returns true for all falsy values (false, 0, "", null, undefined, NaN)
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is falsy, the message if validation fails and message is provided, false otherwise.
 */
export const isFalsy: ValidatorFn = (
  value: any,
  message?: string,
): boolean | string => {
  const isValid = !value;
  return isValid ? true : message || false;
};
