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

  describe("String object deserialization", () => {
    it("should deserialize String objects", async () => {
      const stringObjects = [
        Object("hello"),
        new String("world"),
        Object(""),
        new String("with spaces and symbols !@#$%"),
      ];

      for (const originalString of stringObjects) {
        const serialized = serialize(originalString);
        const deserialized = deserialize(serialized);

        expect(typeof deserialized).toBe("object");
        expect(deserialized).toBeInstanceOf(String);
        expect(deserialized.valueOf()).toBe(originalString.valueOf());
        expect(deserialized.toString()).toBe(originalString.toString());
      }
    });

    it("should handle String objects with additional properties", async () => {
      const stringObj = new String("test");
      (stringObj as any).customProp = "custom value";
      (stringObj as any).number = 42;

      const serialized = serialize(stringObj);
      const deserialized = deserialize(serialized);

      expect(typeof deserialized).toBe("object");
      expect(deserialized).toBeInstanceOf(String);
      expect(deserialized.valueOf()).toBe("test");
      // Note: DSON doesn't preserve custom properties on wrapped primitives
      // This is similar to JSON.stringify behavior with primitive wrappers
      expect((deserialized as any).customProp).toBe(undefined);
      expect((deserialized as any).number).toBe(undefined);
    });
  });

  describe("Additional BigInt primitive tests", () => {
    it("should handle edge case BigInt values", async () => {
      const edgeCases = [
        BigInt(Number.MAX_SAFE_INTEGER),
        BigInt(Number.MIN_SAFE_INTEGER),
        BigInt("0x1fffffffffffff"), // Hex notation
        BigInt("0b11111111111111111111111111111111"), // Binary notation
        BigInt("999999999999999999999999999999999999999999999"),
      ];

      for (const bigint of edgeCases) {
        const serialized = serialize(bigint);
        const deserialized = deserialize(serialized);

        expect(typeof deserialized).toBe("bigint");
        expect(deserialized).toBe(bigint);
      }
    });

    it("should handle BigInt in mixed data structures", async () => {
      const mixed = {
        regularNumber: 123,
        bigIntValue: BigInt("12345678901234567890"),
        wrappedBigInt: Object(BigInt(999)),
        array: [BigInt(1), BigInt(2), BigInt(3)],
        map: new Map<any, any>([
          [BigInt(100), "hundred"],
          ["key", BigInt(200)],
        ]),
        set: new Set([BigInt(300), BigInt(400)]),
      };

      const serialized = serialize(mixed);
      const deserialized = deserialize(serialized);

      expect(deserialized.regularNumber).toBe(123);
      expect(typeof deserialized.bigIntValue).toBe("bigint");
      expect(deserialized.bigIntValue).toBe(BigInt("12345678901234567890"));
      expect(typeof deserialized.wrappedBigInt).toBe("object");
      expect(deserialized.wrappedBigInt.valueOf()).toBe(BigInt(999));

      expect(Array.isArray(deserialized.array)).toBe(true);
      expect(deserialized.array.every((item: any) => typeof item === "bigint")).toBe(true);

      expect(deserialized.map).toBeInstanceOf(Map);
      expect(typeof deserialized.map.get("key")).toBe("bigint");

      expect(deserialized.set).toBeInstanceOf(Set);
      expect(deserialized.set.has(BigInt(300))).toBe(true);
    });
  });

  describe("Fallback serialization case", () => {
    it("should handle objects with message property that don't match specific types", async () => {
      // Create a custom object that has a message property but isn't an Error
      class CustomMessageObject {
        public message: string;
        public customProp: number;

        constructor(message: string, customProp: number) {
          this.message = message;
          this.customProp = customProp;
        }
      }

      const customObj = new CustomMessageObject("test message", 42);
      const serialized = serialize(customObj);
      const deserialized = deserialize(serialized);

      // Should preserve the message and type name
      expect(deserialized.message).toBe("test message");
      expect(deserialized.customProp).toBe(42);
      // The type name should be the class name
      expect(typeof deserialized).toBe("object");
    });

    it("should handle plain objects with message property", async () => {
      const plainObj = {
        message: "I am not an error",
        data: [1, 2, 3],
        nested: { value: "nested" },
        flag: true,
      };

      const serialized = serialize(plainObj);
      const deserialized = deserialize(serialized);

      expect(deserialized.message).toBe("I am not an error");
      expect(deserialized.data).toEqual([1, 2, 3]);
      expect(deserialized.nested.value).toBe("nested");
      expect(deserialized.flag).toBe(true);
    });

    it("should handle objects with message property in complex structures", async () => {
      const complex = {
        errors: [new Error("Real error"), new TypeError("Real type error")],
        fakeErrors: [
          { message: "I look like an error but I'm not", type: "fake" },
          { message: "Another fake", severity: "low" },
        ],
        mixed: {
          realError: new RangeError("Real range error"),
          fakeError: { message: "Fake in nested", id: 123 },
          bigint: BigInt(999),
          string: Object("wrapped string"),
        },
      };

      const serialized = serialize(complex);
      const deserialized = deserialize(serialized);

      // Real errors should be proper Error instances
      expect(deserialized.errors[0]).toBeInstanceOf(Error);
      expect(deserialized.errors[1]).toBeInstanceOf(TypeError);

      // Fake errors should be plain objects
      expect(deserialized.fakeErrors[0]).not.toBeInstanceOf(Error);
      expect(deserialized.fakeErrors[0].message).toBe("I look like an error but I'm not");
      expect(deserialized.fakeErrors[0].type).toBe("fake");
      expect(deserialized.fakeErrors[1].message).toBe("Another fake");
      expect(deserialized.fakeErrors[1].severity).toBe("low");

      // Mixed nested structure
      expect(deserialized.mixed.realError).toBeInstanceOf(RangeError);
      expect(deserialized.mixed.fakeError).not.toBeInstanceOf(Error);
      expect(deserialized.mixed.fakeError.message).toBe("Fake in nested");
      expect(deserialized.mixed.fakeError.id).toBe(123);
      expect(typeof deserialized.mixed.bigint).toBe("bigint");
      expect(deserialized.mixed.string).toBeInstanceOf(String);
    });

    it("should handle null and undefined message properties", async () => {
      const objWithNullMessage = { message: null, data: "test" };
      const objWithUndefinedMessage = { message: undefined, data: "test" };

      const serializedNull = serialize(objWithNullMessage);
      const deserializedNull = deserialize(serializedNull);
      expect(deserializedNull.message).toBe(null);
      expect(deserializedNull.data).toBe("test");

      const serializedUndefined = serialize(objWithUndefinedMessage);
      const deserializedUndefined = deserialize(serializedUndefined);
      expect(deserializedUndefined.message).toBe(undefined);
      expect(deserializedUndefined.data).toBe("test");
    });
  });
});
