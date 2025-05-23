import { isString } from "./isString.js";

export const hasPattern = (value: any, pattern: RegExp): boolean => {
  if (!isString(value)) return false;
  return pattern.test(value);
};
