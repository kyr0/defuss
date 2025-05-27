import { unique } from "./unique.js";

describe("unique", () => {
  it("should be defined", () => {
    expect(unique).toBeDefined();
  });

  it("should remove duplicate primitive values", () => {
    expect(unique([1, 2, 2, 3, 1])).toEqual([1, 2, 3]);
    expect(unique(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
    expect(unique([true, false, true, false])).toEqual([true, false]);
  });

  it("should handle empty arrays", () => {
    expect(unique([])).toEqual([]);
  });

  it("should handle arrays with one element", () => {
    expect(unique([1])).toEqual([1]);
    expect(unique(["single"])).toEqual(["single"]);
  });

  it("should handle arrays with no duplicates", () => {
    expect(unique([1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
    expect(unique(["a", "b", "c"])).toEqual(["a", "b", "c"]);
  });

  it("should handle mixed types", () => {
    expect(unique([1, "1", 1, "1", true, 1])).toEqual([1, "1", true]);
    expect(unique([null, undefined, null, undefined, 0, false])).toEqual([
      null,
      undefined,
      0,
      false,
    ]);
  });

  it("should preserve order of first occurrence", () => {
    expect(unique([3, 1, 2, 1, 3, 2])).toEqual([3, 1, 2]);
    expect(unique(["c", "a", "b", "a", "c"])).toEqual(["c", "a", "b"]);
  });

  it("should handle special numeric values", () => {
    expect(unique([Number.NaN, Number.NaN, 1, 1])).toEqual([Number.NaN, 1]);
    expect(
      unique([
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
        0,
        Number.NEGATIVE_INFINITY,
      ]),
    ).toEqual([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 0]);
    expect(unique([0, -0, 0, -0])).toEqual([0]); // 0 and -0 are considered equal
  });

  it("should handle null and undefined", () => {
    expect(unique([null, null, undefined, undefined])).toEqual([
      null,
      undefined,
    ]);
    expect(unique([null, undefined, null, undefined, null])).toEqual([
      null,
      undefined,
    ]);
  });

  it("should handle object references", () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 1 };
    const obj3 = obj1;

    expect(unique([obj1, obj2, obj3])).toEqual([obj1, obj2]); // obj1 and obj3 are same reference
  });

  it("should handle array references", () => {
    const arr1 = [1, 2];
    const arr2 = [1, 2];
    const arr3 = arr1;

    expect(unique([arr1, arr2, arr3])).toEqual([arr1, arr2]); // arr1 and arr3 are same reference
  });

  it("should handle function references", () => {
    const fn1 = () => 1;
    const fn2 = () => 1;
    const fn3 = fn1;

    expect(unique([fn1, fn2, fn3])).toEqual([fn1, fn2]); // fn1 and fn3 are same reference
  });

  it("should handle symbols", () => {
    const sym1 = Symbol("test");
    const sym2 = Symbol("test");
    const sym3 = sym1;

    expect(unique([sym1, sym2, sym3])).toEqual([sym1, sym2]); // sym1 and sym3 are same reference
  });

  it("should handle large arrays efficiently", () => {
    const largeArray = Array.from({ length: 10000 }, (_, i) => i % 100);
    const result = unique(largeArray);

    expect(result).toHaveLength(100);
    expect(result).toEqual(Array.from({ length: 100 }, (_, i) => i));
  });

  it("should handle arrays with all identical elements", () => {
    expect(unique([1, 1, 1, 1, 1])).toEqual([1]);
    expect(unique(["same", "same", "same"])).toEqual(["same"]);
  });

  it("should work with readonly arrays", () => {
    const readonlyArray: readonly number[] = [1, 2, 2, 3, 1] as const;
    expect(unique(readonlyArray)).toEqual([1, 2, 3]);
  });

  it("should handle complex nested structures", () => {
    const obj1 = { nested: { value: 1 } };
    const obj2 = { nested: { value: 1 } }; // Different object, same content
    const obj3 = obj1; // Same reference

    const array = [obj1, obj2, obj3, obj1, obj2];
    expect(unique(array)).toEqual([obj1, obj2]); // Only unique references
  });

  it("should preserve type information", () => {
    const stringArray = ["a", "b", "a", "c"];
    const result = unique(stringArray);
    expect(result).toEqual(["a", "b", "c"]);
    expect(typeof result[0]).toBe("string");
  });
});
