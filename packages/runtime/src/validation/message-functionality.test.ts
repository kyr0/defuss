import {
  isString,
  isSafeNumber,
  isBoolean,
  isRequired,
  isEmail,
  isOneOf,
  isGreaterThan,
  isLongerThan,
  isAfter,
  isEqual,
  isInstanceOf,
  isTypeOf,
  isNull,
} from "./index.js";

describe("Message functionality", () => {
  describe("ValidatorPrimitiveFn validators", () => {
    it("isString should return custom message on failure", () => {
      expect(isString(123, "Value must be a string")).toBe(
        "Value must be a string",
      );
      expect(isString("hello", "Value must be a string")).toBe(true);
      expect(isString(123)).toBe(false);
    });

    it("isBoolean should return custom message on failure", () => {
      expect(isBoolean("not a boolean", "Expected boolean value")).toBe(
        "Expected boolean value",
      );
      expect(isBoolean(true, "Expected boolean value")).toBe(true);
      expect(isBoolean("not a boolean")).toBe(false);
    });

    it("isRequired should return custom message on failure", () => {
      expect(isRequired(null, "This field is required")).toBe(
        "This field is required",
      );
      expect(isRequired(undefined, "This field is required")).toBe(
        "This field is required",
      );
      expect(isRequired("value", "This field is required")).toBe(true);
      expect(isRequired(null)).toBe(false);
    });

    it("isEmail should return custom message on failure", () => {
      expect(isEmail("invalid-email", "Please enter a valid email")).toBe(
        "Please enter a valid email",
      );
      expect(isEmail("test@example.com", "Please enter a valid email")).toBe(
        true,
      );
      expect(isEmail("invalid-email")).toBe(false);
    });

    it("isInstanceOf should return custom message on failure", () => {
      expect(isInstanceOf("not a date", Date, "Must be a Date instance")).toBe(
        "Must be a Date instance",
      );
      expect(isInstanceOf(new Date(), Date, "Must be a Date instance")).toBe(
        true,
      );
      expect(isInstanceOf("not a date", Date)).toBe(false);
    });

    it("isTypeOf should return custom message on failure", () => {
      expect(isTypeOf(123, "string", "Must be a string type")).toBe(
        "Must be a string type",
      );
      expect(isTypeOf("hello", "string", "Must be a string type")).toBe(true);
      expect(isTypeOf(123, "string")).toBe(false);
    });

    it("isNull should return custom message on failure", () => {
      expect(isNull("not null", "Value must be null")).toBe(
        "Value must be null",
      );
      expect(isNull(null, "Value must be null")).toBe(true);
      expect(isNull("not null")).toBe(false);
    });
  });

  describe("ValidatorFn validators", () => {
    it("isOneOf should return custom message on failure", () => {
      expect(isOneOf(4, [1, 2, 3], "Value must be 1, 2, or 3")).toBe(
        "Value must be 1, 2, or 3",
      );
      expect(isOneOf(2, [1, 2, 3], "Value must be 1, 2, or 3")).toBe(true);
      expect(isOneOf(4, [1, 2, 3])).toBe(false);
    });

    it("isGreaterThan should return custom message on failure", () => {
      expect(isGreaterThan(5, 10, false, "Value must be greater than 10")).toBe(
        "Value must be greater than 10",
      );
      expect(
        isGreaterThan(15, 10, false, "Value must be greater than 10"),
      ).toBe(true);
      expect(isGreaterThan(5, 10)).toBe(false);
    });

    it("isLongerThan should return custom message on failure", () => {
      expect(
        isLongerThan(
          "abc",
          5,
          false,
          "String must be longer than 5 characters",
        ),
      ).toBe("String must be longer than 5 characters");
      expect(
        isLongerThan(
          "abcdefg",
          5,
          false,
          "String must be longer than 5 characters",
        ),
      ).toBe(true);
      expect(isLongerThan("abc", 5)).toBe(false);
    });

    it("isAfter should return custom message on failure", () => {
      const baseDate = new Date("2023-01-01");
      expect(
        isAfter(
          new Date("2022-12-31"),
          baseDate,
          false,
          "Date must be after 2023-01-01",
        ),
      ).toBe("Date must be after 2023-01-01");
      expect(
        isAfter(
          new Date("2023-01-02"),
          baseDate,
          false,
          "Date must be after 2023-01-01",
        ),
      ).toBe(true);
      expect(isAfter(new Date("2022-12-31"), baseDate)).toBe(false);
    });

    it("isEqual should return custom message on failure", () => {
      expect(isEqual("actual", "expected", "Value must equal 'expected'")).toBe(
        "Value must equal 'expected'",
      );
      expect(
        isEqual("expected", "expected", "Value must equal 'expected'"),
      ).toBe(true);
      expect(isEqual("actual", "expected")).toBe(false);
    });
  });

  describe("Backwards compatibility", () => {
    it("should work without message parameter", () => {
      expect(isString(123)).toBe(false);
      expect(isString("hello")).toBe(true);

      expect(isOneOf(4, [1, 2, 3])).toBe(false);
      expect(isOneOf(2, [1, 2, 3])).toBe(true);
    });
  });
});
