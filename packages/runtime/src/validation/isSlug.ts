import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid slug.
 * A slug is a string that consists of lowercase letters, numbers, and hyphens.
 * It does not allow spaces or special characters.
 *
 * @param value - The value to validate as a slug.
 * @returns True if the value is a valid slug, false otherwise.
 */
export const isSlug: ValidatorPrimitiveFn = (value) =>
  isString(value) && /^[a-z0-9-]+$/.test(value as string);
