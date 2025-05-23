import { isEqual } from "./index.js";

describe("isEqual", () => {
  it("returns true for equal values", () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual(true, true)).toBe(true);
    expect(isEqual("hello", "hello")).toBe(true);
  });

  it("returns false for unequal values", () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual(true, false)).toBe(false);
    expect(isEqual("hello", "world")).toBe(false);
  });

  it("returns true for identical objects", () => {
    const obj = {};
    expect(isEqual(obj, obj)).toBe(true);
  });

  it("returns false for different objects with the same properties", () => {
    expect(isEqual({ a: 1 }, { a: 1 })).toBe(false);
  });
});
