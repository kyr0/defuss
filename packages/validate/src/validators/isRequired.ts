import type { ValidatorPrimitiveFn } from "../index.js";

export const isRequired: ValidatorPrimitiveFn = (value) => !!value;
