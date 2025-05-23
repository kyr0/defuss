import type { ValidatorPrimitiveFn } from "../index.js";
import { isObject } from "./isObject.js";
import { isString } from "./isString.js";

export const isEmpty: ValidatorPrimitiveFn = (value) => {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value) || isObject(value))
    return Object.keys(value).length === 0;
  if (value instanceof Date || isString(value)) return value === "";
  return false;
};
