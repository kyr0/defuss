import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

// checks for a valid part of a URL path
export const isSlug: ValidatorPrimitiveFn = (value) =>
  isString(value) && /^[a-z0-9-]+$/.test(value as string);
