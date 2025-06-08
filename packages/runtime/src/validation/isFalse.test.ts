import { isFalse } from "./isFalse.js";

describe("isFalse", () => {
  it("should return true for boolean false", () => {
    expect(isFalse(false)).toBe(true);
  });

  it("should return false for boolean true", () => {
    expect(isFalse(true)).toBe(false);
  });

  it("should return false for falsy values that are not strictly false", () => {
    expect(isFalse(0)).toBe(false);
    expect(isFalse("")).toBe(false);
    expect(isFalse(null)).toBe(false);
    expect(isFalse(undefined)).toBe(false);
    expect(isFalse(Number.NaN)).toBe(false);
  });

  it("should return false for truthy values", () => {
    expect(isFalse(true)).toBe(false);
    expect(isFalse(1)).toBe(false);
    expect(isFalse("false")).toBe(false);
    expect(isFalse("no")).toBe(false);
    expect(isFalse({})).toBe(false);
    expect(isFalse([])).toBe(false);
    expect(isFalse("0")).toBe(false);
  });
});
