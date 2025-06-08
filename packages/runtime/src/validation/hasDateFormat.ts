import { asString } from "../transform/asString.js";
import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is a valid/parsable date format.
 * @param value - The value to check.
 * @returns True if the value is a valid date format, false otherwise.
 */
export const hasDateFormat: ValidatorFn = (value: any): boolean => {
  // Reject bigint and symbol types immediately
  if (typeof value === "bigint" || typeof value === "symbol") {
    return false;
  }

  // Handle numeric timestamps directly
  if (typeof value === "number") {
    try {
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  const str = asString(value);
  if (!str) {
    return false;
  }
  try {
    const date = new Date(str);
    return !Number.isNaN(date.getTime());
  } catch {
    return false;
  }
};
