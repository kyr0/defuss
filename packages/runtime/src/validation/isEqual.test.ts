import { isEqual } from "./isEqual.js";

describe("isEqual", () => {
  it("should return true for equal values", () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual("test", "test")).toBe(true);
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(isEqual([1, 2], [1, 2])).toBe(true);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(undefined, undefined)).toBe(true);
  });

  it("should return false for different values", () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual("test", "TEST")).toBe(false);
    expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(isEqual([1, 2], [2, 1])).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
  });
});
