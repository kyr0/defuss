import { asArray } from "./asArray.js";

describe("asArray", () => {
  it("should be defined", () => {
    expect(asArray).toBeDefined();
  });

  it("should transform array values using transformer function", () => {
    const input = [1, 2, 3];
    const transformer = (value: any) => value * 2;
    const result = asArray(input, transformer);
    expect(result).toEqual([2, 4, 6]);
  });

  it("should return empty array for null", () => {
    const transformer = (value: any) => value;
    const result = asArray(null, transformer);
    expect(result).toEqual([]);
  });

  it("should return empty array for undefined", () => {
    const transformer = (value: any) => value;
    const result = asArray(undefined, transformer);
    expect(result).toEqual([]);
  });

  it("should transform single value and return as array if transformer returns non-array", () => {
    const input = "hello";
    const transformer = (value: any) => value.toUpperCase();
    const result = asArray(input, transformer);
    expect(result).toEqual(["HELLO"]);
  });

  it("should transform single value and return array if transformer returns array", () => {
    const input = "hello";
    const transformer = (value: any) => value.split("");
    const result = asArray(input, transformer);
    expect(result).toEqual(["h", "e", "l", "l", "o"]);
  });

  it("should handle complex objects", () => {
    const input = { name: "test", value: 42 };
    const transformer = (value: any) => [value.name, value.value];
    const result = asArray(input, transformer);
    expect(result).toEqual(["test", 42]);
  });

  it("should handle zero value", () => {
    const input = 0;
    const transformer = (value: any) => value + 10;
    const result = asArray(input, transformer);
    expect(result).toEqual([10]);
  });

  it("should handle empty string", () => {
    const input = "";
    const transformer = (value: any) => value || "default";
    const result = asArray(input, transformer);
    expect(result).toEqual(["default"]);
  });

  it("should handle false value", () => {
    const input = false;
    const transformer = (value: any) => !value;
    const result = asArray(input, transformer);
    expect(result).toEqual([true]);
  });
});
