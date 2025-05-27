import {
  binaryToBase64,
  base64ToBinary,
  _BASE64_CHARS,
  _getBase64LookupMap,
} from "./base64.js";
import { _HEX_PREFIX } from "./binary.js";

describe("_BASE64_CHARS", () => {
  it("should contain all valid base64 characters", () => {
    expect(_BASE64_CHARS).toBe(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
    );
    expect(_BASE64_CHARS).toHaveLength(64);
  });
});

describe("_getBase64LookupMap", () => {
  it("should create a lookup map for base64 characters", () => {
    const map = _getBase64LookupMap();
    expect(map.A).toBe(0);
    expect(map.B).toBe(1);
    expect(map.Z).toBe(25);
    expect(map.a).toBe(26);
    expect(map.z).toBe(51);
    expect(map["0"]).toBe(52);
    expect(map["9"]).toBe(61);
    expect(map["+"]).toBe(62);
    expect(map["/"]).toBe(63);
  });

  it("should cache the lookup map", () => {
    const map1 = _getBase64LookupMap();
    const map2 = _getBase64LookupMap();
    expect(map1).toBe(map2); // Should be the same reference
  });
});

describe("binaryToBase64", () => {
  it("should be defined", () => {
    expect(binaryToBase64).toBeDefined();
  });

  it("should handle empty buffer", () => {
    const buffer = new ArrayBuffer(0);
    expect(binaryToBase64(buffer)).toBe("");
  });

  it("should encode simple text", () => {
    const text = "Hello";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = binaryToBase64(buffer);
    expect(result).toBe("SGVsbG8=");
  });

  it("should encode text without padding", () => {
    const text = "Hi";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = binaryToBase64(buffer);
    expect(result).toBe("SGk=");
  });

  it("should encode single character", () => {
    const text = "A";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = binaryToBase64(buffer);
    expect(result).toBe("QQ==");
  });

  it("should encode binary data", () => {
    const bytes = new Uint8Array([0, 1, 2, 3, 255]);
    const result = binaryToBase64(bytes.buffer);
    expect(result).toBe("AAECA/8=");
  });

  it("should handle longer text", () => {
    const text = "The quick brown fox jumps over the lazy dog";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = binaryToBase64(buffer);
    expect(result).toBe(
      "VGhlIHF1aWNrIGJyb3duIGZveCBqdW1wcyBvdmVyIHRoZSBsYXp5IGRvZw==",
    );
  });

  it("should handle all byte values", () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      bytes[i] = i;
    }
    const result = binaryToBase64(bytes.buffer);
    expect(result).toContain(
      "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8gISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0BBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWltcXV5fYGFiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/w==",
    );
  });
});

describe("base64ToBinary", () => {
  it("should be defined", () => {
    expect(base64ToBinary).toBeDefined();
  });

  it("should handle empty string", () => {
    const result = base64ToBinary("");
    expect(new Uint8Array(result)).toEqual(new Uint8Array(0));
  });

  it("should decode simple base64", () => {
    const result = base64ToBinary("SGVsbG8=");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should decode base64 without padding", () => {
    const result = base64ToBinary("SGk");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hi");
  });

  it("should decode single character", () => {
    const result = base64ToBinary("QQ==");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("A");
  });

  it("should decode binary data", () => {
    const result = base64ToBinary("AAECA/8=");
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0, 1, 2, 3, 255]));
  });

  it("should roundtrip encode/decode", () => {
    const original = "The quick brown fox jumps over the lazy dog";
    const buffer = new TextEncoder().encode(original).buffer;
    const encoded = binaryToBase64(buffer);
    const decoded = base64ToBinary(encoded);
    const result = new TextDecoder().decode(decoded);
    expect(result).toBe(original);
  });

  it("should handle hex prefix fallback", () => {
    const hexString = "48656c6c6f"; // "Hello" in hex
    const input = `${_HEX_PREFIX}${hexString}`;
    const result = base64ToBinary(input);
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should handle invalid base64 gracefully", () => {
    const result = base64ToBinary("invalid@#$");
    expect(result.byteLength).toBeGreaterThan(0); // It handles invalid chars as 0 but still produces output
  });

  it("should handle base64 with extra padding", () => {
    const result = base64ToBinary("SGVsbG8===");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should handle base64 with invalid characters", () => {
    // Should handle gracefully by treating invalid chars as 0
    const result = base64ToBinary("SGVs@bG8=");
    expect(result.byteLength).toBeGreaterThan(0);
  });

  it("should roundtrip binary data", () => {
    const original = new Uint8Array([
      0, 1, 2, 3, 255, 128, 64, 32, 16, 8, 4, 2, 1,
    ]);
    const encoded = binaryToBase64(original.buffer);
    const decoded = base64ToBinary(encoded);
    expect(new Uint8Array(decoded)).toEqual(original);
  });

  it("should handle all possible byte values roundtrip", () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      original[i] = i;
    }
    const encoded = binaryToBase64(original.buffer);
    const decoded = base64ToBinary(encoded);
    expect(new Uint8Array(decoded)).toEqual(original);
  });

  it("should handle partial base64 strings", () => {
    // Test with different lengths that would have different padding
    const test1 = base64ToBinary("QQ"); // Should decode "A"
    expect(new TextDecoder().decode(test1)).toBe("A");

    const test2 = base64ToBinary("SGk"); // Should decode "Hi"
    expect(new TextDecoder().decode(test2)).toBe("Hi");
  });

  it("should handle invalid base64 characters gracefully", () => {
    // Test with completely invalid base64 string that would cause an error
    const invalidBase64 = "!!!invalid base64!!!";
    const result = base64ToBinary(invalidBase64);
    expect(result).toBeInstanceOf(ArrayBuffer);
    expect(result.byteLength).toBeGreaterThanOrEqual(0);
  });

  it("should handle edge case errors and return empty ArrayBuffer", () => {
    // Mock console.error to avoid console output during test
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Create a scenario that might trigger the catch block by manipulating the internal state
    // We'll temporarily replace Math.floor to cause an error in outputLength calculation
    const originalMathFloor = Math.floor;
    Math.floor = () => {
      throw new Error("Math operation failed");
    };

    try {
      const result = base64ToBinary("SGVsbG8="); // Valid base64 for "Hello"
      expect(result).toBeInstanceOf(ArrayBuffer);
      expect(result.byteLength).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to decode base64 data",
        expect.any(Error),
      );
    } finally {
      // Restore original Math.floor
      Math.floor = originalMathFloor;
      consoleErrorSpy.mockRestore();
    }
  });
});
