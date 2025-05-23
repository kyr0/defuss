import { isNumber } from "./isNumber.js";

export const isGreaterThan = (
  value: any,
  minValue: number,
  includeEqual: boolean,
): boolean =>
  isNumber(value) && (value > minValue || (includeEqual && value >= minValue));
