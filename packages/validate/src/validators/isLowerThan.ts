import { isNumber } from "./isNumber.js";

export const isLowerThan = (
  value: any,
  maxValue: number,
  includeEqual: boolean,
): boolean =>
  isNumber(value) && (value < maxValue || (includeEqual && value === maxValue));
