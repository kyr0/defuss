import { equalsJSON } from "../datatype/index.js";
import type { ValidatorFn } from "./types.js";

/**
 * Compares two values for equality using a deep comparison.
 * This function checks if the two values are equal in terms of their JSON representation.
 *
 * @param value - The first value to compare.
 * @param valueB - The second value to compare.
 * @returns True if the values are equal, false otherwise.
 */
export const isEqual: ValidatorFn = (value: any, valueB: any): boolean =>
  equalsJSON(value, valueB);
