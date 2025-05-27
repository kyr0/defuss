import { isObject } from "./index.js";

describe("isObject", () => {
  test("returns true for objects", () => {
    expect(isObject({})).toBe(true);
    expect(isObject(new Object())).toBe(true);
  });

  test("returns false for null", () => {
    expect(isObject(null)).toBe(false);
  });

  test("returns false for arrays", () => {
    expect(isObject([])).toBe(false);
  });

  test("returns false for numbers", () => {
    expect(isObject(1)).toBe(false);
  });

  test("returns false for strings", () => {
    expect(isObject("")).toBe(false);
  });

  test("returns false for booleans", () => {
    expect(isObject(true)).toBe(false);
  });
});
