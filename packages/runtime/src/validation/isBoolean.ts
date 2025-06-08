import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is a boolean.
 * @param value - The value to check.
 * @returns True if the value is a boolean, false otherwise.
 */
export const isBoolean: ValidatorPrimitiveFn = (value) =>
  typeof value === "boolean";
