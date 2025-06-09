/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { deserialize } from "./deserialize.js";
import { serialize } from "./serialize.js";
import { BIGINT, ERROR } from "./types.d.js";

describe("deserialize", () => {
  describe("Error deserialization", () => {
    it("should deserialize basic Error objects", async () => {
      const error = new Error("Test message");
      const serialized = serialize(error);
      const deserialized = deserialize(serialized);

      expect(deserialized).toBeInstanceOf(Error);
      expect(deserialized.name).toBe("Error");
      expect(deserialized.message).toBe("Test message");
    });

    it("should deserialize different Error types", async () => {
      const errors = [
        new Error("Basic error"),
        new TypeError("Type error"),
        new RangeError("Range error"),
        new ReferenceError("Reference error"),
        new SyntaxError("Syntax error"),
        new URIError("URI error"),
        new EvalError("Eval error"),
      ];

      for (const originalError of errors) {
        const serialized = serialize(originalError);
        const deserialized = deserialize(serialized);

        expect(deserialized).toBeInstanceOf(originalError.constructor);
        expect(deserialized.name).toBe(originalError.name);
        expect(deserialized.message).toBe(originalError.message);
      }
    });

    it("should handle Error objects with empty messages", async () => {
      const emptyError = new Error("");
      const serialized = serialize(emptyError);
      const deserialized = deserialize(serialized);

      expect(deserialized).toBeInstanceOf(Error);
      expect(deserialized.message).toBe("");
    });

    it("should handle Error objects with no message", async () => {
      const noMessageError = new Error();
      const serialized = serialize(noMessageError);
      const deserialized = deserialize(serialized);

      expect(deserialized).toBeInstanceOf(Error);
      expect(deserialized.message).toBe("");
    });

    it("should handle custom Error classes", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      // Custom error classes won't work unless they're in the global scope
      // The deserializer will fall back to a generic Error with the name preserved
      const customError = new CustomError("Custom message");
      const serialized = serialize(customError);
      const deserialized = deserialize(serialized);

      // Should preserve the error structure with fallback behavior
      expect(deserialized).toBeInstanceOf(Error);
      expect(deserialized.name).toBe("CustomError");
      expect(deserialized.message).toBe("Custom message");
    });
  });

  describe("BigInt deserialization", () => {
    it("should deserialize primitive BigInt values", async () => {
      const bigints = [
        BigInt(0),
        BigInt(123),
        BigInt(-456),
        BigInt("9007199254740991"),
        BigInt("-9007199254740991"),
      ];

      for (const originalBigInt of bigints) {
        const serialized = serialize(originalBigInt);
        const deserialized = deserialize(serialized);

        expect(typeof deserialized).toBe("bigint");
        expect(deserialized).toBe(originalBigInt);
      }
    });

    it("should deserialize wrapped BigInt objects", async () => {
      const wrappedBigInts = [
        Object(BigInt(0)),
        Object(BigInt(123)),
        Object(BigInt(-456)),
        Object(BigInt("9007199254740991")),
      ];

      for (const originalWrapped of wrappedBigInts) {
        const serialized = serialize(originalWrapped);
        const deserialized = deserialize(serialized);

        expect(typeof deserialized).toBe("object");
        expect(deserialized).toBeInstanceOf(Object);
        expect(deserialized.valueOf()).toBe(originalWrapped.valueOf());
      }
    });

    it("should handle very large BigInt values", async () => {
      const largeBigInt = BigInt("123456789012345678901234567890");
      const serialized = serialize(largeBigInt);
      const deserialized = deserialize(serialized);

      expect(typeof deserialized).toBe("bigint");
      expect(deserialized).toBe(largeBigInt);
    });
  });

  describe("Complex structures with Error and BigInt", () => {
    it("should handle objects containing both Error and BigInt", async () => {
      const complex = {
        error: new TypeError("Something went wrong"),
        bigint: BigInt("12345678901234567890"),
        wrappedBigint: Object(BigInt(999)),
        nested: {
          anotherError: new RangeError("Out of bounds"),
          negativeBigint: BigInt(-123),
        },
      };

      const serialized = serialize(complex);
      const deserialized = deserialize(serialized);

      // Check error
      expect(deserialized.error).toBeInstanceOf(TypeError);
      expect(deserialized.error.message).toBe("Something went wrong");

      // Check bigint
      expect(typeof deserialized.bigint).toBe("bigint");
      expect(deserialized.bigint).toBe(BigInt("12345678901234567890"));

      // Check wrapped bigint
      expect(typeof deserialized.wrappedBigint).toBe("object");
      expect(deserialized.wrappedBigint.valueOf()).toBe(BigInt(999));

      // Check nested error
      expect(deserialized.nested.anotherError).toBeInstanceOf(RangeError);
      expect(deserialized.nested.anotherError.message).toBe("Out of bounds");

      // Check nested bigint
      expect(typeof deserialized.nested.negativeBigint).toBe("bigint");
      expect(deserialized.nested.negativeBigint).toBe(BigInt(-123));
    });

    it("should handle arrays containing Error and BigInt", async () => {
      const arrayWithMixed = [
        new Error("Array error"),
        BigInt(123),
        Object(BigInt(456)),
        new TypeError("Array type error"),
        "normal string",
        789,
      ];

      const serialized = serialize(arrayWithMixed);
      const deserialized = deserialize(serialized);

      expect(Array.isArray(deserialized)).toBe(true);
      expect(deserialized).toHaveLength(6);

      // Check error
      expect(deserialized[0]).toBeInstanceOf(Error);
      expect(deserialized[0].message).toBe("Array error");

      // Check primitive bigint
      expect(typeof deserialized[1]).toBe("bigint");
      expect(deserialized[1]).toBe(BigInt(123));

      // Check wrapped bigint
      expect(typeof deserialized[2]).toBe("object");
      expect(deserialized[2].valueOf()).toBe(BigInt(456));

      // Check type error
      expect(deserialized[3]).toBeInstanceOf(TypeError);
      expect(deserialized[3].message).toBe("Array type error");

      // Check normal values
      expect(deserialized[4]).toBe("normal string");
      expect(deserialized[5]).toBe(789);
    });

    it("should handle circular references with Error and BigInt", async () => {
      const obj: any = {
        error: new Error("Circular error"),
        bigint: BigInt(999),
      };
      obj.self = obj;
      // Note: Adding properties to Error objects can be tricky,
      // so we'll test circular references in the main object instead
      obj.nested = { parent: obj };

      const serialized = serialize(obj);
      const deserialized = deserialize(serialized);

      // Check basic properties
      expect(deserialized.error).toBeInstanceOf(Error);
      expect(deserialized.error.message).toBe("Circular error");
      expect(typeof deserialized.bigint).toBe("bigint");
      expect(deserialized.bigint).toBe(BigInt(999));

      // Check circular references
      expect(deserialized.self).toBe(deserialized);
      expect(deserialized.nested.parent).toBe(deserialized);
    });
  });
});
