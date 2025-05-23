import { isString } from "./isString.js";

export const isLongerThan = (
  value: any,
  minLength: number,
  includeEqual = false,
): boolean => {
  if (!isString(value)) return false;
  return includeEqual ? value.length >= minLength : value.length > minLength;
};
