import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

export const isUrlPath: ValidatorPrimitiveFn = (value) =>
  isString(value) &&
  (value as string).length > 0 &&
  /^[a-z0-9\-_\/]+$/.test(value as string);
