import { isSafeNumber } from "./isSafeNumber.js";
import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is greater than a specified minimum value.
 * Optionally includes equality in the comparison.
 *
 * @param value - The value to check.
 * @param minValue - The minimum value to compare against.
 * @param includeEqual - Whether to include equality in the comparison (default: false).
 * @returns True if the value is greater than (or equal to, if `includeEqual` is true) the minimum value, false otherwise.
 */
export const isGreaterThan: ValidatorFn = (
  value: any,
  minValue: number,
  includeEqual = false,
): boolean =>
  isSafeNumber(value) && (includeEqual ? value >= minValue : value > minValue);
