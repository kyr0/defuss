import type { ValidatorPrimitiveFn } from "./types.js";

/**
 * Checks if a value is a safe number (not NaN and finite).
 * @param value - The value to check
 * @returns True if the value is a safe number, false otherwise
 */
export const isSafeNumber: ValidatorPrimitiveFn = (value) =>
  typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
