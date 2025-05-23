import { isString } from "./index.js";

describe("isString", () => {
  it("returns true for string values", () => {
    expect(isString("hello")).toBe(true);
  });

  it("returns false for non-string values", () => {
    expect(isString(1)).toBe(false);
    expect(isString(false)).toBe(false);
    expect(isString({})).toBe(false);
    expect(isString(null)).toBe(false);
    expect(isString(undefined)).toBe(false);
  });
});
