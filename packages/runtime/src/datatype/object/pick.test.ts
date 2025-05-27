import { pick } from "./pick.js";

describe("pick", () => {
  it("should be defined", () => {
    expect(pick).toBeDefined();
  });

  it("should pick specified keys from object", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = pick(obj, ["a", "c"]);

    expect(result).toEqual({ a: 1, c: 3 });
    expect(Object.keys(result)).toEqual(["a", "c"]);
  });

  it("should return empty object when picking no keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, []);

    expect(result).toEqual({});
  });

  it("should ignore keys that don't exist in the object", () => {
    const obj = { a: 1, b: 2 };
    // @ts-ignore
    const result = pick(obj, ["a", "c", "d"]);

    expect(result).toEqual({ a: 1 });
  });

  it("should handle empty source object", () => {
    const obj = {};
    // @ts-ignore
    const result = pick(obj, ["a", "b"]);

    expect(result).toEqual({});
  });

  it("should preserve value types", () => {
    const obj = {
      str: "hello",
      num: 42,
      bool: true,
      arr: [1, 2, 3],
      obj: { nested: "value" },
      nul: null,
      undef: undefined,
      date: new Date("2023-01-01"),
      func: () => "test",
    };

    const result = pick(obj, [
      "str",
      "num",
      "bool",
      "arr",
      "obj",
      "nul",
      "undef",
      "date",
      "func",
    ]);

    expect(result.str).toBe("hello");
    expect(result.num).toBe(42);
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.obj).toEqual({ nested: "value" });
    expect(result.nul).toBeNull();
    expect(result.undef).toBeUndefined();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.func).toBeInstanceOf(Function);
  });

  it("should maintain reference to original values", () => {
    const nestedObj = { value: "test" };
    const arr = [1, 2, 3];
    const obj = { nested: nestedObj, array: arr, primitive: "string" };

    const result = pick(obj, ["nested", "array"]);

    expect(result.nested).toBe(nestedObj); // Same reference
    expect(result.array).toBe(arr); // Same reference
  });

  it("should not modify the original object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const original = { ...obj };

    pick(obj, ["a", "c"]);

    expect(obj).toEqual(original);
  });

  it("should handle objects with symbol keys", () => {
    const sym = Symbol("test");
    const obj = { a: 1, [sym]: "symbol value", b: 2 };

    const result = pick(obj, ["a"]);
    expect(result).toEqual({ a: 1 });
  });

  it("should handle objects with prototype properties", () => {
    function Parent() {}
    Parent.prototype.inherited = "inherited value";

    function Child() {
      // @ts-ignore
      this.own = "own value";
    }
    Child.prototype = Object.create(Parent.prototype);

    // @ts-ignore
    const obj = new Child();
    const result = pick(obj, ["own", "inherited"]);

    expect(result).toEqual({ own: "own value", inherited: "inherited value" });
  });

  it("should work with numeric keys", () => {
    const obj = { 0: "zero", 1: "one", 2: "two", name: "test" };
    const result = pick(obj, [0, 1, "name"]);

    expect(result).toEqual({ 0: "zero", 1: "one", name: "test" });
  });

  it("should preserve property descriptors for enumerable properties", () => {
    const obj = {};
    Object.defineProperty(obj, "a", {
      value: 1,
      enumerable: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(obj, "b", {
      value: 2,
      enumerable: false,
      configurable: true,
      writable: true,
    });

    // @ts-ignore
    const result = pick(obj, ["a", "b"]);
    expect(result).toEqual({ a: 1, b: 2 });
  });
});
