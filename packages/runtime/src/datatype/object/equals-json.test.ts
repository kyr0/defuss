import { equalsJSON } from "./equals-json.js";

describe("equalsJSON", () => {
  it("should be defined", () => {
    expect(equalsJSON).toBeDefined();
  });

  it("should return true for identical primitive values", () => {
    expect(equalsJSON(1, 1)).toBe(true);
    expect(equalsJSON("hello", "hello")).toBe(true);
    expect(equalsJSON(true, true)).toBe(true);
    expect(equalsJSON(null, null)).toBe(true);
  });

  it("should return false for different primitive values", () => {
    expect(equalsJSON(1, 2)).toBe(false);
    expect(equalsJSON("hello", "world")).toBe(false);
    expect(equalsJSON(true, false)).toBe(false);
    expect(equalsJSON(null, undefined)).toBe(false);
  });

  it("should handle special numeric values", () => {
    expect(equalsJSON(Number.NaN, Number.NaN)).toBe(true); // NaN becomes null in JSON
    expect(equalsJSON(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(
      true,
    );
    expect(equalsJSON(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(
      true,
    );
    expect(equalsJSON(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toBe(
      true, // Both become null in JSON
    );
  });

  it("should return true for identical simple objects", () => {
    expect(equalsJSON({ a: 1 }, { a: 1 })).toBe(true);
    expect(equalsJSON({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("should return false for different simple objects", () => {
    expect(equalsJSON({ a: 1 }, { a: 2 })).toBe(false);
    expect(equalsJSON({ a: 1 }, { b: 1 })).toBe(false);
    expect(equalsJSON({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("should handle key order correctly", () => {
    // JSON.stringify preserves key order, so different order = different result
    expect(equalsJSON({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
  });

  it("should return true for identical arrays", () => {
    expect(equalsJSON([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(equalsJSON([], [])).toBe(true);
    expect(equalsJSON([{ a: 1 }], [{ a: 1 }])).toBe(true);
  });

  it("should return false for different arrays", () => {
    expect(equalsJSON([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(equalsJSON([1, 2], [1, 2, 3])).toBe(false);
    expect(equalsJSON([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it("should handle nested objects and arrays", () => {
    const obj1 = { a: { b: [1, 2, { c: 3 }] } };
    const obj2 = { a: { b: [1, 2, { c: 3 }] } };
    const obj3 = { a: { b: [1, 2, { c: 4 }] } };

    expect(equalsJSON(obj1, obj2)).toBe(true);
    expect(equalsJSON(obj1, obj3)).toBe(false);
  });

  it("should handle functions (omitted in JSON)", () => {
    const obj1 = { a: 1, fn: () => {} };
    const obj2 = { a: 1, fn: () => {} };
    const obj3 = { a: 1 };

    expect(equalsJSON(obj1, obj2)).toBe(true); // Functions are omitted
    expect(equalsJSON(obj1, obj3)).toBe(true); // Functions are omitted
  });

  it("should handle undefined values (omitted in JSON)", () => {
    const obj1 = { a: 1, b: undefined };
    const obj2 = { a: 1, b: undefined };
    const obj3 = { a: 1 };

    expect(equalsJSON(obj1, obj2)).toBe(true); // undefined is omitted
    expect(equalsJSON(obj1, obj3)).toBe(true); // undefined is omitted
  });

  it("should handle Date objects", () => {
    const date1 = new Date("2023-01-01");
    const date2 = new Date("2023-01-01");
    const date3 = new Date("2023-01-02");

    expect(equalsJSON(date1, date2)).toBe(true);
    expect(equalsJSON(date1, date3)).toBe(false);
  });

  it("should handle circular references gracefully", () => {
    const obj1: any = { a: 1 };
    obj1.self = obj1;

    const obj2: any = { a: 1 };
    obj2.self = obj2;

    // Both should fail to serialize and return false
    expect(equalsJSON(obj1, obj2)).toBe(false);
    expect(equalsJSON(obj1, { a: 1 })).toBe(false);
  });

  it("should handle mixed data types", () => {
    const complex1 = {
      string: "test",
      number: 42,
      boolean: true,
      null: null,
      array: [1, "two", { three: 3 }],
      object: { nested: { deep: "value" } },
    };

    const complex2 = {
      string: "test",
      number: 42,
      boolean: true,
      null: null,
      array: [1, "two", { three: 3 }],
      object: { nested: { deep: "value" } },
    };

    const complex3 = {
      ...complex1,
      number: 43,
    };

    expect(equalsJSON(complex1, complex2)).toBe(true);
    expect(equalsJSON(complex1, complex3)).toBe(false);
  });

  it("should handle empty values", () => {
    expect(equalsJSON({}, {})).toBe(true);
    expect(equalsJSON([], [])).toBe(true);
    expect(equalsJSON("", "")).toBe(true);
    expect(equalsJSON(0, 0)).toBe(true);
    expect(equalsJSON(false, false)).toBe(true);
  });
});
