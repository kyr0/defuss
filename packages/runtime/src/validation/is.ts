import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is equal to another value.
 * @param value - The first value to compare.
 * @param valueB - The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export const is: ValidatorFn = (value: any, valueB: any): boolean =>
  value === valueB;
