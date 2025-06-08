import type { ValidatorFn } from "./types.js";

/**
 * Checks if the given value is an instance of a specified constructor function.
 * This function verifies that the value is an instance of the provided constructor
 * and that its constructor matches the specified constructor.
 *
 * @param value - The value to check.
 * @param someConstructorFunction - The constructor function to check against.
 * @returns True if the value is an instance of the constructor, false otherwise.
 * @throws TypeError if `someConstructorFunction` is not a function.
 */
export const isInstanceOf: ValidatorFn = <
  T extends new (
    ...args: any[]
  ) => any,
>(
  value: any,
  someConstructorFunction: T,
) => {
  if (typeof someConstructorFunction !== "function") {
    throw new TypeError("Expected a constructor function");
  }
  return (
    value instanceof someConstructorFunction &&
    value.constructor === someConstructorFunction
  );
};
