import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is equal to another value.
 * @param value - The first value to compare.
 * @param valueB - The second value to compare.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the values are equal, the message if validation fails and message is provided, false otherwise.
 */
export const is: ValidatorFn = (
  value: any,
  valueB: any,
  message?: string,
): boolean | string => {
  const isValid = value === valueB;
  return isValid ? true : message || false;
};
