import { asNumber } from "./asNumber.js";
import { asString } from "./asString.js";

export const asInteger = (value: any): number => {
  const number = asNumber(value);
  if (typeof number === "number" && Number.isInteger(number)) {
    return number;
  }
  return asNumber(Number.parseInt(asString(number), 10).toFixed(0));
};
