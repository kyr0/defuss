import { asString } from "./asString.js";

describe("asString", () => {
  it("should be defined", () => {
    expect(asString).toBeDefined();
  });

  it("should return empty string for null", () => {
    expect(asString(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(asString(undefined)).toBe("");
  });

  it("should return the same string for string input", () => {
    expect(asString("hello")).toBe("hello");
    expect(asString("")).toBe("");
    expect(asString(" ")).toBe(" ");
  });

  it("should convert numbers to strings", () => {
    expect(asString(42)).toBe("42");
    expect(asString(0)).toBe("0");
    expect(asString(-1)).toBe("-1");
    expect(asString(3.14)).toBe("3.14");
    expect(asString(Number.NaN)).toBe("NaN");
    expect(asString(Number.POSITIVE_INFINITY)).toBe("Infinity");
    expect(asString(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
  });

  it("should convert booleans to strings", () => {
    expect(asString(true)).toBe("true");
    expect(asString(false)).toBe("false");
  });

  it("should join arrays with comma and space", () => {
    expect(asString([1, 2, 3])).toBe("1, 2, 3");
    expect(asString(["a", "b", "c"])).toBe("a, b, c");
    expect(asString([])).toBe("");
    expect(asString([true, false, null])).toBe("true, false, ");
  });

  it("should stringify objects", () => {
    expect(asString({ name: "test", value: 42 })).toBe(
      '{"name":"test","value":42}',
    );
    expect(asString({})).toBe("{}");
    expect(asString({ nested: { key: "value" } })).toBe(
      '{"nested":{"key":"value"}}',
    );
  });

  it("should handle complex nested structures", () => {
    const complex = {
      arr: [1, 2, { inner: true }],
      obj: { deep: { value: "test" } },
    };
    expect(asString(complex)).toBe(
      '{"arr":[1,2,{"inner":true}],"obj":{"deep":{"value":"test"}}}',
    );
  });

  it("should handle dates", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");
    expect(asString(date)).toBe("2023-01-01T00:00:00.000Z");
  });

  it("should handle regular expressions", () => {
    const regex = /test/gi;
    expect(asString(regex)).toBe("/test/gi");
  });

  it("should handle functions", () => {
    const fn = () => "test";
    const result = asString(fn);
    expect(result).toBe('() => "test"'); // String() on arrow function returns the source
  });

  it("should handle symbols", () => {
    const sym = Symbol("test");
    const result = asString(sym);
    expect(result).toContain("Symbol");
  });

  it("should handle bigint", () => {
    const big = BigInt(123);
    expect(asString(big)).toBe("123");
  });
});
