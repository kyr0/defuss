import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is shorter than a specified maximum length.
 * Optionally includes equality in the comparison.
 *
 * @param value - The value to check, expected to be a string.
 * @param maxLength - The maximum length to compare against.
 * @param includeEqual - If true, includes equality in the comparison (default is false).
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value's length is shorter than (or equal to, if includeEqual is true) the maxLength, the message if validation fails and message is provided, false otherwise.
 */
export const isShorterThan: ValidatorFn = (
  value: any,
  maxLength: number,
  includeEqual = false,
  message?: string,
): boolean | string => {
  if (typeof value !== "string") return message || false;
  const isValid = includeEqual
    ? value.length <= maxLength
    : value.length < maxLength;
  return isValid ? true : message || false;
};
