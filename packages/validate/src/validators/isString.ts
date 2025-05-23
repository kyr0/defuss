import type { ValidatorPrimitiveFn } from "../index.js";

export const isString: ValidatorPrimitiveFn = (value) =>
  typeof value === "string";
