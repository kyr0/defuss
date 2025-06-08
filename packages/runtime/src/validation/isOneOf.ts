import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is one of the specified options.
 * This function checks if the value is included in the provided array of options.
 *
 * @param value - The value to check.
 * @param options - An array of strings or numbers to check against.
 * @returns True if the value is one of the options, false otherwise.
 */
export const isOneOf: ValidatorFn = (
  value: any,
  options: Array<string | number>,
): boolean => options.includes(value);
