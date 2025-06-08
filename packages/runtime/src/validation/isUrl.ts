import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid URL.
 * The URL must be a string that can be parsed by the URL constructor.
 *
 * @param value - The value to validate as a URL.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a valid URL, the message if validation fails and message is provided, false otherwise.
 */
export const isUrl: ValidatorPrimitiveFn = (value, message?: string) => {
  const stringResult = isString(value);
  if (stringResult !== true) return message || false;

  try {
    new URL(value as string);
    return true;
  } catch (_) {
    return message || false;
  }
};
