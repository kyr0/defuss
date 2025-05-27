import { hasPattern } from "./hasPattern.js";

describe("hasPattern", () => {
  it("returns true for strings matching the pattern", () => {
    expect(
      hasPattern(
        "test@example.com",
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      ),
    ).toBe(true);
    expect(hasPattern("12345", /^\d{5}$/)).toBe(true);
    expect(hasPattern("abc123", /^[a-z]+\d+$/)).toBe(true);
  });

  it("returns false for strings not matching the pattern", () => {
    expect(
      hasPattern(
        "test@example",
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
      ),
    ).toBe(false);
    expect(hasPattern("1234", /^\d{5}$/)).toBe(false);
    expect(hasPattern("123abc", /^[a-z]+\d+$/)).toBe(false);
  });

  it("returns false for non-string values", () => {
    expect(hasPattern(123, /^\d+$/)).toBe(false);
    expect(hasPattern(null, /^\d+$/)).toBe(false);
    expect(hasPattern(undefined, /^\d+$/)).toBe(false);
    expect(hasPattern({}, /^\d+$/)).toBe(false);
    expect(hasPattern([], /^\d+$/)).toBe(false);
  });
});
