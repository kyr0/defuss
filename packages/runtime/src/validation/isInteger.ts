import type { ValidatorPrimitiveFn } from "./types.js";
import { isSafeNumber } from "./isSafeNumber.js";

/**
 * Checks if the given value is an integer.
 * An integer is a number without a fractional part.
 *
 * @param value - The value to check.
 * @returns True if the value is an integer, false otherwise.
 */
export const isInteger: ValidatorPrimitiveFn = (value) =>
  isSafeNumber(value) && Number.isInteger(value as number);
