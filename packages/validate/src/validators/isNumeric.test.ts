import { isNumeric } from "./index.js";

describe("isNumeric", () => {
  it("returns true for a number string", () => {
    expect(isNumeric("123")).toBe(true);
  });

  it("returns false for a non-numeric string", () => {
    expect(isNumeric("abc")).toBe(false);
  });

  it("returns true for a finite number", () => {
    expect(isNumeric(123)).toBe(true);
  });

  it("returns false for NaN", () => {
    expect(isNumeric(Number.NaN)).toBe(false);
  });

  it("returns false for infinity", () => {
    expect(isNumeric(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("returns false for negative infinity", () => {
    expect(isNumeric(Number.NEGATIVE_INFINITY)).toBe(false);
  });
});
