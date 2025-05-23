import type { ValidatorPrimitiveFn } from "../index.js";
import { isNumber } from "./isNumber.js";

export const isNumeric: ValidatorPrimitiveFn = (value) =>
  isNumber(Number.parseFloat(value));
