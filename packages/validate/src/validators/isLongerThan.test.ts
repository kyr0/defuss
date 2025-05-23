import { isLongerThan } from "./isLongerThan.js";

describe("isLongerThan", () => {
  it("returns true for strings longer than the specified length", () => {
    expect(isLongerThan("hello", 3)).toBe(true);
    expect(isLongerThan("hello world", 5)).toBe(true);
  });

  it("returns false for strings shorter than or equal to the specified length", () => {
    expect(isLongerThan("hi", 2)).toBe(false);
    expect(isLongerThan("abc", 3)).toBe(false);
    expect(isLongerThan("", 0)).toBe(false);
  });

  it("returns true when includeEqual is true and string length equals min length", () => {
    expect(isLongerThan("abc", 3, true)).toBe(true);
    expect(isLongerThan("", 0, true)).toBe(true);
  });

  it("returns false for non-string values", () => {
    expect(isLongerThan(123, 2)).toBe(false);
    expect(isLongerThan(null, 0)).toBe(false);
    expect(isLongerThan(undefined, 0)).toBe(false);
    expect(isLongerThan({}, 0)).toBe(false);
    expect(isLongerThan([], 0)).toBe(false);
  });
});
