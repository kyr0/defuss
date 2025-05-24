import type { ValidatorPrimitiveFn } from "../types.js";

export const isObject: ValidatorPrimitiveFn = (value: any) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
