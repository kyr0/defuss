import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is an array.
 * @param value - The value to check.
 * @returns True if the value is an array, false otherwise.
 */
export const isArray: ValidatorPrimitiveFn = (value) => Array.isArray(value);
