import { isSafeNumber } from "./isSafeNumber.js";
import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is less than a specified maximum value.
 * Optionally includes equality in the comparison.
 *
 * @param value - The value to check.
 * @param maxValue - The maximum value to compare against.
 * @param includeEqual - Whether to include equality in the comparison (default: false).
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is less than (or equal to, if `includeEqual` is true) the maximum value, the message if validation fails and message is provided, false otherwise.
 */
export const isLessThan: ValidatorFn = (
  value: any,
  maxValue: number,
  includeEqual = false,
  message?: string,
): boolean | string => {
  const safeNumberResult = isSafeNumber(value);
  const isSafeNum = safeNumberResult === true;
  const isValid =
    isSafeNum && (includeEqual ? value <= maxValue : value < maxValue);
  return isValid ? true : message || false;
};
