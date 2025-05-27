import type { ValidatorPrimitiveFn } from "./types.js";
import { isSafeNumber } from "./isSafeNumber.js";

export const isInteger: ValidatorPrimitiveFn = (value) =>
  isSafeNumber(value) && Number.isInteger(value as number);
