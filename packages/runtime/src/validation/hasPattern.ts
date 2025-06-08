import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value matches a specified pattern.
 * @param value - The value to check.
 * @param pattern - The regular expression pattern to match against.
 * @returns True if the value matches the pattern, false otherwise.
 */
export const hasPattern: ValidatorFn = (
  value: any,
  pattern: RegExp,
): boolean => {
  if (typeof value !== "string") return false;
  return pattern.test(value);
};
