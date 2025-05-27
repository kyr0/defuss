import { isShorterThan } from "./isShorterThan.js";

describe("isShorterThan", () => {
  it("returns true for strings shorter than the specified length", () => {
    expect(isShorterThan("hi", 3)).toBe(true);
    expect(isShorterThan("", 5)).toBe(true);
  });

  it("returns false for strings longer than or equal to the specified length", () => {
    expect(isShorterThan("hello", 5)).toBe(false);
    expect(isShorterThan("alphabet", 5)).toBe(false);
  });

  it("returns true when includeEqual is true and string length equals max length", () => {
    expect(isShorterThan("abc", 3, true)).toBe(true);
    expect(isShorterThan("hello", 5, true)).toBe(true);
  });

  it("returns false for non-string values", () => {
    expect(isShorterThan(123, 5)).toBe(false);
    expect(isShorterThan(null, 5)).toBe(false);
    expect(isShorterThan(undefined, 5)).toBe(false);
    expect(isShorterThan({}, 5)).toBe(false);
    expect(isShorterThan([], 5)).toBe(false);
  });
});
