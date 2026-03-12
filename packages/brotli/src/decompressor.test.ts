import { brotliCompressSync, constants } from "node:zlib";
import { beforeAll, describe, expect, test } from "vitest";

import { FIXTURE_BINARY, FIXTURE_TEXT, FIXTURE_TEXT_BROTLI } from "./fixtures";
import * as decompressor from "./decompressor";
import * as compressor from "./compressor";

beforeAll(async () => {
  await decompressor.init();
  await compressor.init();
});

describe("decompressor", () => {
  test("decompresses a Node.js Brotli fixture", () => {
    expect(decompressor.decompressText(FIXTURE_TEXT_BROTLI)).toBe(FIXTURE_TEXT);
  });

  test("decompresses Node.js binary Brotli output", () => {
    const compressed = brotliCompressSync(Buffer.from(FIXTURE_BINARY), {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 5,
        [constants.BROTLI_PARAM_LGWIN]: 22,
      },
    });

    const plain = decompressor.decompress(new Uint8Array(compressed));
    expect(Array.from(plain)).toEqual(Array.from(FIXTURE_BINARY));
  });

  test("enforces maxOutputSize", () => {
    expect(() =>
      decompressor.decompress(FIXTURE_TEXT_BROTLI, { maxOutputSize: 8 }),
    ).toThrow(/maxOutputSize|max_output_size/i);
  });

  test("isReady() returns true after init", () => {
    expect(decompressor.isReady()).toBe(true);
  });

  test("decompresses empty compressed payload to empty output", () => {
    const compressed = compressor.compress(new Uint8Array(0));
    const plain = decompressor.decompress(compressed);
    expect(plain.length).toBe(0);
  });

  test("throws on corrupt / non-Brotli input", () => {
    const garbage = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0xFF]);
    expect(() => decompressor.decompress(garbage)).toThrow();
  });
});

describe("decompressor normalizeOptions", () => {
  test("maxOutputSize 1 is accepted", () => {
    expect(() => decompressor.normalizeOptions({ maxOutputSize: 1 })).not.toThrow();
  });

  test("maxOutputSize 0 throws", () => {
    expect(() => decompressor.normalizeOptions({ maxOutputSize: 0 })).toThrow("maxOutputSize");
  });

  test("maxOutputSize -1 throws", () => {
    expect(() => decompressor.normalizeOptions({ maxOutputSize: -1 })).toThrow("maxOutputSize");
  });

  test("non-integer maxOutputSize throws", () => {
    expect(() => decompressor.normalizeOptions({ maxOutputSize: 1.5 })).toThrow("maxOutputSize");
  });
});
