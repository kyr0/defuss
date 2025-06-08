import type { ValidatorFn } from "./types.js";

/**
 * Checks if the provided value is of a specific type.
 * This function checks if the value matches the specified type, which can be one of:
 * - "string"
 * - "number"
 * - "boolean"
 * - "object"
 * - "function"
 * - "undefined"
 *
 * @param value - The value to check its type.
 * @param type - The type to check against.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is of the specified type, the message if validation fails and message is provided, false otherwise.
 */
export const isTypeOf: ValidatorFn = <T>(
  value: any,
  type: T,
  message?: string,
): boolean | string => {
  let isValid = false;
  if (type === "string") {
    isValid = typeof value === "string";
  } else if (type === "number") {
    isValid = typeof value === "number";
  } else if (type === "boolean") {
    isValid = typeof value === "boolean";
  } else if (type === "object") {
    isValid = typeof value === "object" && value !== null;
  } else if (type === "function") {
    isValid = typeof value === "function";
  } else if (type === "undefined") {
    isValid = typeof value === "undefined";
  }
  return isValid ? true : message || false;
};
