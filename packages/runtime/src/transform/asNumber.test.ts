import { asNumber } from "./asNumber.js";

describe("asNumber", () => {
  it("should be defined", () => {
    expect(asNumber).toBeDefined();
  });

  it("should return the same number for number input", () => {
    expect(asNumber(42)).toBe(42);
    expect(asNumber(0)).toBe(0);
    expect(asNumber(-1)).toBe(-1);
    expect(asNumber(3.14)).toBe(3.14);
    expect(asNumber(Number.NaN)).toBeNaN();
    expect(asNumber(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(asNumber(Number.NEGATIVE_INFINITY)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("should parse valid numeric strings", () => {
    expect(asNumber("42")).toBe(42);
    expect(asNumber("0")).toBe(0);
    expect(asNumber("-1")).toBe(-1);
    expect(asNumber("3.14")).toBe(3.14);
    expect(asNumber("123.456")).toBe(123.456);
    expect(asNumber("0.5")).toBe(0.5);
    expect(asNumber("-0.5")).toBe(-0.5);
  });

  it("should return 0 for invalid numeric strings", () => {
    expect(asNumber("hello")).toBe(0);
    expect(asNumber("")).toBe(0);
    expect(asNumber(" ")).toBe(0);
    expect(asNumber("abc123")).toBe(0);
    expect(asNumber("123abc")).toBe(123); // parseFloat stops at first non-numeric character
    expect(asNumber("NaN")).toBe(0);
  });

  it("should convert Date objects to timestamp", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    expect(asNumber(date)).toBe(date.getTime());

    const invalidDate = new Date("invalid");
    expect(asNumber(invalidDate)).toBeNaN();
  });

  it("should return 0 for non-convertible types", () => {
    expect(asNumber(null)).toBe(0);
    expect(asNumber(undefined)).toBe(0);
    expect(asNumber(true)).toBe(0);
    expect(asNumber(false)).toBe(0);
    expect(asNumber({})).toBe(0);
    expect(asNumber([])).toBe(0);
    expect(asNumber(() => {})).toBe(0);
  });

  it("should handle edge cases", () => {
    expect(asNumber("Infinity")).toBe(Number.POSITIVE_INFINITY);
    expect(asNumber("-Infinity")).toBe(Number.NEGATIVE_INFINITY);
    expect(asNumber("1e10")).toBe(1e10);
    expect(asNumber("1.23e-4")).toBe(1.23e-4);
  });

  it("should handle strings with leading/trailing whitespace", () => {
    expect(asNumber("  42  ")).toBe(42);
    expect(asNumber("\t3.14\n")).toBe(3.14);
  });
});
