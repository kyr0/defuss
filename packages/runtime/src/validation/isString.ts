import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Validates if the provided value is a string.
 * This function checks if the value is of type string.
 *
 * @param value - The value to validate as a string.
 * @returns True if the value is a string, false otherwise.
 */
export const isString: ValidatorPrimitiveFn = (value) =>
  typeof value === "string";
