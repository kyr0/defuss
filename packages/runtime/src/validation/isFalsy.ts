import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is falsy.
 * Returns true for all falsy values (false, 0, "", null, undefined, NaN)
 */
export const isFalsy: ValidatorFn = (value: any): boolean => {
  return !value;
};
