/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { isEqual } from "./equals.js";

describe("isEqual", () => {
  describe("Primitive types", () => {
    it("should compare booleans", async () => {
      expect(isEqual(true, true)).toBe(true);
      expect(isEqual(false, false)).toBe(true);
      expect(isEqual(true, false)).toBe(false);
      expect(isEqual(true, 1)).toBe(false);
      expect(isEqual(false, 0)).toBe(false);
    });

    it("should compare numbers", async () => {
      expect(isEqual(42, 42)).toBe(true);
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      expect(isEqual(3.14159, 3.14159)).toBe(true);
      expect(isEqual(0, 0)).toBe(true);
      expect(isEqual(-0, 0)).toBe(true);
      expect(isEqual(42, 43)).toBe(false);
    });

    it("should compare strings", async () => {
      expect(isEqual("", "")).toBe(true);
      expect(isEqual("hello", "hello")).toBe(true);
      expect(isEqual("hello", "world")).toBe(false);
      expect(isEqual("hello", "Hello")).toBe(false);
    });

    it("should compare bigint", async () => {
      expect(isEqual(BigInt(123), BigInt(123))).toBe(true);
      expect(isEqual(BigInt(123), BigInt(456))).toBe(false);
      expect(isEqual(BigInt(123), 123)).toBe(false);
    });
  });

  describe("Basic objects and arrays", () => {
    it("should compare empty objects", async () => {
      expect(isEqual({}, {})).toBe(true);
      expect(isEqual({}, { a: 1 })).toBe(false);
    });

    it("should compare empty arrays", async () => {
      expect(isEqual([], [])).toBe(true);
      expect(isEqual([], [1])).toBe(false);
    });

    it("should compare simple arrays", async () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false); // Order matters for arrays
      expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("should compare nested structures", async () => {
      const obj1 = {
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const obj2 = {
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const obj3 = {
        nested: {
          value: 42,
          array: [1, 2, 4], // Different array element
        },
      };

      expect(isEqual(obj1, obj2)).toBe(true);
      expect(isEqual(obj1, obj3)).toBe(false);
    });
  });

  describe("Dates", () => {
    it("should compare Date objects", async () => {
      const date1 = new Date("2023-01-01T00:00:00.000Z");
      const date2 = new Date("2023-01-01T00:00:00.000Z");
      const date3 = new Date("2023-01-02T00:00:00.000Z");

      expect(isEqual(date1, date2)).toBe(true);
      expect(isEqual(date1, date3)).toBe(false);
    });
  });

  describe("RegExp", () => {
    it("should compare RegExp objects", async () => {
      const regex1 = /test/gi;
      const regex2 = /test/gi;
      const regex3 = /test/g; // Different flags
      const regex4 = /different/gi; // Different pattern

      expect(isEqual(regex1, regex2)).toBe(true);
      expect(isEqual(regex1, regex3)).toBe(false);
      expect(isEqual(regex1, regex4)).toBe(false);
    });

    it("should compare complex RegExp", async () => {
      const email1 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const email2 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const email3 = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // No 'i' flag

      expect(isEqual(email1, email2)).toBe(true);
      expect(isEqual(email1, email3)).toBe(false);
    });
  });

  describe("Maps and Sets", () => {
    it("should compare empty Maps", async () => {
      expect(isEqual(new Map(), new Map())).toBe(true);
      expect(isEqual(new Map(), new Map([["a", 1]]))).toBe(false);
    });

    it("should compare empty Sets", async () => {
      expect(isEqual(new Set(), new Set())).toBe(true);
      expect(isEqual(new Set(), new Set([1]))).toBe(false);
    });

    it("should compare nested Maps and Sets", async () => {
      const complex1 = new Map<unknown, unknown>([
        ["set", new Set([1, 2])],
        ["map", new Map([["inner", "value"]])],
      ]);
      const complex2 = new Map<unknown, unknown>([
        ["set", new Set([1, 2])],
        ["map", new Map([["inner", "value"]])],
      ]);
      const complex3 = new Map<unknown, unknown>([
        ["set", new Set([1, 3])], // Different Set value
        ["map", new Map([["inner", "value"]])],
      ]);

      expect(isEqual(complex1, complex2)).toBe(true);
      expect(isEqual(complex1, complex3)).toBe(false);
    });
  });

  describe("ArrayBuffer and TypedArrays", () => {
    it("should compare ArrayBuffers", async () => {
      const buffer1 = new ArrayBuffer(8);
      const buffer2 = new ArrayBuffer(8);
      const buffer3 = new ArrayBuffer(16); // Different size

      const view1 = new Uint8Array(buffer1);
      const view2 = new Uint8Array(buffer2);
      view1[0] = 42;
      view2[0] = 42;

      expect(isEqual(buffer1, buffer2)).toBe(true);
      expect(isEqual(buffer1, buffer3)).toBe(false);

      // Change one byte
      view2[0] = 43;
      expect(isEqual(buffer1, buffer2)).toBe(false);
    });

    it("should compare Uint8Arrays", async () => {
      const arr1 = new Uint8Array([1, 2, 3, 4]);
      const arr2 = new Uint8Array([1, 2, 3, 4]);
      const arr3 = new Uint8Array([1, 2, 3, 5]); // Different value
      const arr4 = new Uint8Array([1, 2, 3]); // Different length

      expect(isEqual(arr1, arr2)).toBe(true);
      expect(isEqual(arr1, arr3)).toBe(false);
      expect(isEqual(arr1, arr4)).toBe(false);
    });

    it("should compare different TypedArray types", async () => {
      const uint8 = new Uint8Array([1, 2, 3]);
      const int8 = new Int8Array([1, 2, 3]);
      const uint16 = new Uint16Array([1, 2, 3]);

      // Different types should not be equal even with same values
      expect(isEqual(uint8, int8)).toBe(false);
      expect(isEqual(uint8, uint16)).toBe(false);
    });

    it("should compare DataViews", async () => {
      const buffer1 = new ArrayBuffer(8);
      const buffer2 = new ArrayBuffer(8);
      const view1 = new DataView(buffer1);
      const view2 = new DataView(buffer2);

      view1.setInt32(0, 42);
      view2.setInt32(0, 42);

      expect(isEqual(view1, view2)).toBe(true);

      view2.setInt32(0, 43);
      expect(isEqual(view1, view2)).toBe(false);
    });
  });

  describe("Circular references", () => {
    it("should compare simple circular references", async () => {
      const obj1: any = { name: "test" };
      obj1.self = obj1;

      const obj2: any = { name: "test" };
      obj2.self = obj2;

      const obj3: any = { name: "different" };
      obj3.self = obj3;

      expect(isEqual(obj1, obj2)).toBe(true);
      expect(isEqual(obj1, obj3)).toBe(false);
    });

    it("should compare complex circular references", async () => {
      const obj1a: any = { name: "obj1" };
      const obj1b: any = { name: "obj2" };
      obj1a.ref = obj1b;
      obj1b.ref = obj1a;

      const obj2a: any = { name: "obj1" };
      const obj2b: any = { name: "obj2" };
      obj2a.ref = obj2b;
      obj2b.ref = obj2a;

      const obj3a: any = { name: "obj1" };
      const obj3b: any = { name: "different" }; // Different name
      obj3a.ref = obj3b;
      obj3b.ref = obj3a;

      const container1 = { obj1: obj1a, obj2: obj1b };
      const container2 = { obj1: obj2a, obj2: obj2b };
      const container3 = { obj1: obj3a, obj2: obj3b };

      expect(isEqual(container1, container2)).toBe(true);
      expect(isEqual(container1, container3)).toBe(false);
    });

    it("should compare self-referencing arrays", async () => {
      const arr1: any[] = [1, 2, 3];
      arr1.push(arr1);

      const arr2: any[] = [1, 2, 3];
      arr2.push(arr2);

      const arr3: any[] = [1, 2, 4]; // Different value
      arr3.push(arr3);

      expect(isEqual(arr1, arr2)).toBe(true);
      expect(isEqual(arr1, arr3)).toBe(false);
    });
  });

  describe("Mixed type comparisons", () => {
    it("should compare different types", async () => {
      expect(isEqual(42, "42")).toBe(false);
      expect(isEqual(true, 1)).toBe(false);
      expect(isEqual([], {})).toBe(false);
      expect(isEqual(new Date(), /test/)).toBe(false);
      expect(isEqual(new Map(), new Set())).toBe(false);
    });
  });

  describe("Complex mixed structures", () => {
    it("should compare complex mixed data structures", async () => {
      const complex1 = {
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
        array: [
          null,
          undefined,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NaN,
        ],
      };

      const complex2 = {
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
        array: [
          null,
          undefined,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NaN,
        ],
      };

      const complex3 = {
        ...complex1,
        date: new Date("2023-01-02"), // Different date
      };

      expect(isEqual(complex1, complex2)).toBe(true);
      expect(isEqual(complex1, complex3)).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle deeply nested structures", async () => {
      const deep1 = { level1: { level2: { level3: { value: "deep" } } } };
      const deep2 = { level1: { level2: { level3: { value: "deep" } } } };
      const deep3 = { level1: { level2: { level3: { value: "different" } } } };

      expect(isEqual(deep1, deep2)).toBe(true);
      expect(isEqual(deep1, deep3)).toBe(false);
    });

    it("should handle objects with prototype methods", async () => {
      class WithMethods {
        constructor(public value: string) {}

        getValue() {
          return this.value;
        }

        static create(value: string) {
          return new WithMethods(value);
        }
      }

      const obj1 = new WithMethods("test");
      const obj2 = new WithMethods("test");
      const obj3 = new WithMethods("different");

      expect(isEqual(obj1, obj2)).toBe(true);
      expect(isEqual(obj1, obj3)).toBe(false);
    });

    it("should handle objects with non-enumerable properties", async () => {
      const obj1 = { visible: "yes" };
      const obj2 = { visible: "yes" };

      Object.defineProperty(obj1, "hidden", {
        value: "secret",
        enumerable: false,
      });

      Object.defineProperty(obj2, "hidden", {
        value: "secret",
        enumerable: false,
      });

      // Should be equal since DSON typically handles enumerable properties
      expect(isEqual(obj1, obj2)).toBe(true);
    });
  });

  describe("Performance considerations", () => {
    it("should handle large structures efficiently", async () => {
      const large1 = {
        array: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: i * 2,
        })),
        map: new Map(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, { data: i }]),
        ),
        set: new Set(Array.from({ length: 100 }, (_, i) => ({ id: i }))),
      };

      const large2 = {
        array: Array.from({ length: 1000 }, (_, i) => ({
          index: i,
          value: i * 2,
        })),
        map: new Map(
          Array.from({ length: 100 }, (_, i) => [`key${i}`, { data: i }]),
        ),
        set: new Set(Array.from({ length: 100 }, (_, i) => ({ id: i }))),
      };

      const start = Date.now();
      const result = isEqual(large1, large2);
      const duration = Date.now() - start;

      expect(result).toBe(true);
      // Should complete in reasonable time (less than 2 seconds)
      expect(duration).toBeLessThan(2000);
    });
  });
});
