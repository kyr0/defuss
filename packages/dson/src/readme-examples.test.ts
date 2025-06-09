/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { DSON } from "./index.js";

describe("README Examples", () => {
  describe("JSON-Compatible Synchronous API", () => {
    it("should work like JSON with additional utilities", () => {
      // Synchronous API - works like JSON
      const data = new Map([["key", "value"]]);
      const serialized = DSON.stringify(data);
      const parsed = DSON.parse(serialized);

      // Verify the Map is properly parsed
      expect(parsed).toBeInstanceOf(Map);
      expect(parsed.get("key")).toBe("value");

      // Additional utilities
      const isEqual = DSON.isEqual(data, parsed);
      expect(isEqual).toBe(true);

      const cloned = DSON.clone(data);
      expect(cloned).toBeInstanceOf(Map);
      expect(cloned.get("key")).toBe("value");
      expect(cloned).not.toBe(data); // Different instance
    });
  });

  describe("Basic Data Types", () => {
    it("should handle Dates correctly", () => {
      // Dates
      const date = new Date();
      const serialized = DSON.stringify(date);
      const parsed = DSON.parse(serialized);

      expect(parsed instanceof Date).toBe(true);
      expect(parsed.getTime()).toBe(date.getTime());
    });

    it("should handle RegExp correctly", () => {
      // RegExp
      const regex = /test/gi;
      const serializedRegex = DSON.stringify(regex);
      const parsedRegex = DSON.parse(serializedRegex);

      expect(parsedRegex instanceof RegExp).toBe(true);
      expect(parsedRegex.source).toBe("test");
      expect(parsedRegex.flags).toBe("gi");
    });

    it("should handle Maps and Sets correctly", () => {
      // Maps and Sets
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const set = new Set([1, 2, 3]);
      const data = { map, set };

      const serialized = DSON.stringify(data);
      const parsed = DSON.parse(serialized);

      expect(parsed.map instanceof Map).toBe(true);
      expect(parsed.set instanceof Set).toBe(true);

      // Verify Map contents
      expect(parsed.map.get("a")).toBe(1);
      expect(parsed.map.get("b")).toBe(2);
      expect(parsed.map.size).toBe(2);

      // Verify Set contents
      expect(parsed.set.has(1)).toBe(true);
      expect(parsed.set.has(2)).toBe(true);
      expect(parsed.set.has(3)).toBe(true);
      expect(parsed.set.size).toBe(3);
    });
  });

  describe("Circular References", () => {
    it("should handle circular references correctly", () => {
      const obj: any = { name: "parent" };
      obj.self = obj; // circular reference

      const serialized = DSON.stringify(obj);
      const parsed = DSON.parse(serialized);

      expect(parsed.self === parsed).toBe(true);
      expect(parsed.name).toBe("parent");
      expect(parsed.self.name).toBe("parent");
    });
  });

  describe("Deep Cloning", () => {
    it("should create deep clones of complex objects", () => {
      const complex = {
        date: new Date(),
        map: new Map([["key", "value"]]),
        nested: {
          array: [1, 2, { deep: true }],
        },
      };

      // Note: README shows `await clone(complex)` but clone is actually synchronous
      const cloned = DSON.clone(complex);

      expect(DSON.isEqual(complex, cloned)).toBe(true);
      expect(complex !== cloned).toBe(true); // Different object

      // Verify deep cloning - nested objects should be different instances
      expect(complex.date !== cloned.date).toBe(true);
      expect(complex.map !== cloned.map).toBe(true);
      expect(complex.nested !== cloned.nested).toBe(true);
      expect(complex.nested.array !== cloned.nested.array).toBe(true);
      expect(complex.nested.array[2] !== cloned.nested.array[2]).toBe(true);

      // But values should be equal
      expect(complex.date.getTime()).toBe(cloned.date.getTime());
      expect(cloned.map.get("key")).toBe("value");
      expect(cloned.nested.array[0]).toBe(1);
      expect(cloned.nested.array[1]).toBe(2);
      expect(cloned.nested.array[2].deep).toBe(true);
    });
  });

  describe("Equality Comparison", () => {
    it("should correctly compare objects with same content but different instances", () => {
      const obj1 = {
        date: new Date("2023-01-01"),
        map: new Map([["a", 1]]),
        set: new Set([1, 2, 3]),
      };

      const obj2 = {
        date: new Date("2023-01-01"),
        map: new Map([["a", 1]]),
        set: new Set([1, 2, 3]),
      };

      expect(DSON.isEqual(obj1, obj2)).toBe(true);
      expect(obj1 === obj2).toBe(false);

      // Verify individual components are also equal
      expect(DSON.isEqual(obj1.date, obj2.date)).toBe(true);
      expect(DSON.isEqual(obj1.map, obj2.map)).toBe(true);
      expect(DSON.isEqual(obj1.set, obj2.set)).toBe(true);
    });
  });

  describe("Additional README verification", () => {
    it("should verify DSON is a superset of JSON", () => {
      // Test that valid JSON works with DSON
      const jsonData = {
        string: "hello",
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: "value" },
      };

      const serialized = DSON.stringify(jsonData);
      const parsed = DSON.parse(serialized);

      expect(DSON.isEqual(jsonData, parsed)).toBe(true);

      // Should also work with regular JSON
      const jsonParsed = JSON.parse(JSON.stringify(jsonData));
      expect(DSON.isEqual(jsonData, jsonParsed)).toBe(true);
    });

    it("should handle undefined values (converts to null in JSON mode)", () => {
      const dataWithUndefined = {
        defined: "value",
        undefined: undefined,
      };

      const serialized = DSON.stringify(dataWithUndefined);
      const parsed = DSON.parse(serialized);

      expect(parsed.defined).toBe("value");
      // Note: DSON.stringify uses JSON-compatible mode which converts undefined to null
      // This is different from JSON.stringify which removes undefined properties entirely
      expect(parsed.undefined).toBe(null);
      expect(Object.prototype.hasOwnProperty.call(parsed, "undefined")).toBe(
        true,
      );

      expect(DSON.isEqual(dataWithUndefined, parsed)).toBe(true);
    });

    it("should show difference between JSON and DSON undefined handling", () => {
      const dataWithUndefined = {
        defined: "value",
        undefined: undefined,
      };

      // Standard JSON removes undefined properties
      const jsonSerialized = JSON.stringify(dataWithUndefined);
      const jsonParsed = JSON.parse(jsonSerialized);
      expect(
        Object.prototype.hasOwnProperty.call(jsonParsed, "undefined"),
      ).toBe(false);

      // DSON preserves the property but converts undefined to null
      const dsonSerialized = DSON.stringify(dataWithUndefined);
      const dsonParsed = DSON.parse(dsonSerialized);
      expect(
        Object.prototype.hasOwnProperty.call(dsonParsed, "undefined"),
      ).toBe(true);
      expect(dsonParsed.undefined).toBe(null);
    });

    it("should handle BigInt values", () => {
      const bigIntData = {
        small: 42,
        large: BigInt("12345678901234567890"),
      };

      const serialized = DSON.stringify(bigIntData);
      const parsed = DSON.parse(serialized);

      expect(parsed.small).toBe(42);
      expect(parsed.large).toBe(BigInt("12345678901234567890"));
      expect(typeof parsed.large).toBe("bigint");
      expect(DSON.isEqual(bigIntData, parsed)).toBe(true);
    });
  });
});
