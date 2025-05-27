import { isArray } from "./index.js";

describe("isArray", () => {
  test("should return true for an array", () => {
    expect(isArray([1, 2, 3])).toBe(true);
  });

  test("should return false for a non-array", () => {
    expect(isArray(1)).toBe(false);
    expect(isArray("string")).toBe(false);
    expect(isArray({})).toBe(false);
  });
});
