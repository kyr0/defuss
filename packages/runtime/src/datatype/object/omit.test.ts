import { omit } from "./omit.js";

describe("omit", () => {
  it("should be defined", () => {
    expect(omit).toBeDefined();
  });

  it("should omit specified keys from object", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = omit(obj, ["b", "d"]);

    expect(result).toEqual({ a: 1, c: 3 });
    expect(Object.keys(result)).toEqual(["a", "c"]);
  });

  it("should return same object structure when omitting no keys", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit(obj, []);

    expect(result).toEqual(obj);
    expect(result).not.toBe(obj); // Should be a new object
  });

  it("should ignore keys that don't exist in the object", () => {
    const obj = { a: 1, b: 2 };
    // @ts-ignore
    const result = omit(obj, ["c", "d"]);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it("should handle empty source object", () => {
    const obj = {};
    // @ts-ignore
    const result = omit(obj, ["a", "b"]);

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
      remove: "this should be removed",
    };

    const result = omit(obj, ["remove"]);

    expect(result.str).toBe("hello");
    expect(result.num).toBe(42);
    expect(result.bool).toBe(true);
    expect(result.arr).toEqual([1, 2, 3]);
    expect(result.obj).toEqual({ nested: "value" });
    expect(result.nul).toBeNull();
    expect(result.undef).toBeUndefined();
    expect(result.date).toBeInstanceOf(Date);
    expect(result.func).toBeInstanceOf(Function);
    // @ts-ignore
    expect(result.remove).toBeUndefined();
  });

  it("should maintain reference to original values", () => {
    const nestedObj = { value: "test" };
    const arr = [1, 2, 3];
    const obj = {
      nested: nestedObj,
      array: arr,
      primitive: "string",
      remove: "gone",
    };

    const result = omit(obj, ["remove"]);

    expect(result.nested).toBe(nestedObj); // Same reference
    expect(result.array).toBe(arr); // Same reference
    // @ts-ignore
    expect(result.remove).toBeUndefined();
  });

  it("should not modify the original object", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const original = { ...obj };

    omit(obj, ["b"]);

    expect(obj).toEqual(original);
  });

  it("should handle objects with symbol keys", () => {
    const sym = Symbol("test");
    const obj = { a: 1, [sym]: "symbol value", b: 2 };

    const result = omit(obj, ["b"]);
    expect(result).toEqual({ a: 1 }); // Symbol keys are not included in for...in loop
  });

  it("should only include own properties", () => {
    function Parent() {}
    Parent.prototype.inherited = "inherited value";

    function Child() {
      // @ts-ignore
      this.own = "own value";
      // @ts-ignore
      this.another = "another value";
    }
    Child.prototype = Object.create(Parent.prototype);

    // @ts-ignore
    const obj = new Child();
    const result = omit(obj, ["another"]);

    expect(result).toEqual({ own: "own value" });
    expect(result.inherited).toBeUndefined();
  });

  it("should work with numeric keys", () => {
    const obj = { 0: "zero", 1: "one", 2: "two", name: "test" };
    // @ts-ignore
    const result = omit(obj, ["1", "name"]); // Use string key to match object's string key

    expect(result).toEqual({ 0: "zero", 2: "two" });
  });

  it("should handle when all keys are omitted", () => {
    const obj = { a: 1, b: 2 };
    const result = omit(obj, ["a", "b"]);

    expect(result).toEqual({});
  });

  it("should handle objects with non-enumerable properties", () => {
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
    obj.c = 3;

    // @ts-ignore
    const result = omit(obj, ["a"]);
    expect(result).toEqual({ c: 3 });
    // @ts-ignore
    expect(result.b).toBeUndefined(); // Non-enumerable properties are not copied
  });

  it("should handle complex omit operations", () => {
    const obj = {
      keep1: "value1",
      remove1: "remove this",
      keep2: { nested: "object" },
      remove2: [1, 2, 3],
      keep3: null,
      remove3: undefined,
      keep4: false,
    };

    const result = omit(obj, ["remove1", "remove2", "remove3"]);

    expect(result).toEqual({
      keep1: "value1",
      keep2: { nested: "object" },
      keep3: null,
      keep4: false,
    });
  });
});
