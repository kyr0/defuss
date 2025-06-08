import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is defined (not `undefined`).
 * @param value - The value to check.
 * @returns True if the value is defined, false otherwise.
 */
export const isDefined: ValidatorPrimitiveFn = (value) =>
  typeof value !== "undefined";
