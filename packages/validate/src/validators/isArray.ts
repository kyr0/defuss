import type { ValidatorPrimitiveFn } from "../index.js";

export const isArray: ValidatorPrimitiveFn = (value) => Array.isArray(value);
