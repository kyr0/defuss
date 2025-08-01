import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is a Date object.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a Date object, the message if validation fails and message is provided, false otherwise.
 */
export const isDate: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid = value instanceof Date && !Number.isNaN(value.getDate());
  return isValid ? true : message || false;
};
