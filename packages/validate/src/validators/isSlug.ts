import type { ValidatorPrimitiveFn } from "../index.js";

// checks for a valid part of a URL path
export const isSlug: ValidatorPrimitiveFn = (value: string) =>
  /^[a-z0-9-]+$/.test(value);
