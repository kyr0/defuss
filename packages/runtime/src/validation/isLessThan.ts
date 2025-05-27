import { isSafeNumber } from "./isSafeNumber.js";

export const isLessThan = (
  value: any,
  maxValue: number,
  includeEqual = false,
): boolean =>
  isSafeNumber(value) && (includeEqual ? value <= maxValue : value < maxValue);
