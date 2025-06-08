import { isTruthy } from "./isTruthy.js";

describe("isTruthy", () => {
  it("should return true for truthy values", () => {
    expect(isTruthy(true)).toBe(true);
    expect(isTruthy(1)).toBe(true);
    expect(isTruthy(-1)).toBe(true);
    expect(isTruthy("true")).toBe(true);
    expect(isTruthy("false")).toBe(true);
    expect(isTruthy("0")).toBe(true);
    expect(isTruthy("hello")).toBe(true);
    expect(isTruthy({})).toBe(true);
    expect(isTruthy([])).toBe(true);
    expect(isTruthy(() => {})).toBe(true);
  });

  it("should return false for falsy values", () => {
    expect(isTruthy(false)).toBe(false);
    expect(isTruthy(0)).toBe(false);
    expect(isTruthy("")).toBe(false);
    expect(isTruthy(null)).toBe(false);
    expect(isTruthy(undefined)).toBe(false);
    expect(isTruthy(Number.NaN)).toBe(false);
  });
});
