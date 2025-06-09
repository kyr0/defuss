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

    it("should handle empty buffers", () => {
      const buffer = new ArrayBuffer(0);
      const result = _binaryToBase64(buffer);
      expect(result).toBe("");
    });
  });

  describe("_base64ToBinary", () => {
    it("should convert base64 back to ArrayBuffer", () => {
      const original = "SGVsbG8="; // "Hello"
      const result = _base64ToBinary(original);

      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(5);

      const view = new Uint8Array(result);
      expect(Array.from(view)).toEqual([72, 101, 108, 108, 111]);
    });

    it("should handle empty base64 strings", () => {
      const result = _base64ToBinary("");
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(0);
    });
  });
});
