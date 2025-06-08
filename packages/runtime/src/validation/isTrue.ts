import type { ValidatorFn } from "./types.js";

/**
 * Transformer that checks if a value is strictly true.
 */
export const isTrue: ValidatorFn = (value: any): boolean => {
  return value === true;
};
