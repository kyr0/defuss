import { isString } from "./isString.js";

export const isShorterThan = (
  value: any,
  maxLength: number,
  includeEqual = false,
): boolean => {
  if (!isString(value)) return false;
  return includeEqual ? value.length <= maxLength : value.length < maxLength;
};
