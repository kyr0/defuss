import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a string and its length is longer than a specified minimum length.
 * Optionally, it can include equality in the comparison.
 *
 * @param value - The value to check.
 * @param minLength - The minimum length to compare against.
 * @param includeEqual - Whether to include equality in the comparison (default: false).
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a string and its length is longer than the specified minimum length,
 *          the message if validation fails and message is provided, false otherwise.
 */
export const isLongerThan: ValidatorFn = (
  value: any,
  minLength: number,
  includeEqual = false,
  message?: string,
): boolean | string => {
  if (typeof value !== "string") return message || false;
  const isValid = includeEqual
    ? value.length >= minLength
    : value.length > minLength;
  return isValid ? true : message || false;
};
