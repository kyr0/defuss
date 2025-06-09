/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { clone } from "./clone.js";

describe("clone", () => {
  describe("Primitive types", () => {
    it("should clone null", async () => {
      expect(await clone(null)).toBe(null);
    });

    it("should clone undefined", async () => {
      expect(await clone(undefined)).toBe(undefined);
    });

    it("should clone booleans", async () => {
      expect(await clone(true)).toBe(true);
      expect(await clone(false)).toBe(false);
    });

    it("should clone numbers", async () => {
      expect(await clone(42)).toBe(42);
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      expect(await clone(3.14159)).toBe(3.14159);
      expect(await clone(0)).toBe(0);
      expect(await clone(-42)).toBe(-42);
      expect(await clone(Number.POSITIVE_INFINITY)).toBe(
        Number.POSITIVE_INFINITY,
      );
      expect(await clone(Number.NEGATIVE_INFINITY)).toBe(
        Number.NEGATIVE_INFINITY,
      );
      expect(Number.isNaN(await clone(Number.NaN))).toBe(true);
    });

    it("should clone strings", async () => {
      expect(await clone("")).toBe("");
      expect(await clone("hello")).toBe("hello");
      expect(await clone('hello "world"')).toBe('hello "world"');
    });

    it("should clone bigint", async () => {
      expect(await clone(BigInt(123))).toBe(BigInt(123));
      expect(await clone(BigInt("9007199254740991"))).toBe(
        BigInt("9007199254740991"),
      );
    });
  });

  describe("Basic objects and arrays", () => {
    it("should clone empty object", async () => {
      const obj = {};
      const cloned = await clone(obj);
      expect(cloned).toEqual({});
      expect(cloned).not.toBe(obj);
    });

    it("should clone simple object", async () => {
      const obj = { a: 1, b: "hello" };
      const cloned = await clone(obj);
      expect(cloned).toEqual({ a: 1, b: "hello" });
      expect(cloned).not.toBe(obj);
    });

    it("should clone empty array", async () => {
      const arr: any[] = [];
      const cloned = await clone(arr);
      expect(cloned).toEqual([]);
      expect(cloned).not.toBe(arr);
    });

    it("should clone simple array", async () => {
      const arr = [1, "hello", true];
      const cloned = await clone(arr);
      expect(cloned).toEqual([1, "hello", true]);
      expect(cloned).not.toBe(arr);
    });

    it("should clone nested objects", async () => {
      const obj = {
        nested: {
          value: 42,
          array: [1, 2, 3],
        },
      };
      const cloned = await clone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.nested).not.toBe(obj.nested);
      expect(cloned.nested.array).not.toBe(obj.nested.array);
    });
  });

  describe("Dates", () => {
    it("should clone Date objects", async () => {
      const date = new Date("2023-01-01T00:00:00.000Z");
      const cloned = await clone(date);

      expect(cloned).toBeInstanceOf(Date);
      expect(cloned.getTime()).toBe(date.getTime());
      expect(cloned).not.toBe(date);
    });

    it("should clone invalid Date", async () => {
      const invalidDate = new Date("invalid");
      const cloned = await clone(invalidDate);

      expect(cloned).toBeInstanceOf(Date);
      expect(Number.isNaN(cloned.getTime())).toBe(true);
      expect(cloned).not.toBe(invalidDate);
    });
  });

  describe("RegExp", () => {
    it("should clone RegExp objects", async () => {
      const regex = /test/gi;
      const cloned = await clone(regex);

      expect(cloned).toBeInstanceOf(RegExp);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
      expect(cloned).not.toBe(regex);
    });

    it("should clone complex RegExp", async () => {
      const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i;
      const cloned = await clone(regex);

      expect(cloned).toBeInstanceOf(RegExp);
      expect(cloned.source).toBe(regex.source);
      expect(cloned.flags).toBe(regex.flags);
      expect(cloned).not.toBe(regex);
    });
  });

  describe("Maps and Sets", () => {
    it("should clone empty Map", async () => {
      const map = new Map();
      const cloned = await clone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.size).toBe(0);
      expect(cloned).not.toBe(map);
    });

    it("should clone Map with entries", async () => {
      const map = new Map<unknown, unknown>([
        ["key1", "value1"],
        ["key2", 42],
        [3, "number key"],
      ]);
      const cloned = await clone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.size).toBe(3);
      expect(cloned.get("key1")).toBe("value1");
      expect(cloned.get("key2")).toBe(42);
      expect(cloned.get(3)).toBe("number key");
      expect(cloned).not.toBe(map);
    });

    it("should clone empty Set", async () => {
      const set = new Set();
      const cloned = await clone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned.size).toBe(0);
      expect(cloned).not.toBe(set);
    });

    it("should clone Set with values", async () => {
      const set = new Set([1, "hello", true, null]);
      const cloned = await clone(set);

      expect(cloned).toBeInstanceOf(Set);
      expect(cloned.size).toBe(4);
      expect(cloned.has(1)).toBe(true);
      expect(cloned.has("hello")).toBe(true);
      expect(cloned.has(true)).toBe(true);
      expect(cloned.has(null)).toBe(true);
      expect(cloned).not.toBe(set);
    });

    it("should clone nested Maps and Sets", async () => {
      const map = new Map<unknown, unknown>([
        ["set", new Set([1, 2])],
        ["nested", new Map([["inner", "value"]])],
      ]);
      const cloned = await clone(map);

      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.get("set")).toBeInstanceOf(Set);
      expect(cloned.get("nested")).toBeInstanceOf(Map);
      expect(
        (cloned.get("nested") as unknown as Map<string, string>).get("inner"),
      ).toBe("value");
      expect(cloned).not.toBe(map);
      expect(cloned.get("set")).not.toBe(map.get("set"));
      expect(cloned.get("nested")).not.toBe(map.get("nested"));
    });
  });

  describe("ArrayBuffer and TypedArrays", () => {
    it("should clone ArrayBuffer", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'

      const cloned = await clone(buffer);

      expect(cloned).toBeInstanceOf(ArrayBuffer);
      expect(cloned.byteLength).toBe(8);
      expect(cloned).not.toBe(buffer);

      const clonedView = new Uint8Array(cloned);
      expect(clonedView[0]).toBe(72);
      expect(clonedView[1]).toBe(101);
    });

    it("should clone Uint8Array", async () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const cloned = await clone(arr);

      expect(cloned).toBeInstanceOf(Uint8Array);
      expect(cloned.length).toBe(5);
      expect(Array.from(cloned)).toEqual([72, 101, 108, 108, 111]);
      expect(cloned).not.toBe(arr);
    });

    it("should clone Int32Array", async () => {
      const arr = new Int32Array([1, -1, 2147483647, -2147483648]);
      const cloned = await clone(arr);

      expect(cloned).toBeInstanceOf(Int32Array);
      expect(cloned.length).toBe(4);
      expect(Array.from(cloned)).toEqual([1, -1, 2147483647, -2147483648]);
      expect(cloned).not.toBe(arr);
    });

    it("should clone Float32Array", async () => {
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      const arr = new Float32Array([1.5, -2.5, 3.14159]);
      const cloned = await clone(arr);

      expect(cloned).toBeInstanceOf(Float32Array);
      expect(cloned.length).toBe(3);
      expect(cloned[0]).toBeCloseTo(1.5);
      expect(cloned[1]).toBeCloseTo(-2.5);
      // biome-ignore lint/suspicious/noApproximativeNumericConstant: <explanation>
      expect(cloned[2]).toBeCloseTo(3.14159);
      expect(cloned).not.toBe(arr);
    });

    it("should clone DataView", async () => {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      view.setInt32(0, 42);

      const cloned = await clone(view);

      expect(cloned).toBeInstanceOf(DataView);
      expect(cloned.byteLength).toBe(8);
      expect(cloned.getInt32(0)).toBe(42);
      expect(cloned).not.toBe(view);
    });
  });

  describe("Custom classes", () => {
    class TestClass {
      constructor(public value: string) {}

      toString() {
        return `TestClass(${this.value})`;
      }

      getValue() {
        return this.value;
      }
    }

    it("should clone custom class instances", async () => {
      const instance = new TestClass("test");
      const cloned = await clone(instance);

      expect(cloned).toBeInstanceOf(TestClass);
      expect(cloned.value).toBe("test");
      expect(cloned.getValue()).toBe("test");
      expect(cloned).not.toBe(instance);
    });

    it("should handle class inheritance", async () => {
      class BaseClass {
        constructor(public base: string) {}
        getBase() {
          return this.base;
        }
      }

      class DerivedClass extends BaseClass {
        constructor(
          base: string,
          public derived: string,
        ) {
          super(base);
        }
        getDerived() {
          return this.derived;
        }
      }

      const instance = new DerivedClass("base", "derived");
      const cloned = await clone(instance);

      expect(cloned).toBeInstanceOf(DerivedClass);
      expect(cloned).toBeInstanceOf(BaseClass);
      expect(cloned.base).toBe("base");
      expect(cloned.derived).toBe("derived");
      expect(cloned.getBase()).toBe("base");
      expect(cloned.getDerived()).toBe("derived");
      expect(cloned).not.toBe(instance);
    });

    it("should clone objects with complex class hierarchies", async () => {
      class Person {
        constructor(
          public name: string,
          public age: number,
        ) {}
        greet() {
          return `Hello, I'm ${this.name}`;
        }
      }

      class Employee extends Person {
        constructor(
          name: string,
          age: number,
          public department: string,
        ) {
          super(name, age);
        }
        work() {
          return `${this.name} works in ${this.department}`;
        }
      }

      const data = {
        employees: [
          new Employee("Alice", 30, "Engineering"),
          new Employee("Bob", 25, "Marketing"),
        ],
        manager: new Employee("Charlie", 35, "Management"),
      };

      const cloned = await clone(data);

      expect(cloned).not.toBe(data);
      expect(cloned.employees).not.toBe(data.employees);
      expect(cloned.employees[0]).toBeInstanceOf(Employee);
      expect(cloned.employees[0]).not.toBe(data.employees[0]);
      expect(cloned.employees[0].greet()).toBe("Hello, I'm Alice");
      expect(cloned.employees[0].work()).toBe("Alice works in Engineering");
      expect(cloned.manager).toBeInstanceOf(Employee);
      expect(cloned.manager.name).toBe("Charlie");
    });
  });

  describe("Circular references", () => {
    it("should clone simple circular references", async () => {
      const obj: any = { name: "test" };
      obj.self = obj;

      const cloned = await clone(obj);

      expect(cloned.name).toBe("test");
      expect(cloned.self).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it("should handle deeply nested circular references", async () => {
      const obj: any = {
        level1: {
          level2: {
            level3: null as any,
          },
        },
      };
      obj.level1.level2.level3 = obj;

      const cloned = await clone(obj);

      expect(cloned).not.toBe(obj);
      expect(cloned.level1.level2.level3).toBe(cloned);
    });
  });

  describe("Mixed complex structures", () => {
    it("should clone complex mixed data structures", async () => {
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
        array: [
          null,
          undefined,
          Number.POSITIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NaN,
        ],
      };

      const cloned = await clone(complex);

      expect(cloned).not.toBe(complex);
      expect(cloned.date).toBeInstanceOf(Date);
      expect(cloned.date).not.toBe(complex.date);
      expect(cloned.regex).toBeInstanceOf(RegExp);
      expect(cloned.regex).not.toBe(complex.regex);
      expect(cloned.map).toBeInstanceOf(Map);
      expect(cloned.map).not.toBe(complex.map);
      expect(cloned.set).toBeInstanceOf(Set);
      expect(cloned.set).not.toBe(complex.set);
      expect(cloned.buffer).toBeInstanceOf(Uint8Array);
      expect(cloned.buffer).not.toBe(complex.buffer);
      expect(typeof cloned.nested.symbol).toBe("symbol");
      expect(typeof cloned.nested.bigint).toBe("bigint");
      expect(typeof cloned.nested.fn).toBe("function");
      expect(cloned.array[0]).toBe(null);
      expect(cloned.array[1]).toBe(undefined);
      expect(cloned.array[2]).toBe(Number.POSITIVE_INFINITY);
      expect(cloned.array[3]).toBe(Number.NEGATIVE_INFINITY);
      expect(Number.isNaN(cloned.array[4])).toBe(true);
    });
  });

  describe("Performance and edge cases", () => {
    it("should handle large objects efficiently", async () => {
      const large = {
        array: Array.from({ length: 1000 }, (_, i) => i),
        map: new Map(Array.from({ length: 100 }, (_, i) => [`key${i}`, i])),
        set: new Set(Array.from({ length: 100 }, (_, i) => i)),
      };

      const start = Date.now();
      const cloned = await clone(large);
      const duration = Date.now() - start;

      expect(cloned).not.toBe(large);
      expect(cloned.array.length).toBe(1000);
      expect(cloned.map.size).toBe(100);
      expect(cloned.set.size).toBe(100);

      // Should complete in reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it("should handle objects with many circular references", async () => {
      // Create a simpler circular reference structure to avoid infinite loops
      const node1: any = { id: 1, refs: [] };
      const node2: any = { id: 2, refs: [] };
      const node3: any = { id: 3, refs: [] };

      // Create a triangle of references
      node1.refs.push(node2);
      node2.refs.push(node3);
      node3.refs.push(node1);

      const nodes = [node1, node2, node3];
      const cloned = await clone(nodes);

      expect(cloned).not.toBe(nodes);
      expect(cloned.length).toBe(3);

      // Verify structure is maintained
      expect(cloned[0].id).toBe(1);
      expect(cloned[1].id).toBe(2);
      expect(cloned[2].id).toBe(3);

      // Verify circular references work
      expect(cloned[0].refs[0]).toBe(cloned[1]);
      expect(cloned[1].refs[0]).toBe(cloned[2]);
      expect(cloned[2].refs[0]).toBe(cloned[0]);
    });
  });
});
