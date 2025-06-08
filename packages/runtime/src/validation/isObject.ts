import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the provided value is an object.
 * An object is defined as a non-null value that is of type 'object' and not an array.
 *
 * @param value - The value to check if it is an object.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is an object, the message if validation fails and message is provided, false otherwise.
 */
export const isObject: ValidatorPrimitiveFn = (
  value: any,
  message?: string,
) => {
  const isValid =
    value !== null && typeof value === "object" && !Array.isArray(value);
  return isValid ? true : message || false;
};
