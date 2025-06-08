import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is a Date object.
 * @param value - The value to check.
 * @returns True if the value is a Date object, false otherwise.
 */
export const isDate: ValidatorPrimitiveFn = (value) =>
  value instanceof Date && !Number.isNaN(value.getDate());
