import { isSafeNumber } from "./isSafeNumber.js";

export const isGreaterThan = (
  value: any,
  minValue: number,
  includeEqual = false,
): boolean =>
  isSafeNumber(value) && (includeEqual ? value >= minValue : value > minValue);
