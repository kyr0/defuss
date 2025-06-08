import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is one of the specified options.
 * This function checks if the value is included in the provided array of options.
 *
 * @param value - The value to check.
 * @param options - An array of strings or numbers to check against.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is one of the options, the message if validation fails and message is provided, false otherwise.
 */
export const isOneOf: ValidatorFn = (
  value: any,
  options: Array<string | number>,
  message?: string,
): boolean | string => {
  const isValid = options.includes(value);
  return isValid ? true : message || false;
};
