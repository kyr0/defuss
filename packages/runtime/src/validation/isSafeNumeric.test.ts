import { isSafeNumeric } from "./isSafeNumeric.js";

describe("isSafeNumeric", () => {
  it("returns true for safe numbers", () => {
    expect(isSafeNumeric(0)).toBe(true);
    expect(isSafeNumeric(1)).toBe(true);
    expect(isSafeNumeric(-1)).toBe(true);
    expect(isSafeNumeric(3.14)).toBe(true);
    expect(isSafeNumeric(-3.14)).toBe(true);
    expect(isSafeNumeric(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isSafeNumeric(Number.MIN_SAFE_INTEGER)).toBe(true);
  });

  it("returns true for numeric strings that are safe numbers", () => {
    expect(isSafeNumeric("0")).toBe(true);
    expect(isSafeNumeric("1")).toBe(true);
    expect(isSafeNumeric("-1")).toBe(true);
    expect(isSafeNumeric("3.14")).toBe(true);
    expect(isSafeNumeric("-3.14")).toBe(true);
    expect(isSafeNumeric("123.456")).toBe(true);
  });

  it("returns false for unsafe numbers", () => {
    expect(isSafeNumeric(Number.NaN)).toBe(false);
    expect(isSafeNumeric(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isSafeNumeric(Number.NEGATIVE_INFINITY)).toBe(false);
  });

  it("returns false for strings that result in unsafe numbers", () => {
    expect(isSafeNumeric("NaN")).toBe(false);
    expect(isSafeNumeric("Infinity")).toBe(false);
    expect(isSafeNumeric("-Infinity")).toBe(false);
  });

  it("returns false for non-numeric strings", () => {
    expect(isSafeNumeric("not a number")).toBe(false);
    expect(isSafeNumeric("abc")).toBe(false);
    expect(isSafeNumeric("123abc")).toBe(false);
    expect(isSafeNumeric("")).toBe(false);
    expect(isSafeNumeric("   ")).toBe(false);
  });

  it("returns false for non-number and non-string values", () => {
    expect(isSafeNumeric(true)).toBe(false);
    expect(isSafeNumeric(false)).toBe(false);
    expect(isSafeNumeric(null)).toBe(false);
    expect(isSafeNumeric(undefined)).toBe(false);
    expect(isSafeNumeric({})).toBe(false);
    expect(isSafeNumeric([])).toBe(false);
  });
});
