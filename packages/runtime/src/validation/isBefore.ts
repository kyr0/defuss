import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a date and is before a specified maximum date.
 * @param value - The date value to check.
 * @param maxDate - The maximum date to compare against.
 * @param inclusive - If true, the value can be equal to the maxDate.
 * @returns True if the value is a Date and is before the maxDate, false otherwise.
 */
export const isBefore: ValidatorFn = (
  value: Date | undefined,
  maxDate: Date,
  inclusive = false,
): value is Date =>
  value instanceof Date &&
  (inclusive
    ? value.getTime() <= maxDate.getTime()
    : value.getTime() < maxDate.getTime());
