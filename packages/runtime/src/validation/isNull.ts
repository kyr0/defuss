import type { ValidatorFn } from "./types.js";

/**
 * Checks if the provided value is null.
 * @param value any - The value to check if it is null.
 * @returns boolean - Returns true if the value is null, false otherwise.
 */
export const isNull: ValidatorFn = (value: any): boolean => {
  return value === null;
};
