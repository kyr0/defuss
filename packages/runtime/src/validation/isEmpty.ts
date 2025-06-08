import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the given value is empty.
 * An empty value is defined as:
 * - `null` or `undefined`
 * - an empty string
 * - an empty array
 * - an object with no own properties
 * - a Date object (not considered empty)
 *
 * @param value - The value to check.
 * @returns True if the value is empty, false otherwise.
 */
export const isEmpty: ValidatorPrimitiveFn = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value === "";
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Date) return false;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
};
