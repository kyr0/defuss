import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a date and is before a specified maximum date.
 * @param value - The date value to check.
 * @param maxDate - The maximum date to compare against.
 * @param inclusive - If true, the value can be equal to the maxDate.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a Date and is before the maxDate, the message if validation fails and message is provided, false otherwise.
 */
export const isBefore: ValidatorFn = (
  value: Date | undefined,
  maxDate: Date,
  inclusive = false,
  message?: string,
): boolean | string => {
  const isValid =
    value instanceof Date &&
    (inclusive
      ? value.getTime() <= maxDate.getTime()
      : value.getTime() < maxDate.getTime());
  return isValid ? true : message || false;
};
