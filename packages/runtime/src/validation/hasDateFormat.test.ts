import { hasDateFormat } from "./hasDateFormat.js";

describe("hasDateFormat", () => {
  it("returns true for valid date strings", () => {
    expect(hasDateFormat("2023-12-01")).toBe(true);
    expect(hasDateFormat("12/01/2023")).toBe(true);
    expect(hasDateFormat("December 1, 2023")).toBe(true);
    expect(hasDateFormat("2023-12-01T10:00:00Z")).toBe(true);
  });

  it("returns true for valid date objects", () => {
    expect(hasDateFormat(new Date())).toBe(true);
    expect(hasDateFormat(new Date("2023-12-01"))).toBe(true);
  });

  it("returns true for valid numeric timestamps", () => {
    expect(hasDateFormat(1701388800000)).toBe(true); // Dec 1, 2023
    expect(hasDateFormat(0)).toBe(true); // Jan 1, 1970
  });

  it("returns false for invalid date strings", () => {
    expect(hasDateFormat("invalid-date")).toBe(false);
    expect(hasDateFormat("2023-13-01")).toBe(false); // Invalid month
    // Note: JavaScript Date constructor is lenient and will adjust "2023-02-30" to "2023-03-02"
    expect(hasDateFormat("not a date")).toBe(false);
  });

  it("returns false for non-convertible values", () => {
    expect(hasDateFormat(null)).toBe(false);
    expect(hasDateFormat(undefined)).toBe(false);
    expect(hasDateFormat({})).toBe(false);
    expect(hasDateFormat([])).toBe(false);
    expect(hasDateFormat(false)).toBe(false);
    expect(hasDateFormat(true)).toBe(false);
  });

  it("returns false for empty values", () => {
    expect(hasDateFormat("")).toBe(false);
    expect(hasDateFormat("   ")).toBe(false);
  });

  it("handles edge cases that might throw errors", () => {
    // Test cases that might trigger catch blocks
    expect(hasDateFormat(Symbol("test"))).toBe(false);
    expect(hasDateFormat(BigInt(123))).toBe(false);

    // Test very large numbers that might cause issues
    expect(hasDateFormat(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(hasDateFormat(Number.POSITIVE_INFINITY)).toBe(false);
    expect(hasDateFormat(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(hasDateFormat(Number.NaN)).toBe(false);

    // Test edge cases that might cause Date constructor issues
    expect(hasDateFormat(Number.MAX_VALUE)).toBe(false);
    expect(hasDateFormat(-Number.MAX_VALUE)).toBe(false);

    // Test objects that might cause string conversion issues
    const cyclicObj: any = {};
    cyclicObj.self = cyclicObj;
    // This should trigger the catch block in hasDateFormat due to JSON.stringify throwing
    expect(hasDateFormat(cyclicObj)).toBe(false);

    // Test very long strings that might cause issues
    const veryLongString = "a".repeat(1000000);
    expect(hasDateFormat(veryLongString)).toBe(false);
  });

  it("should return custom message on validation failure", () => {
    expect(hasDateFormat("invalid-date", "Please provide a valid date")).toBe(
      "Please provide a valid date",
    );
    expect(hasDateFormat(null, "Date is required")).toBe("Date is required");
    expect(hasDateFormat({}, "Invalid date format")).toBe(
      "Invalid date format",
    );
    expect(hasDateFormat(BigInt(123), "BigInt not supported")).toBe(
      "BigInt not supported",
    );
    expect(hasDateFormat(Symbol("test"), "Symbol not supported")).toBe(
      "Symbol not supported",
    );
  });

  it("should work without message parameter (backwards compatibility)", () => {
    expect(hasDateFormat("invalid-date")).toBe(false);
    expect(hasDateFormat("2023-12-01")).toBe(true);
  });
});
