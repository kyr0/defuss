import { validators } from "./validators.js";

describe("Supported validators", () => {
  it("should export all validator functions", () => {
    expect(validators).toEqual(
      expect.objectContaining({
        isAfter: validators.isAfter,
        isArray: validators.isArray,
        isBefore: validators.isBefore,
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
        isSafeNumber: validators.isSafeNumber,
        isSafeNumeric: validators.isSafeNumeric,
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
