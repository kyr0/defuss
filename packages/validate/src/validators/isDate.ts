import type { ValidatorPrimitiveFn } from "../index.js";

export const isDate: ValidatorPrimitiveFn = (value) =>
  value instanceof Date && !Number.isNaN(value.getDate());
