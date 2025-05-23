import { isBeforeMaxDate } from "./index.js";

describe("isBeforeMaxDate", () => {
  it("should return true for a date before the max date with inclusive = false", () => {
    const value = new Date("2000-01-01");
    const maxDate = new Date("2020-01-01");
    const inclusive = false;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(true);
  });

  it("should return true for a date before the max date with inclusive = true", () => {
    const value = new Date("2000-01-01");
    const maxDate = new Date("2020-01-01");
    const inclusive = true;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(true);
  });

  it("should return false for a date after the max date with inclusive = false", () => {
    const value = new Date("2020-01-01");
    const maxDate = new Date("2000-01-01");
    const inclusive = false;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(false);
  });

  it("should return false for a date after the max date with inclusive = true", () => {
    const value = new Date("2020-01-01");
    const maxDate = new Date("2000-01-01");
    const inclusive = true;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(false);
  });

  it("should return false for a date equal to the max date with inclusive = false", () => {
    const value = new Date("2020-01-01");
    const maxDate = new Date("2020-01-01");
    const inclusive = false;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(false);
  });

  it("should return true for a date equal to the max date with inclusive = true", () => {
    const value = new Date("2020-01-01");
    const maxDate = new Date("2020-01-01");
    const inclusive = true;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(true);
  });

  it("should return false for an undefined date", () => {
    const value = undefined;
    const maxDate = new Date("2020-01-01");
    const inclusive = false;

    expect(isBeforeMaxDate(value, maxDate, inclusive)).toBe(false);
  });
});
