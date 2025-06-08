import { isFalsy } from "./isFalsy.js";

describe("isFalsy", () => {
  it("should return true for falsy values", () => {
    expect(isFalsy(false)).toBe(true);
    expect(isFalsy(0)).toBe(true);
    expect(isFalsy("")).toBe(true);
    expect(isFalsy(null)).toBe(true);
    expect(isFalsy(undefined)).toBe(true);
    expect(isFalsy(Number.NaN)).toBe(true);
  });

  it("should return false for truthy values", () => {
    expect(isFalsy(true)).toBe(false);
    expect(isFalsy(1)).toBe(false);
    expect(isFalsy(-1)).toBe(false);
    expect(isFalsy("true")).toBe(false);
    expect(isFalsy("false")).toBe(false);
    expect(isFalsy("0")).toBe(false);
    expect(isFalsy("hello")).toBe(false);
    expect(isFalsy({})).toBe(false);
    expect(isFalsy([])).toBe(false);
    expect(isFalsy(() => {})).toBe(false);
  });
});
