import type { ValidatorPrimitiveFn } from "../types.js";

export const isNumber: ValidatorPrimitiveFn = (value) =>
  typeof value === "number" && !Number.isNaN(value) && Number.isFinite(value);
