import type { ValidatorPrimitiveFn } from "./types.js";
import { isString } from "./isString.js";

/**
 * Validates if the provided value is a valid phone number.
 * The phone number must be a string that matches the E.164 format.
 *
 * @param value - The value to validate as a phone number.
 * @returns True if the value is a valid phone number, false otherwise.
 */
export const isPhoneNumber: ValidatorPrimitiveFn = (value) =>
  isString(value) &&
  /\+(9[976]\d|8[987530]\d|6[987]\d|5[90]\d|42\d|3[875]\d|2[98654321]\d|9[8543210]|8[6421]|6[6543210]|5[87654321]|4[987654310]|3[9643210]|2[70]|7|1)\d{1,14}$/.test(
    value as string,
  );
