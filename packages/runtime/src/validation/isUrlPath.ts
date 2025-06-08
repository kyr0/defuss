import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid URL path.
 * A URL path consists of lowercase letters, numbers, hyphens, underscores, and slashes.
 * It does not allow spaces or special characters.
 *
 * @param value - The value to validate as a URL path.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a valid URL path, the message if validation fails and message is provided, false otherwise.
 */
export const isUrlPath: ValidatorPrimitiveFn = (value, message?: string) => {
  const stringCheck = isString(value);
  const isValid =
    stringCheck === true &&
    (value as string).length > 0 &&
    /^[a-z0-9\-_\/]+$/.test(value as string);
  return isValid ? true : message || false;
};
