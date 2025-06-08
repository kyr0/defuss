import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is empty.
 * An empty value is defined as:
 * - `null` or `undefined`
 * - an empty string
 * - an empty array
 * - an object with no own properties
 * - a Date object (not considered empty)
 *
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is empty, the message if validation fails and message is provided, false otherwise.
 */
export const isEmpty: ValidatorPrimitiveFn = (value, message?: string) => {
  let isValid = false;
  if (value === null || value === undefined) isValid = true;
  else if (typeof value === "string") isValid = value === "";
  else if (Array.isArray(value)) isValid = value.length === 0;
  else if (value instanceof Date) isValid = false;
  else if (typeof value === "object") isValid = Object.keys(value).length === 0;
  else isValid = false;

  return isValid ? true : message || false;
};
