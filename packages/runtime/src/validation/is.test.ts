import { is } from "./is.js";

describe("isEqual", () => {
  it("returns true for equal values", () => {
    expect(is(1, 1)).toBe(true);
    expect(is(true, true)).toBe(true);
    expect(is("hello", "hello")).toBe(true);
  });

  it("returns false for unequal values", () => {
    expect(is(1, 2)).toBe(false);
    expect(is(true, false)).toBe(false);
    expect(is("hello", "world")).toBe(false);
  });

  it("returns true for identical objects", () => {
    const obj = {};
    expect(is(obj, obj)).toBe(true);
  });

  it("returns false for different objects with the same properties", () => {
    expect(is({ a: 1 }, { a: 1 })).toBe(false);
  });
});
