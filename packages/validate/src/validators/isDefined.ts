import type { ValidatorPrimitiveFn } from "../types.js";

export const isDefined: ValidatorPrimitiveFn = (value) =>
  typeof value !== "undefined";
