import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is strictly false.
 */
export const isFalse: ValidatorFn = (value: any): boolean => {
  return value === false;
};
