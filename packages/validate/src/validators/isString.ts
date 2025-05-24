import type { ValidatorPrimitiveFn } from "../types.js";

export const isString: ValidatorPrimitiveFn = (value) =>
  typeof value === "string";
