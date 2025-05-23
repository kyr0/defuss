import { isAfterMinDate } from "./isAfterMinDate.js";

describe("isAfterMinDate", () => {
  it("should return false for a non-date value", () => {
    const value = undefined;
    const minDate = new Date(2000, 0, 1);
    const inclusive = true;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(false);
  });

  it("should return true for a date after the min date with inclusive = false", () => {
    const value = new Date(2000, 0, 2);
    const minDate = new Date(2000, 0, 1);
    const inclusive = false;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(true);
  });

  it("should return true for a date after the min date with inclusive = true", () => {
    const value = new Date(2000, 0, 2);
    const minDate = new Date(2000, 0, 1);
    const inclusive = true;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(true);
  });

  it("should return false for a date before the min date with inclusive = false", () => {
    const value = new Date(2000, 0, 1);
    const minDate = new Date(2000, 0, 2);
    const inclusive = false;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(false);
  });

  it("should return true for a date equal to the min date with inclusive = true", () => {
    const value = new Date(2000, 0, 1);
    const minDate = new Date(2000, 0, 1);
    const inclusive = true;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(true);
  });

  it("should return false for a date equal to the min date with inclusive = false", () => {
    const value = new Date(2000, 0, 1);
    const minDate = new Date(2000, 0, 1);
    const inclusive = false;
    expect(isAfterMinDate(value, minDate, inclusive)).toBe(false);
  });
});
