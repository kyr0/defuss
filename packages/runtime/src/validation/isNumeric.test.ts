import { isSafeNumeric } from "./index.js";

describe("isSafeNumeric", () => {
  it("returns true for a number string", () => {
    expect(isSafeNumeric("123")).toBe(true);
  });

  it("returns false for a non-numeric string", () => {
    expect(isSafeNumeric("abc")).toBe(false);
  });

  it("returns true for a finite number", () => {
    expect(isSafeNumeric(123)).toBe(true);
  });

  it("returns false for NaN", () => {
    expect(isSafeNumeric(Number.NaN)).toBe(false);
  });

  it("returns false for infinity", () => {
    expect(isSafeNumeric(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("returns false for negative infinity", () => {
    expect(isSafeNumeric(Number.NEGATIVE_INFINITY)).toBe(false);
  });
});
