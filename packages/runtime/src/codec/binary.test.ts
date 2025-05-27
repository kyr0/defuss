import {
  binaryToHex,
  hexToBinary,
  textToBinary,
  binaryToText,
  _HEX_PREFIX,
} from "./binary.js";

describe("_HEX_PREFIX", () => {
  it("should be defined", () => {
    expect(_HEX_PREFIX).toBe("hex:");
  });
});

describe("binaryToHex", () => {
  it("should be defined", () => {
    expect(binaryToHex).toBeDefined();
  });

  it("should convert empty buffer to hex prefix", () => {
    const buffer = new ArrayBuffer(0);
    expect(binaryToHex(buffer)).toBe("hex:");
  });

  it("should convert simple bytes to hex", () => {
    const bytes = new Uint8Array([0, 1, 15, 16, 255]);
    const result = binaryToHex(bytes.buffer);
    expect(result).toBe("hex:00010f10ff");
  });

  it("should convert text to hex", () => {
    const text = "Hello";
    const buffer = new TextEncoder().encode(text).buffer;
    const result = binaryToHex(buffer);
    expect(result).toBe("hex:48656c6c6f");
  });

  it("should handle all byte values", () => {
    const bytes = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      bytes[i] = i;
    }
    const result = binaryToHex(bytes.buffer);
    expect(result).toMatch(/^hex:/);
    expect(result).toContain("000102030405060708090a0b0c0d0e0f");
    expect(result).toContain("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");
  });

  it("should pad single digit hex values", () => {
    const bytes = new Uint8Array([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
    const result = binaryToHex(bytes.buffer);
    expect(result).toBe("hex:000102030405060708090a0b0c0d0e0f");
  });
});

describe("hexToBinary", () => {
  it("should be defined", () => {
    expect(hexToBinary).toBeDefined();
  });

  it("should convert empty hex string to empty buffer", () => {
    const result = hexToBinary("");
    expect(new Uint8Array(result)).toEqual(new Uint8Array(0));
  });

  it("should convert simple hex to bytes", () => {
    const result = hexToBinary("00010f10ff");
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([0, 1, 15, 16, 255]));
  });

  it("should convert text hex to binary", () => {
    const result = hexToBinary("48656c6c6f");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should handle lowercase hex", () => {
    const result = hexToBinary("48656c6c6f");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should handle uppercase hex", () => {
    const result = hexToBinary("48656C6C6F");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should handle mixed case hex", () => {
    const result = hexToBinary("48656C6c6F");
    const text = new TextDecoder().decode(result);
    expect(text).toBe("Hello");
  });

  it("should roundtrip with binaryToHex", () => {
    const original = new Uint8Array([0, 1, 15, 16, 255, 128, 64, 32]);
    const hex = binaryToHex(original.buffer);
    const hexString = hex.replace(_HEX_PREFIX, "");
    const decoded = hexToBinary(hexString);
    expect(new Uint8Array(decoded)).toEqual(original);
  });

  it("should handle all byte values", () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      original[i] = i;
    }
    const hex = binaryToHex(original.buffer);
    const hexString = hex.replace(_HEX_PREFIX, "");
    const decoded = hexToBinary(hexString);
    expect(new Uint8Array(decoded)).toEqual(original);
  });
});

