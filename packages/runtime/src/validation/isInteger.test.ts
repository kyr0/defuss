import { isInteger } from "./isInteger.js";

describe("isInteger", () => {
  it("checks for integer", () => {
    expect(isInteger(null)).toBe(false);
    expect(isInteger(undefined)).toBe(false);
    expect(isInteger(42)).toBe(true);
    expect(isInteger(0)).toBe(true);
    expect(isInteger(-5)).toBe(true);
    expect(isInteger(3.14)).toBe(false);
    expect(isInteger("42")).toBe(false);
    expect(isInteger(Number.NaN)).toBe(false);
    expect(isInteger(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
