import { isNumber } from "./index.js";

describe("isNumber", () => {
  it("should return true for a valid number", () => {
    expect(isNumber(1)).toBe(true);
    expect(isNumber(0)).toBe(true);
    expect(isNumber(0.1)).toBe(true);
  });

  it("should return false for invalid numbers", () => {
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it("should return false for non-number values", () => {
    expect(isNumber("1")).toBe(false);
    expect(isNumber([1])).toBe(false);
    expect(isNumber({})).toBe(false);
    expect(isNumber(undefined)).toBe(false);
    expect(isNumber(null)).toBe(false);
  });
});
