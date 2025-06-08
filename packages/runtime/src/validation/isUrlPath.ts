import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid URL path.
 * A URL path consists of lowercase letters, numbers, hyphens, underscores, and slashes.
 * It does not allow spaces or special characters.
 *
 * @param value - The value to validate as a URL path.
 * @returns True if the value is a valid URL path, false otherwise.
 */
export const isUrlPath: ValidatorPrimitiveFn = (value) =>
  isString(value) &&
  (value as string).length > 0 &&
  /^[a-z0-9\-_\/]+$/.test(value as string);
