import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

export const isUrl: ValidatorPrimitiveFn = (value) => {
  if (!isString(value)) return false;
  try {
    new URL(value as string);
    return true;
  } catch (_) {
    return false;
  }
};
