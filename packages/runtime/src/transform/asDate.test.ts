import { asDate } from "./asDate.js";

describe("asDate", () => {
  it("should be defined", () => {
    expect(asDate).toBeDefined();
  });

  it("should return the same Date for Date input", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    const result = asDate(date);
    expect(result).toBe(date);
    expect(result.getTime()).toBe(date.getTime());
  });

  it("should return invalid Date for null", () => {
    const result = asDate(null);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeNaN();
  });

  it("should return invalid Date for undefined", () => {
    const result = asDate(undefined);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeNaN();
  });

  it("should parse valid date strings", () => {
    const result1 = asDate("2023-01-01T00:00:00.000Z");
    expect(result1).toBeInstanceOf(Date);
    expect(result1.getTime()).toBe(
      new Date("2023-01-01T00:00:00.000Z").getTime(),
    );

    const result2 = asDate("2023-12-25");
    expect(result2).toBeInstanceOf(Date);
    expect(result2.getTime()).toBe(new Date("2023-12-25").getTime());

    const result3 = asDate("January 1, 2023");
    expect(result3).toBeInstanceOf(Date);
    expect(result3.getTime()).toBe(new Date("January 1, 2023").getTime());
  });

  it("should handle numeric timestamps", () => {
    const timestamp = 1672531200000; // 2023-01-01T00:00:00.000Z
    const result = asDate(timestamp);
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBe(timestamp);
  });

  it("should return invalid Date for invalid strings", () => {
    const result1 = asDate("invalid date");
    expect(result1).toBeInstanceOf(Date);
    expect(result1.getTime()).toBeNaN();

    const result2 = asDate("hello world");
    expect(result2).toBeInstanceOf(Date);
    expect(result2.getTime()).toBeNaN();

    const result3 = asDate("");
    expect(result3).toBeInstanceOf(Date);
    expect(result3.getTime()).toBeNaN();
  });

  it("should handle other types", () => {
    const result1 = asDate(true);
    expect(result1).toBeInstanceOf(Date);
    expect(result1.getTime()).toBe(1); // true converts to 1

    const result2 = asDate(false);
    expect(result2).toBeInstanceOf(Date);
    expect(result2.getTime()).toBe(0); // false converts to 0

    const result3 = asDate({});
    expect(result3).toBeInstanceOf(Date);
    expect(result3.getTime()).toBeNaN();

    const result4 = asDate([]);
    expect(result4).toBeInstanceOf(Date);
    expect(result4.getTime()).toBeNaN();
  });

  it("should handle edge cases", () => {
    const result1 = asDate(0);
    expect(result1).toBeInstanceOf(Date);
    expect(result1.getTime()).toBe(0); // Unix epoch

    const result2 = asDate(Number.NaN);
    expect(result2).toBeInstanceOf(Date);
    expect(result2.getTime()).toBeNaN();

    const result3 = asDate(Number.POSITIVE_INFINITY);
    expect(result3).toBeInstanceOf(Date);
    expect(result3.getTime()).toBeNaN();
  });

  it("should handle already invalid Date objects", () => {
    const invalidDate = new Date("invalid");
    const result = asDate(invalidDate);
    expect(result).toBe(invalidDate);
    expect(result.getTime()).toBeNaN();
  });
});
