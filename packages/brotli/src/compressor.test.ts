import { brotliDecompressSync } from "node:zlib";
import { beforeAll, describe, expect, test } from "vitest";
import { FIXTURE_BINARY, FIXTURE_TEXT } from "./fixtures";
import * as compressor from "./compressor";
import * as decompressor from "./decompressor";

beforeAll(async () => {
  await compressor.init();
  await decompressor.init();
});

describe("compressor", () => {
  test("compresses UTF-8 text that Node.js can decode", () => {
    const compressed = compressor.compressText(FIXTURE_TEXT, {
      quality: 6,
      lgwin: 22,
    });

    const plain = brotliDecompressSync(Buffer.from(compressed)).toString("utf8");
    expect(plain).toBe(FIXTURE_TEXT);
  });

  test("round-trips text through the wasm compressor and decompressor", () => {
    const compressed = compressor.compressText(FIXTURE_TEXT);
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe(FIXTURE_TEXT);
  });

  test("round-trips binary bytes through the wasm compressor and decompressor", () => {
    const compressed = compressor.compress(FIXTURE_BINARY, {
      quality: 4,
      lgwin: 20,
    });
    const plain = decompressor.decompress(compressed);
    expect(Array.from(plain)).toEqual(Array.from(FIXTURE_BINARY));
  });

  test("isReady() returns true after init", () => {
    expect(compressor.isReady()).toBe(true);
  });

  test("compress and decompress empty Uint8Array round-trips", () => {
    const compressed = compressor.compress(new Uint8Array(0));
    const plain = decompressor.decompress(compressed);
    expect(plain.length).toBe(0);
  });

  test("compressText and decompressText empty string round-trips", () => {
    const compressed = compressor.compressText("");
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe("");
  });

  test("round-trips multi-byte Unicode (emoji + CJK + Arabic)", () => {
    const unicode = "Hello 🌍🎉 你好世界 مرحبا 🚀 café naïve";
    const compressed = compressor.compressText(unicode);
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe(unicode);
  });

  test("quality 11 produces output ≤ quality 1 for compressible text", () => {
    const longText = "abcdefghij".repeat(200);
    const q1 = compressor.compressText(longText, { quality: 1 });
    const q11 = compressor.compressText(longText, { quality: 11 });
    expect(q11.length).toBeLessThanOrEqual(q1.length);
  });
});

describe("compressor normalizeOptions", () => {
  test("quality 0 is accepted", () => {
    expect(() => compressor.normalizeOptions({ quality: 0 })).not.toThrow();
  });

  test("quality 11 is accepted", () => {
    expect(() => compressor.normalizeOptions({ quality: 11 })).not.toThrow();
  });

  test("quality 12 throws", () => {
    expect(() => compressor.normalizeOptions({ quality: 12 })).toThrow("quality");
  });

  test("quality -1 throws", () => {
    expect(() => compressor.normalizeOptions({ quality: -1 })).toThrow("quality");
  });

  test("lgwin 10 is accepted", () => {
    expect(() => compressor.normalizeOptions({ lgwin: 10 })).not.toThrow();
  });

  test("lgwin 24 is accepted", () => {
    expect(() => compressor.normalizeOptions({ lgwin: 24 })).not.toThrow();
  });

  test("lgwin 9 throws", () => {
    expect(() => compressor.normalizeOptions({ lgwin: 9 })).toThrow("lgwin");
  });

  test("lgwin 25 throws", () => {
    expect(() => compressor.normalizeOptions({ lgwin: 25 })).toThrow("lgwin");
  });

  test("non-integer quality throws", () => {
    expect(() => compressor.normalizeOptions({ quality: 3.5 })).toThrow("quality");
  });
});
