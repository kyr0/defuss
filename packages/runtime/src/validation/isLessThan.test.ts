import { isLessThan } from "./isLessThan.js";

describe("isLessThan", () => {
  it("returns true when value is lower than maxValue", () => {
    expect(isLessThan(5, 10)).toBe(true);
    expect(isLessThan(-5, 0)).toBe(true);
    expect(isLessThan(0, 1)).toBe(true);
    expect(isLessThan(3.14, 4)).toBe(true);
  });

  it("returns false when value is equal to maxValue (default behavior)", () => {
    expect(isLessThan(10, 10)).toBe(false);
    expect(isLessThan(0, 0)).toBe(false);
    expect(isLessThan(-5, -5)).toBe(false);
  });

  it("returns true when value is equal to maxValue with includeEqual=true", () => {
    expect(isLessThan(10, 10, true)).toBe(true);
    expect(isLessThan(0, 0, true)).toBe(true);
    expect(isLessThan(-5, -5, true)).toBe(true);
  });

  it("returns false when value is greater than maxValue", () => {
    expect(isLessThan(15, 10)).toBe(false);
    expect(isLessThan(1, 0)).toBe(false);
    expect(isLessThan(0, -1)).toBe(false);
    expect(isLessThan(4, 3.14)).toBe(false);
  });

  it("returns false when value is greater than maxValue even with includeEqual=true", () => {
    expect(isLessThan(15, 10, true)).toBe(false);
    expect(isLessThan(1, 0, true)).toBe(false);
    expect(isLessThan(0, -1, true)).toBe(false);
  });

  it("returns false for non-safe number values", () => {
    expect(isLessThan(Number.NaN, 10)).toBe(false);
    expect(isLessThan(Number.POSITIVE_INFINITY, 10)).toBe(false);
    expect(isLessThan(Number.NEGATIVE_INFINITY, 10)).toBe(false);
    expect(isLessThan("5", 10)).toBe(false);
    expect(isLessThan(null, 10)).toBe(false);
    expect(isLessThan(undefined, 10)).toBe(false);
    expect(isLessThan({}, 10)).toBe(false);
    expect(isLessThan([], 10)).toBe(false);
  });

  it("works with decimal numbers", () => {
    expect(isLessThan(3.1, 3.14)).toBe(true);
    expect(isLessThan(3.14, 3.1)).toBe(false);
    expect(isLessThan(3.14, 3.14)).toBe(false);
    expect(isLessThan(3.14, 3.14, true)).toBe(true);
  });
});
