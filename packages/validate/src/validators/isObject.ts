import type { ValidatorPrimitiveFn } from "../index.js";

export const isObject: ValidatorPrimitiveFn = (value: any) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
