import type { ValidatorPrimitiveFn } from "./types.js";

export const isRequired: ValidatorPrimitiveFn = (value) => !!value;
