import type { ValidatorPrimitiveFn } from "./types.js";

export const isBoolean: ValidatorPrimitiveFn = (value) =>
  typeof value === "boolean";
