/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from "vitest";
import { _base64ToBinary, _binaryToBase64 } from "./base64.js";

describe("base64 utilities", () => {
  describe("_binaryToBase64", () => {
    it("should convert ArrayBuffer to base64", () => {
      const buffer = new ArrayBuffer(4);
      const view = new Uint8Array(buffer);
      view[0] = 72; // 'H'
      view[1] = 101; // 'e'
      view[2] = 108; // 'l'
      view[3] = 108; // 'l'

      const result = _binaryToBase64(buffer);
      expect(typeof result).toBe("string");
      expect(result).toBe("SGVsbA==");
    });

    it("should convert Uint8Array to base64", () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const result = _binaryToBase64(arr);
      expect(typeof result).toBe("string");
      expect(result).toBe("SGVsbG8=");
    });

    it("should convert DataView to base64", () => {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      view.setUint8(0, 72); // 'H'
      view.setUint8(1, 101); // 'e'
      view.setUint8(2, 108); // 'l'
      view.setUint8(3, 108); // 'l'

      const result = _binaryToBase64(view);
      expect(typeof result).toBe("string");
      expect(result).toBe("SGVsbA==");
    });

    it("should handle empty buffers", () => {
      const buffer = new ArrayBuffer(0);
      const result = _binaryToBase64(buffer);
      expect(result).toBe("");
    });

    it("should handle various TypedArrays", () => {
      const testData = [1, 2, 3, 4];

      const int8 = new Int8Array(testData);
      const uint16 = new Uint16Array(testData);
      const int32 = new Int32Array(testData);
      const float32 = new Float32Array([1.5, 2.5]);

      expect(typeof _binaryToBase64(int8)).toBe("string");
      expect(typeof _binaryToBase64(uint16)).toBe("string");
      expect(typeof _binaryToBase64(int32)).toBe("string");
      expect(typeof _binaryToBase64(float32)).toBe("string");
    });
  });

  describe("_base64ToBinary", () => {
    it("should convert base64 back to ArrayBuffer", () => {
      const original = "SGVsbG8="; // "Hello"
      const result = _base64ToBinary(original, "ArrayBuffer");

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(5);

      const view = new Uint8Array(result);
      expect(Array.from(view)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should convert base64 to Uint8Array", () => {
      const original = "SGVsbG8="; // "Hello"
      const result = _base64ToBinary(original, "Uint8Array");

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(5);
      expect(Array.from(result)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should convert base64 to DataView", () => {
      const original = "SGVsbA=="; // "Hell"
      const result = _base64ToBinary(original, "DataView");

      expect(result).toBeInstanceOf(DataView);
      expect(result.byteLength).toBe(4);
      expect(result.getUint8(0)).toBe(72); // 'H'
      expect(result.getUint8(1)).toBe(101); // 'e'
      expect(result.getUint8(2)).toBe(108); // 'l'
      expect(result.getUint8(3)).toBe(108); // 'l'
    });

    it("should handle various TypedArray types", () => {
      const base64 = "AQIDBA=="; // [1, 2, 3, 4]

      const int8 = _base64ToBinary(base64, "Int8Array");
      const uint16 = _base64ToBinary(base64, "Uint16Array");
      const int32 = _base64ToBinary(base64, "Int32Array");
      const float32 = _base64ToBinary(base64, "Float32Array");

      expect(int8).toBeInstanceOf(Int8Array);
      expect(uint16).toBeInstanceOf(Uint16Array);
      expect(int32).toBeInstanceOf(Int32Array);
      expect(float32).toBeInstanceOf(Float32Array);
    });

    it("should handle empty base64 strings", () => {
      const result = _base64ToBinary("", "ArrayBuffer");
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(0);
    });

    it("should handle invalid base64 gracefully", () => {
      expect(() => _base64ToBinary("invalid!@#", "ArrayBuffer")).toThrow();
    });
  });

  describe("round-trip conversion", () => {
    it("should maintain data integrity through round-trip", () => {
      const originalData = [0, 1, 127, 128, 255, 42, 200, 100];
      const buffer = new Uint8Array(originalData);

      const base64 = _binaryToBase64(buffer);
      const restored = _base64ToBinary(base64, "Uint8Array");

      expect(Array.from(restored)).toEqual(originalData);
    });

    it("should handle large buffers", () => {
      const size = 10000;
      const large = new Uint8Array(size);
      for (let i = 0; i < size; i++) {
        large[i] = i % 256;
      }

      const base64 = _binaryToBase64(large);
      const restored = _base64ToBinary(base64, "Uint8Array");

      expect(restored.length).toBe(size);
      expect(Array.from(restored)).toEqual(Array.from(large));
    });

    it("should handle all TypedArray types in round-trip", () => {
      const testCases = [
        { type: "Int8Array", data: [-128, -1, 0, 1, 127] },
        { type: "Uint8Array", data: [0, 1, 127, 128, 255] },
        { type: "Int16Array", data: [-32768, -1, 0, 1, 32767] },
        { type: "Uint16Array", data: [0, 1, 32767, 32768, 65535] },
        { type: "Int32Array", data: [-2147483648, -1, 0, 1, 2147483647] },
        {
          type: "Uint32Array",
          data: [0, 1, 2147483647, 2147483648, 4294967295],
        },
        { type: "Float32Array", data: [-1.5, -0.5, 0, 0.5, 1.5, Math.PI] },
        {
          type: "Float64Array",
          data: [-1.5, -0.5, 0, 0.5, 1.5, Math.PI, Math.E],
        },
      ];

      for (const testCase of testCases) {
        const TypedArrayConstructor = globalThis[
          testCase.type as keyof typeof globalThis
        ] as any;
        const original = new TypedArrayConstructor(testCase.data);

        const base64 = _binaryToBase64(original);
        const restored = _base64ToBinary(base64, testCase.type);

        expect(restored).toBeInstanceOf(TypedArrayConstructor);

        if (testCase.type.includes("Float")) {
          // For floating point, use approximate equality
          for (let i = 0; i < original.length; i++) {
            expect(restored[i]).toBeCloseTo(original[i]);
          }
        } else {
          expect(Array.from(restored)).toEqual(Array.from(original));
        }
      }
    });
  });
});
