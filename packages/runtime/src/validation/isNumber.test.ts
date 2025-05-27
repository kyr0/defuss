import { isSafeNumber } from "./index.js";

describe("isNumber", () => {
  it("should return true for a valid number", () => {
    expect(isSafeNumber(1)).toBe(true);
    expect(isSafeNumber(0)).toBe(true);
    expect(isSafeNumber(0.1)).toBe(true);
  });

  it("should return false for invalid numbers", () => {
    expect(isSafeNumber(Number.NaN)).toBe(false);
    expect(isSafeNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isSafeNumber(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it("should return false for non-number values", () => {
    expect(isSafeNumber("1")).toBe(false);
    expect(isSafeNumber([1])).toBe(false);
    expect(isSafeNumber({})).toBe(false);
    expect(isSafeNumber(undefined)).toBe(false);
    expect(isSafeNumber(null)).toBe(false);
  });
});
