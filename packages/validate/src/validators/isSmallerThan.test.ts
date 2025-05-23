import { isLowerThan } from "./index.js";

describe("isSmallerThan", () => {
  it("should return true for numbers smaller than the max value", () => {
    expect(isLowerThan(1, 2, false)).toBe(true);
    expect(isLowerThan(-1, 2, false)).toBe(true);
    expect(isLowerThan(-2, -1, false)).toBe(true);
  });

  it("should return true for numbers equal to the max value with inclusive flag set to true", () => {
    expect(isLowerThan(2, 2, true)).toBe(true);
  });

  it("should return false for numbers equal to the max value with inclusive flag set to false", () => {
    expect(isLowerThan(2, 2, false)).toBe(false);
  });

  it("should return false for numbers greater than the max value", () => {
    expect(isLowerThan(2, 1, false)).toBe(false);
    expect(isLowerThan(2, -1, false)).toBe(false);
    expect(isLowerThan(-1, -2, false)).toBe(false);
  });

  it("should return false for non-numbers", () => {
    expect(isLowerThan("2", 1, false)).toBe(false);
    expect(isLowerThan({}, 1, false)).toBe(false);
    expect(isLowerThan([], 1, false)).toBe(false);
  });
});
