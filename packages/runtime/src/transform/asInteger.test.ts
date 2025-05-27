import { asInteger } from "./asInteger.js";

describe("asInteger", () => {
  it("should be defined", () => {
    expect(asInteger).toBeDefined();
  });

  it("should return integers unchanged", () => {
    expect(asInteger(42)).toBe(42);
    expect(asInteger(0)).toBe(0);
    expect(asInteger(-1)).toBe(-1);
    expect(asInteger(100)).toBe(100);
  });

  it("should convert floating point numbers to integers", () => {
    expect(asInteger(3.14)).toBe(3);
    expect(asInteger(3.9)).toBe(3);
    expect(asInteger(-3.14)).toBe(-3);
    expect(asInteger(-3.9)).toBe(-3);
    expect(asInteger(0.5)).toBe(0);
    expect(asInteger(-0.5)).toBe(0);
  });

  it("should handle string numbers", () => {
    expect(asInteger("42")).toBe(42);
    expect(asInteger("3.14")).toBe(3);
    expect(asInteger("-5")).toBe(-5);
    expect(asInteger("0")).toBe(0);
    expect(asInteger("123.456")).toBe(123);
  });

  it("should handle invalid strings", () => {
    expect(asInteger("hello")).toBe(0);
    expect(asInteger("")).toBe(0);
    expect(asInteger("abc123")).toBe(0);
    expect(asInteger("123abc")).toBe(123);
  });

  it("should handle null and undefined", () => {
    expect(asInteger(null)).toBe(0);
    expect(asInteger(undefined)).toBe(0);
  });

  it("should handle booleans", () => {
    expect(asInteger(true)).toBe(0); // asNumber(true) returns 0
    expect(asInteger(false)).toBe(0); // asNumber(false) returns 0
  });

  it("should handle Date objects", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    const timestamp = date.getTime();
    expect(asInteger(date)).toBe(Math.floor(timestamp));
  });

  it("should handle arrays", () => {
    expect(asInteger([1, 2, 3])).toBe(0); // arrays become "1, 2, 3" string, which converts to 0
    expect(asInteger([])).toBe(0);
  });

  it("should handle objects", () => {
    expect(asInteger({})).toBe(0);
    expect(asInteger({ value: 42 })).toBe(0);
  });

  it("should handle edge cases", () => {
    expect(asInteger(Number.NaN)).toBe(0);
    expect(asInteger(Number.POSITIVE_INFINITY)).toBe(0);
    expect(asInteger(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it("should handle very large numbers", () => {
    expect(asInteger(1e10)).toBe(10000000000);
    expect(asInteger(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
});
