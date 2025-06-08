import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the provided value is null.
 * @param value any - The value to check if it is null.
 * @param message - Optional error message to return when validation fails.
 * @returns boolean | string - Returns true if the value is null, the message if validation fails and message is provided, false otherwise.
 */
export const isNull: ValidatorPrimitiveFn = (value: any, message?: string) => {
  const isValid = value === null;
  return isValid ? true : message || false;
};
