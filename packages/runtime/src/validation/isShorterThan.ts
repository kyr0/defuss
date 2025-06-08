import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is shorter than a specified maximum length.
 * Optionally includes equality in the comparison.
 *
 * @param value - The value to check, expected to be a string.
 * @param maxLength - The maximum length to compare against.
 * @param includeEqual - If true, includes equality in the comparison (default is false).
 * @returns True if the value's length is shorter than (or equal to, if includeEqual is true) the maxLength, false otherwise.
 */
export const isShorterThan: ValidatorFn = (
  value: any,
  maxLength: number,
  includeEqual = false,
): boolean => {
  if (typeof value !== "string") return false;
  return includeEqual ? value.length <= maxLength : value.length < maxLength;
};
