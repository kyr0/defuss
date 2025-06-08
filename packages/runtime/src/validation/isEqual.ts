import { equalsJSON } from "../datatype/index.js";
import type { ValidatorFn } from "./types.js";

/**
 * Compares two values for equality using a deep comparison.
 * This function checks if the two values are equal in terms of their JSON representation.
 *
 * @param value - The first value to compare.
 * @param valueB - The second value to compare.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the values are equal, the message if validation fails and message is provided, false otherwise.
 */
export const isEqual: ValidatorFn = (
  value: any,
  valueB: any,
  message?: string,
): boolean | string => {
  const isValid = equalsJSON(value, valueB);
  return isValid ? true : message || false;
};
