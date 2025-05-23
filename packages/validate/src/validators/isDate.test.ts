import { isDate } from "./index.js";

describe("isDate", () => {
  it("should return true for a valid date", () => {
    expect(isDate(new Date())).toBe(true);
  });

  it("should return false for an invalid date", () => {
    expect(isDate(new Date("invalid"))).toBe(false);
  });

  it("should return false for a non-date object", () => {
    expect(isDate({})).toBe(false);
    expect(isDate([])).toBe(false);
    expect(isDate(1)).toBe(false);
    expect(isDate("date")).toBe(false);
    expect(isDate(null)).toBe(false);
    expect(isDate(undefined)).toBe(false);
  });
});
