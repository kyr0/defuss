import { asString } from "../transform/asString.js";
import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a valid/parsable date format.
 * @param value - The value to check.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a valid date format, the message if validation fails and message is provided, false otherwise.
 */
export const hasDateFormat: ValidatorFn = (
  value: any,
  message?: string,
): boolean | string => {
  // Reject bigint and symbol types immediately
  if (typeof value === "bigint" || typeof value === "symbol") {
    return message || false;
  }

  // Handle numeric timestamps directly
  if (typeof value === "number") {
    try {
      const date = new Date(value);
      const isValid = !Number.isNaN(date.getTime());
      return isValid ? true : message || false;
    } catch {
      return message || false;
    }
  }

  const str = asString(value);
  if (!str) {
    return message || false;
  }
  try {
    const date = new Date(str);
    const isValid = !Number.isNaN(date.getTime());
    return isValid ? true : message || false;
  } catch {
    return message || false;
  }
};
