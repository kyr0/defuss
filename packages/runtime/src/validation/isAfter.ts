import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a date and is after a specified minimum date.
 * @param value - The date value to check.
 * @param minDate - The minimum date to compare against.
 * @param inclusive - If true, the value can be equal to the minDate.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a Date and is after the minDate, the message if validation fails and message is provided, false otherwise.
 */
export const isAfter: ValidatorFn = (
  value: Date | undefined,
  minDate: Date,
  inclusive = false,
  message?: string,
): boolean | string => {
  const isValid =
    value instanceof Date &&
    (inclusive
      ? value.getTime() >= minDate.getTime()
      : value.getTime() > minDate.getTime());
  return isValid ? true : message || false;
};
