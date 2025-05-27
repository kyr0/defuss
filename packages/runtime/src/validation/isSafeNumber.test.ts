import { isSafeNumber } from "./isSafeNumber.js";

describe("isSafeNumber", () => {
  it("returns true for safe numbers", () => {
    expect(isSafeNumber(0)).toBe(true);
    expect(isSafeNumber(1)).toBe(true);
    expect(isSafeNumber(-1)).toBe(true);
    expect(isSafeNumber(3.14)).toBe(true);
    expect(isSafeNumber(-3.14)).toBe(true);
    expect(isSafeNumber(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isSafeNumber(Number.MIN_SAFE_INTEGER)).toBe(true);
  });

  it("returns false for NaN", () => {
    expect(isSafeNumber(Number.NaN)).toBe(false);
    expect(isSafeNumber(0 / 0)).toBe(false);
  });

  it("returns false for infinite numbers", () => {
    expect(isSafeNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isSafeNumber(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isSafeNumber(1 / 0)).toBe(false);
    expect(isSafeNumber(-1 / 0)).toBe(false);
  });

  it("returns false for non-number values", () => {
    expect(isSafeNumber("123")).toBe(false);
    expect(isSafeNumber("not a number")).toBe(false);
    expect(isSafeNumber(true)).toBe(false);
    expect(isSafeNumber(false)).toBe(false);
    expect(isSafeNumber(null)).toBe(false);
    expect(isSafeNumber(undefined)).toBe(false);
    expect(isSafeNumber({})).toBe(false);
    expect(isSafeNumber([])).toBe(false);
  });
});
