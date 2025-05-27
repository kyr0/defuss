import type { ValidatorPrimitiveFn } from "./types.js";

export const isDate: ValidatorPrimitiveFn = (value) =>
  value instanceof Date && !Number.isNaN(value.getDate());
