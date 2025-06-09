/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { stringify } from "./stringify.js";

describe("stringify (realistic tests)", () => {
  describe("Primitive types", () => {
    it("should stringify null", async () => {
      expect(await stringify(null)).toBe("null");
    });

    it("should stringify undefined", async () => {
      expect(await stringify(undefined)).toBe("undefined");
    });

    it("should stringify booleans", async () => {
      expect(await stringify(true)).toBe("true");
      expect(await stringify(false)).toBe("false");
    });

    it("should stringify numbers", async () => {
      expect(await stringify(42)).toBe("42");
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      expect(await stringify(3.14159)).toBe("3.14159");
      expect(await stringify(0)).toBe("0");
      expect(await stringify(-42)).toBe("-42");
    });

    it("should stringify strings", async () => {
      expect(await stringify("")).toBe('""');
      expect(await stringify("hello")).toBe('"hello"');
      expect(await stringify('hello "world"')).toBe('"hello \\"world\\""');
    });

    it("should stringify bigint", async () => {
      expect(await stringify(BigInt(123))).toBe('[null,"BigInt","123"]');
      expect(await stringify(BigInt("9007199254740991"))).toBe(
        '[null,"BigInt","9007199254740991"]',
      );
    });

    it("should stringify symbols", async () => {
      expect(await stringify(Symbol("test"))).toBe('[null,"Symbol","test"]');
      expect(await stringify(Symbol())).toBe('[null,"Symbol",""]');
    });
  });

  describe("Objects and arrays (with DSON format)", () => {
    it("should stringify empty object with DSON format", async () => {
      const result = await stringify({});
      expect(result).toBe('[0,"Object",{}]');
    });

    it("should stringify simple object with DSON format", async () => {
      const obj = { a: 1, b: "hello" };
      const result = await stringify(obj);
      expect(result).toBe('[0,"Object",{"a":1,"b":"hello"}]');
    });

    it("should stringify empty array with DSON format", async () => {
      const result = await stringify([]);
      expect(result).toBe('[0,"Array",[]]');
    });

    it("should stringify simple array with DSON format", async () => {
      const arr = [1, "hello", true];
      const result = await stringify(arr);
      expect(result).toBe('[0,"Array",[1,"hello",true]]');
    });

    it("should stringify nested objects", async () => {
      const obj = {
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const result = await stringify(obj);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0); // ID
      expect(parsed[1]).toBe("Object"); // Type
      expect(parsed[2]).toHaveProperty("nested");
      expect(parsed[2].nested[1]).toBe("Object"); // Nested object type
      expect(parsed[2].nested[2].value).toBe(42);
      expect(parsed[2].nested[2].array[1]).toBe("Array"); // Nested array type
    });
  });

  describe("JavaScript types with DSON format", () => {
    it("should stringify Date objects", async () => {
      const date = new Date("2023-01-01T00:00:00.000Z");
      const result = await stringify(date);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0); // ID
      expect(parsed[1]).toBe("Class"); // Type
      expect(parsed[2].className).toBe("Date");
      expect(parsed[2]).toHaveProperty("properties");
    });

    it("should stringify RegExp objects", async () => {
      const regex = /test/gi;
      const result = await stringify(regex);
      expect(result).toBe('[0,"RegExp",{"source":"test","flags":"gi"}]');
    });

    it("should stringify RegExp without flags", async () => {
      const regex = /hello/;
      const result = await stringify(regex);
      expect(result).toBe('[0,"RegExp",{"source":"hello","flags":""}]');
    });

    it("should stringify Maps", async () => {
      const map = new Map<unknown, unknown>([
        ["key1", "value1"],
        ["key2", 42],
        [3, "number key"],
      ]);
      const result = await stringify(map);
      expect(result).toBe(
        '[0,"Map",[["key1","value1"],["key2",42],[3,"number key"]]]',
      );
    });

    it("should stringify empty Map", async () => {
      const map = new Map();
      const result = await stringify(map);
      expect(result).toBe('[0,"Map",[]]');
    });

    it("should stringify Sets", async () => {
      const set = new Set([1, "hello", true, null]);
      const result = await stringify(set);
      expect(result).toBe('[0,"Set",[1,"hello",true,null]]');
    });

    it("should stringify empty Set", async () => {
      const set = new Set();
      const result = await stringify(set);
      expect(result).toBe('[0,"Set",[]]');
    });
  });

  describe("TypedArrays and binary data", () => {
    it("should stringify Uint8Array", async () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = await stringify(arr);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0); // ID
      expect(parsed[1]).toBe("Uint8Array"); // Type
      expect(parsed[2]).toHaveProperty("buffer"); // Should have buffer property
      expect(typeof parsed[2].buffer).toBe("string"); // Base64 encoded
    });

    it("should stringify Int32Array", async () => {
      const arr = new Int32Array([1, -1, 2147483647, -2147483648]);
      const result = await stringify(arr);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Int32Array");
      expect(parsed[2]).toHaveProperty("buffer");
      expect(typeof parsed[2].buffer).toBe("string");
    });

    it("should stringify Float32Array", async () => {
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      const arr = new Float32Array([1.5, -2.5, 3.14159]);
      const result = await stringify(arr);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Float32Array");
      expect(parsed[2]).toHaveProperty("buffer");
      expect(typeof parsed[2].buffer).toBe("string");
    });

    it("should stringify ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'

      const result = await stringify(buffer);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Class");
      expect(parsed[2].className).toBe("ArrayBuffer");
    });

    it("should stringify DataView", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setInt32(0, 42);

      const result = await stringify(view);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Class");
      expect(parsed[2].className).toBe("DataView");
    });
  });

  describe("Functions", () => {
    it("should stringify functions", async () => {
      const fn = function testFunction(a: number, b: number) {
        return a + b;
      };
      const result = await stringify(fn);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Function");
      expect(typeof parsed[2]).toBe("string"); // Function source
      expect(parsed[2]).toContain("testFunction");
    });

    it("should stringify arrow functions", async () => {
      const fn = (x: number) => x * 2;
      const result = await stringify(fn);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Function");
      expect(typeof parsed[2]).toBe("string");
    });

    it("should stringify async functions", async () => {
      const fn = async () => "async";
      const result = await stringify(fn);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Function");
      expect(typeof parsed[2]).toBe("string");
      expect(parsed[2]).toContain("async");
    });
  });

  describe("Custom classes", () => {
    class TestClass {
      constructor(public value: string) {}

      toString() {
        return `TestClass(${this.value})`;
      }
    }

    it("should stringify custom class instances", async () => {
      const instance = new TestClass("test");
      const result = await stringify(instance);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Class");
      expect(parsed[2].className).toBe("TestClass");
      expect(parsed[2]).toHaveProperty("properties");
      expect(parsed[2].properties.value).toBe("test");
    });

    it("should handle class inheritance", async () => {
      class BaseClass {
        constructor(public base: string) {}
      }

      class DerivedClass extends BaseClass {
        constructor(
          base: string,
          public derived: string,
        ) {
          super(base);
        }
      }

      const instance = new DerivedClass("base", "derived");
      const result = await stringify(instance);
      const parsed = JSON.parse(result);

      expect(parsed[0]).toBe(0);
      expect(parsed[1]).toBe("Class");
      expect(parsed[2].className).toBe("DerivedClass");
      expect(parsed[2].properties.base).toBe("base");
      expect(parsed[2].properties.derived).toBe("derived");
    });
  });

  describe("Circular references", () => {
    it("should handle simple circular references", async () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      const result = await stringify(obj);
      const parsed = JSON.parse(result);

      // Should use reference system
      expect(parsed).toHaveProperty("$dson_refs");
      expect(Array.isArray(parsed.$dson_refs)).toBe(true);
    });

    it("should handle complex circular references", async () => {
      const obj1: any = { name: "obj1" };
      const obj2: any = { name: "obj2" };
      obj1.ref = obj2;
      obj2.ref = obj1;

      const container = { obj1, obj2 };
      const result = await stringify(container);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty("$dson_refs");
    });

    it("should handle self-referencing arrays", async () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);

      const result = await stringify(arr);
      const parsed = JSON.parse(result);

      expect(parsed).toHaveProperty("$dson_refs");
    });
  });

  describe("Complex nested structures", () => {
    it("should stringify complex mixed data structures", async () => {
      const complex = {
        date: new Date("2023-01-01"),
        regex: /test/gi,
        map: new Map([["key", "value"]]),
        set: new Set([1, 2, 3]),
        buffer: new Uint8Array([1, 2, 3]),
        nested: {
          symbol: Symbol("nested"),
          bigint: BigInt(123),
          fn: () => "hello",
        },
        array: [null, undefined, true, false],
      };

      const result = await stringify(complex);
      expect(typeof result).toBe("string");

      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();

      const parsed = JSON.parse(result);
      expect(parsed[1]).toBe("Object"); // Root object type
      expect(parsed[2]).toHaveProperty("date");
      expect(parsed[2]).toHaveProperty("regex");
      expect(parsed[2]).toHaveProperty("map");
      expect(parsed[2]).toHaveProperty("set");
    });
  });

  describe("Error handling", () => {
    it("should handle objects with toJSON method", async () => {
      const obj = {
        value: 42,
        toJSON() {
          return { serialized: true, value: this.value };
        },
      };

      const result = await stringify(obj);
      const parsed = JSON.parse(result);

      // Should respect toJSON method
      expect(parsed[1]).toBe("Object");
      expect(parsed[2].serialized).toBe(true);
      expect(parsed[2].value).toBe(42);
    });

    it("should handle objects that throw during serialization", async () => {
      const obj = {
        get problematic() {
          throw new Error("Cannot access this property");
        },
      };

      // Should not throw, but may exclude the problematic property
      const result = await stringify(obj);
      expect(typeof result).toBe("string");

      const parsed = JSON.parse(result);
      expect(parsed[1]).toBe("Object");
      // The problematic property should not be included
      expect(parsed[2]).not.toHaveProperty("problematic");
    });
  });

  describe("Replacer function", () => {
    it("should apply replacer function", async () => {
      const obj = { a: 1, b: 2, c: 3 };
      const replacer = (key: string, value: any) => {
        if (key === "b") return undefined;
        return value;
      };

      const result = await stringify(obj, replacer);
      const parsed = JSON.parse(result);

      expect(parsed[1]).toBe("Object");
      expect(parsed[2]).toEqual({ a: 1, c: 3 });
    });

    it("should apply replacer array", async () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const replacer = ["a", "c"];

      const result = await stringify(obj, replacer);
      const parsed = JSON.parse(result);

      expect(parsed[1]).toBe("Object");
      expect(parsed[2]).toEqual({ a: 1, c: 3 });
    });
  });

  describe("Spacing/formatting", () => {
    it("should format with number space", async () => {
      const obj = { a: 1, b: 2 };
      const result = await stringify(obj, null, 2);
      expect(result).toContain("\n");
      expect(result).toContain("  "); // 2 spaces
    });

    it("should format with string space", async () => {
      const obj = { a: 1, b: 2 };
      const result = await stringify(obj, null, "\t");
      expect(result).toContain("\n");
      expect(result).toContain("\t");
    });
  });
});
