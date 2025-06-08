import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is an instance of a specified constructor function.
 * This function verifies that the value is an instance of the provided constructor
 * and that its constructor matches the specified constructor.
 *
 * @param value - The value to check.
 * @param someConstructorFunction - The constructor function to check against.
 * @param message - Optional error message to return when validation fails.
 * @returns True if the value is an instance of the constructor, the message if validation fails and message is provided, false otherwise.
 * @throws TypeError if `someConstructorFunction` is not a function.
 */
export const isInstanceOf: ValidatorFn = <
  T extends new (
    ...args: any[]
  ) => any,
>(
  value: any,
  someConstructorFunction: T,
  message?: string,
) => {
  if (typeof someConstructorFunction !== "function") {
    throw new TypeError("Expected a constructor function");
  }
  const isValid =
    value instanceof someConstructorFunction &&
    value.constructor === someConstructorFunction;
  return isValid ? true : message || false;
};
