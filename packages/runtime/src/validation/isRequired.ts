import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if the provided value is required.
 * This function checks if the value is truthy, meaning it is not null, undefined, or an empty string.
 *
 * @param value - The value to check if it is required.
 * @returns True if the value is required (truthy), false otherwise.
 */
export const isRequired: ValidatorPrimitiveFn = (value) => !!value;
