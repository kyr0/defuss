import type { ValidatorPrimitiveFn } from "../types.js";
import { isNumber } from "./isNumber.js";

export const isNumeric: ValidatorPrimitiveFn = (value) =>
  isNumber(Number.parseFloat(value));
