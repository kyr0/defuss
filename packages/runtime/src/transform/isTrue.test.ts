import { isTrue } from "./isTrue.js";

describe("isTrue", () => {
  it("should return true for boolean true", () => {
    expect(isTrue(true)).toBe(true);
  });

  it("should return false for boolean false", () => {
    expect(isTrue(false)).toBe(false);
  });

  it("should return false for truthy values that are not strictly true", () => {
    expect(isTrue(1)).toBe(false);
    expect(isTrue("true")).toBe(false);
    expect(isTrue("yes")).toBe(false);
    expect(isTrue({})).toBe(false);
    expect(isTrue([])).toBe(false);
    expect(isTrue("1")).toBe(false);
  });

  it("should return false for falsy values", () => {
    expect(isTrue(false)).toBe(false);
    expect(isTrue(0)).toBe(false);
    expect(isTrue("")).toBe(false);
    expect(isTrue(null)).toBe(false);
    expect(isTrue(undefined)).toBe(false);
    expect(isTrue(Number.NaN)).toBe(false);
  });
});
