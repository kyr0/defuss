/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { parse } from "./json.js";
import { stringify } from "./json.js";

describe("parse", () => {
  describe("Primitive types", () => {
    it("should parse bigint", async () => {
      const bigIntSerialized = stringify(BigInt(123));
      expect(parse(bigIntSerialized)).toBe(BigInt(123));

      const largeBigInt = BigInt("9007199254740991");
      const largeSerialized = stringify(largeBigInt);
      expect(parse(largeSerialized)).toBe(largeBigInt);
    });

    it("should parse Error objects", async () => {
      const basicError = new Error("Test error message");
      const errorSerialized = stringify(basicError);
      const parsedError = parse(errorSerialized);

      expect(parsedError).toBeInstanceOf(Error);
      expect(parsedError.name).toBe("Error");
      expect(parsedError.message).toBe("Test error message");

      // Test different error types
      const typeError = new TypeError("Type error test");
      const typeErrorSerialized = stringify(typeError);
      const parsedTypeError = parse(typeErrorSerialized);

      expect(parsedTypeError).toBeInstanceOf(TypeError);
      expect(parsedTypeError.name).toBe("TypeError");
      expect(parsedTypeError.message).toBe("Type error test");
    });

    it("should parse wrapped BigInt objects", async () => {
      const wrappedBigInt = Object(BigInt(456));
      const serialized = stringify(wrappedBigInt);
      const parsed = parse(serialized);

      expect(typeof parsed).toBe("object");
      expect(parsed).toBeInstanceOf(Object);
      expect(parsed.valueOf()).toBe(BigInt(456));
    });
  });

  describe("Basic objects and arrays", () => {
    it("should parse nested objects", async () => {
      const obj = {
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const serialized = stringify(obj);
      const parsed = parse(serialized);
      expect(parsed).toEqual(obj);
    });
  });

  describe("Dates", () => {
    it("should parse Date objects", async () => {
      const date = new Date("2023-01-01T00:00:00.000Z");
      const serialized = stringify(date);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getTime()).toBe(date.getTime());
    });

    it("should handle various date formats", async () => {
      const dates = [
        new Date("2023-12-25T12:30:45.123Z"),
        new Date(0), // Unix epoch
        new Date("1999-12-31T23:59:59.999Z"),
      ];

      for (const date of dates) {
        const serialized = stringify(date);
        const parsed = parse(serialized);
        expect(parsed.getTime()).toBe(date.getTime());
      }
    });
  });

  describe("RegExp", () => {
    it("should parse RegExp objects", async () => {
      const regex = /test/gi;
      const serialized = stringify(regex);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(RegExp);
      expect(parsed.source).toBe(regex.source);
      expect(parsed.flags).toBe(regex.flags);
    });

    it("should parse RegExp without flags", async () => {
      const regex = /hello/;
      const serialized = stringify(regex);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(RegExp);
      expect(parsed.source).toBe("hello");
      expect(parsed.flags).toBe("");
    });

    it("should parse complex RegExp", async () => {
      const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const serialized = stringify(regex);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(RegExp);
      expect(parsed.source).toBe(regex.source);
      expect(parsed.flags).toBe(regex.flags);
    });
  });

  describe("Maps and Sets", () => {
    it("should parse empty Map", async () => {
      const map = new Map();
      const serialized = stringify(map);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Map);
      expect(parsed.size).toBe(0);
    });

    it("should parse Map with entries", async () => {
      const map = new Map<unknown, unknown>([
        ["key1", "value1"],
        ["key2", 42],
        [3, "number key"],
      ]);
      const serialized = stringify(map);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Map);
      expect(parsed.size).toBe(3);
      expect(parsed.get("key1")).toBe("value1");
      expect(parsed.get("key2")).toBe(42);
      expect(parsed.get(3)).toBe("number key");
    });

    it("should parse empty Set", async () => {
      const set = new Set();
      const serialized = stringify(set);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Set);
      expect(parsed.size).toBe(0);
    });

    it("should parse Set with values", async () => {
      const set = new Set([1, "hello", true, null]);
      const serialized = stringify(set);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Set);
      expect(parsed.size).toBe(4);
      expect(parsed.has(1)).toBe(true);
      expect(parsed.has("hello")).toBe(true);
      expect(parsed.has(true)).toBe(true);
      expect(parsed.has(null)).toBe(true);
    });

    it("should parse nested Maps and Sets", async () => {
      const map = new Map<unknown, unknown>([
        ["set", new Set([1, 2])],
        ["nested", new Map([["inner", "value"]])],
      ]);
      const serialized = stringify(map);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Map);
      expect(parsed.get("set")).toBeInstanceOf(Set);
      expect(parsed.get("nested")).toBeInstanceOf(Map);
      expect((parsed.get("nested") as Map<string, string>).get("inner")).toBe(
        "value",
      );
    });
  });

  describe("ArrayBuffer and TypedArrays", () => {
    it("should parse ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'

      const serialized = stringify(buffer);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(ArrayBuffer);
      expect(parsed.byteLength).toBe(8);

      const parsedView = new Uint8Array(parsed);
      expect(parsedView[0]).toBe(72);
      expect(parsedView[1]).toBe(101);
    });

    it("should parse Uint8Array", async () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const serialized = stringify(arr);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Uint8Array);
      expect(parsed.length).toBe(5);
      expect(Array.from(parsed)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should parse Int32Array", async () => {
      const arr = new Int32Array([1, -1, 2147483647, -2147483648]);
      const serialized = stringify(arr);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Int32Array);
      expect(parsed.length).toBe(4);
      expect(Array.from(parsed)).toEqual([1, -1, 2147483647, -2147483648]);
    });

    it("should parse Float32Array", async () => {
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      const arr = new Float32Array([1.5, -2.5, 3.14159]);
      const serialized = stringify(arr);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(Float32Array);
      expect(parsed.length).toBe(3);
      expect(parsed[0]).toBeCloseTo(1.5);
      expect(parsed[1]).toBeCloseTo(-2.5);
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      expect(parsed[2]).toBeCloseTo(3.14159);
    });

    it("should parse DataView", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setInt32(0, 42);

      const serialized = stringify(view);
      const parsed = parse(serialized);

      expect(parsed).toBeInstanceOf(DataView);
      expect(parsed.byteLength).toBe(8);
      expect(parsed.getInt32(0)).toBe(42);
    });
  });

  describe("Circular references", () => {
    it("should parse simple circular references", async () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      const serialized = stringify(obj);
      const parsed = parse(serialized);

      expect(parsed.name).toBe("test");
      expect(parsed.self).toBe(parsed);
    });

    it("should parse complex circular references", async () => {
      const obj1: any = { name: "obj1" };
      const obj2: any = { name: "obj2" };
      obj1.ref = obj2;
      obj2.ref = obj1;

      const container = { obj1, obj2 };
      const serialized = stringify(container);
      const parsed = parse(serialized);

      expect(parsed.obj1.name).toBe("obj1");
      expect(parsed.obj2.name).toBe("obj2");
      expect(parsed.obj1.ref).toBe(parsed.obj2);
      expect(parsed.obj2.ref).toBe(parsed.obj1);
    });

    it("should parse self-referencing arrays", async () => {
      const arr: any[] = [1, 2, 3];
      arr.push(arr);

      const serialized = stringify(arr);
      const parsed = parse(serialized);

      expect(parsed[0]).toBe(1);
      expect(parsed[1]).toBe(2);
      expect(parsed[2]).toBe(3);
      expect(parsed[3]).toBe(parsed);
    });
  });
});
