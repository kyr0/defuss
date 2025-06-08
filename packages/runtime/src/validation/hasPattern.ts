import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value matches a specified pattern.
 * @param value - The value to check.
 * @param pattern - The regular expression pattern to match against.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value matches the pattern, the message if validation fails and message is provided, false otherwise.
 */
export const hasPattern: ValidatorFn = (
  value: any,
  pattern: RegExp,
  message?: string,
): boolean | string => {
  if (typeof value !== "string") return message || false;
  const isValid = pattern.test(value);
  return isValid ? true : message || false;
};
