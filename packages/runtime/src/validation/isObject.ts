import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the provided value is an object.
 * An object is defined as a non-null value that is of type 'object' and not an array.
 *
 * @param value - The value to check if it is an object.
 * @returns True if the value is an object, false otherwise.
 */
export const isObject: ValidatorPrimitiveFn = (value: any) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
