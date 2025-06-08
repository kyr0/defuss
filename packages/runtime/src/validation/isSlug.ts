import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid slug.
 * A slug is a string that consists of lowercase letters, numbers, and hyphens.
 * It does not allow spaces or special characters.
 *
 * @param value - The value to validate as a slug.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a valid slug, the message if validation fails and message is provided, false otherwise.
 */
export const isSlug: ValidatorPrimitiveFn = (value, message?: string) => {
  const stringResult = isString(value);
  const isStringValid = stringResult === true;
  const isValid = isStringValid && /^[a-z0-9-]+$/.test(value as string);
  return isValid ? true : message || false;
};
