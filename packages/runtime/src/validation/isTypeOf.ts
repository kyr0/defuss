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
 * @returns True if the value is of the specified type, false otherwise.
 */
export const isTypeOf: ValidatorFn = <T>(value: any, type: T): boolean => {
  if (type === "string") {
    return typeof value === "string";
  } else if (type === "number") {
    return typeof value === "number";
  } else if (type === "boolean") {
    return typeof value === "boolean";
  } else if (type === "object") {
    return typeof value === "object" && value !== null;
  } else if (type === "function") {
    return typeof value === "function";
  } else if (type === "undefined") {
    return typeof value === "undefined";
  }
  return false;
};
