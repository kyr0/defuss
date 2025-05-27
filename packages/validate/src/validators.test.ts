import { validators } from "./validators.js";

describe("Supported validators", () => {
  it("should export all validator functions", () => {
    expect(validators).toEqual(
      expect.objectContaining({
        isAfterMinDate: validators.isAfterMinDate,
        isArray: validators.isArray,
        isBeforeMaxDate: validators.isBeforeMaxDate,
        isDate: validators.isDate,
        isDefined: validators.isDefined,
        isEmail: validators.isEmail,
        isEmpty: validators.isEmpty,
        is: validators.is,
        isEqual: validators.isEqual,
        isGreaterThan: validators.isGreaterThan,
        isInteger: validators.isInteger,
        isLongerThan: validators.isLongerThan,
        isLessThan: validators.isLessThan,
        isNumberSafe: validators.isNumberSafe,
        isNumericAndSafe: validators.isNumericAndSafe,
        isObject: validators.isObject,
        isOneOf: validators.isOneOf,
        isPhoneNumber: validators.isPhoneNumber,
        isRequired: validators.isRequired,
        isShorterThan: validators.isShorterThan,
        isSlug: validators.isSlug,
        isString: validators.isString,
        isUrl: validators.isUrl,
        isUrlPath: validators.isUrlPath,
        hasPattern: validators.hasPattern,
      }),
    );
  });
});