describe("textToBinary", () => {
  it("should be defined", () => {
    expect(textToBinary).toBeDefined();
  });

  it("should convert empty string to empty buffer", () => {
    const result = textToBinary("");
    expect(new Uint8Array(result)).toEqual(new Uint8Array(0));
  });

  it("should convert simple text to binary", () => {
    const result = textToBinary("Hello");
    const bytes = new Uint8Array(result);
    expect(bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
  });

  it("should handle UTF-8 encoding", () => {
    const result = textToBinary("Hello 🌍");
    const bytes = new Uint8Array(result);
    expect(bytes.length).toBeGreaterThan(7); // Emoji takes multiple bytes
  });

  it("should handle special characters", () => {
    const text = "Hello\nWorld\t!";
    const result = textToBinary(text);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(text);
  });

  it("should handle unicode characters", () => {
    const text = "Héllo Wörld ñ";
    const result = textToBinary(text);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(text);
  });

  it("should handle emojis", () => {
    const text = "Hello 🌍 World 🚀";
    const result = textToBinary(text);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(text);
  });

  it("should handle complex unicode", () => {
    const text = "🏳️‍🌈 👨‍👩‍👧‍👦 🇺🇸";
    const result = textToBinary(text);
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(text);
  });
});

describe("binaryToText", () => {
  it("should be defined", () => {
    expect(binaryToText).toBeDefined();
  });

  it("should convert empty buffer to empty string", () => {
    const buffer = new ArrayBuffer(0);
    expect(binaryToText(buffer)).toBe("");
  });

  it("should convert binary to simple text", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]);
    const result = binaryToText(bytes.buffer);
    expect(result).toBe("Hello");
  });

  it("should roundtrip with textToBinary", () => {
    const original = "Hello World!";
    const binary = textToBinary(original);
    const decoded = binaryToText(binary);
    expect(decoded).toBe(original);
  });

  it("should handle UTF-8 decoding", () => {
    const original = "Hello 🌍 World 🚀";
    const binary = textToBinary(original);
    const decoded = binaryToText(binary);
    expect(decoded).toBe(original);
  });

  it("should handle special characters", () => {
    const original = "Hello\nWorld\t!@#$%^&*()";
    const binary = textToBinary(original);
    const decoded = binaryToText(binary);
    expect(decoded).toBe(original);
  });

  it("should handle unicode characters", () => {
    const original = "Héllo Wörld ñ ü ß";
    const binary = textToBinary(original);
    const decoded = binaryToText(binary);
    expect(decoded).toBe(original);
  });

  it("should handle complex unicode sequences", () => {
    const original = "🏳️‍🌈 👨‍👩‍👧‍👦 🇺🇸 ñ ü ß";
    const binary = textToBinary(original);
    const decoded = binaryToText(binary);
    expect(decoded).toBe(original);
  });

  it("should handle various text lengths", () => {
    const texts = [
      "A",
      "Hello",
      "The quick brown fox jumps over the lazy dog",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
      "",
    ];

    texts.forEach((text) => {
      const binary = textToBinary(text);
      const decoded = binaryToText(binary);
      expect(decoded).toBe(text);
    });
  });

  it("should handle invalid UTF-8 sequences gracefully", () => {
    // Create invalid UTF-8 sequence
    const invalidBytes = new Uint8Array([0xff, 0xfe, 0xfd]);
    const result = binaryToText(invalidBytes.buffer);
    expect(typeof result).toBe("string");
    // Result might contain replacement characters, but should not throw
  });
});

describe("Complete binary utilities integration", () => {
  it("should work together in complex scenarios", () => {
    const originalText = "Hello 🌍 World! Special chars: ñüß@#$%";

    // Text -> Binary
    const binary = textToBinary(originalText);

    // Binary -> Hex
    const hex = binaryToHex(binary);
    expect(hex).toMatch(/^hex:/);

    // Hex -> Binary (removing prefix)
    const hexString = hex.replace(_HEX_PREFIX, "");
    const binaryFromHex = hexToBinary(hexString);

    // Binary -> Text
    const decodedText = binaryToText(binaryFromHex);

    expect(decodedText).toBe(originalText);
  });

  it("should handle large data efficiently", () => {
    // Create a large text string
    const largeText = "Hello World! ".repeat(1000);

    const binary = textToBinary(largeText);
    const hex = binaryToHex(binary);
    const hexString = hex.replace(_HEX_PREFIX, "");
    const binaryFromHex = hexToBinary(hexString);
    const decodedText = binaryToText(binaryFromHex);

    expect(decodedText).toBe(largeText);
    expect(decodedText.length).toBe(largeText.length);
  });
});
