import type { ValidatorPrimitiveFn } from "./types.js";

export const isArray: ValidatorPrimitiveFn = (value) => Array.isArray(value);
