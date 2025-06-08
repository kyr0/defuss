import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if a value is a safe number (not NaN and finite).
 * @param value - The value to check
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is a safe number, the message if validation fails and message is provided, false otherwise
 */
export const isSafeNumber: ValidatorPrimitiveFn = (value, message?: string) => {
  const isValid =
    typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
  return isValid ? true : message || false;
};
