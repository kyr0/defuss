import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid URL.
 * The URL must be a string that can be parsed by the URL constructor.
 *
 * @param value - The value to validate as a URL.
 * @returns True if the value is a valid URL, false otherwise.
 */
export const isUrl: ValidatorPrimitiveFn = (value) => {
  if (!isString(value)) return false;
  try {
    new URL(value as string);
    return true;
  } catch (_) {
    return false;
  }
};
