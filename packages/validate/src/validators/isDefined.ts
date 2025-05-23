import type { ValidatorPrimitiveFn } from "../index.js";

export const isDefined: ValidatorPrimitiveFn = (value) =>
  typeof value !== "undefined";
