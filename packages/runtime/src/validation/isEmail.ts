import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

//
/**
 * Checks if the given value is a valid email address.
 * Implements RFC 5322 official, @see https://emailregex.com/
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a valid email address, the message if validation fails and message is provided, false otherwise.
 */
export const isEmail: ValidatorPrimitiveFn = (value, message?: string) => {
  const stringResult = isString(value);
  const isStringValid = stringResult === true;
  const isValid =
    isStringValid &&
    /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\\x01\-\\x08\\x0b\\x0c\\x0e\-\\x1f\\x21\\x23\-\\x5b\\x5d\-\\x7f]|\\[\\x01-\\x09\\x0b\\x0c\\x0e\-\\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\\x01\-\\x08\\x0b\\x0c\\x0e\-\\x1f\\x21\-\\x5a\\x53\-\\x7f]|\\[\\x01\-\\x09\\x0b\\x0c\\x0e\-\\x7f])+)\])/.test(
      value as string,
    );
  return isValid ? true : message || false;
};
