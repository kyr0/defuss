import { beforeAll, describe, expect, test } from "vitest";

import { FIXTURE_TEXT } from "./fixtures";
import * as compressor from "./compressor";
import * as decompressor from "./decompressor";

beforeAll(async () => {
  await compressor.init();
  await decompressor.init();
});

describe("compressor (browser)", () => {
  test("round-trips web text in the browser", () => {
    const compressed = compressor.compressText(FIXTURE_TEXT, {
      quality: 6,
      lgwin: 22,
    });
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe(FIXTURE_TEXT);
  });

  test("round-trips empty string in the browser", () => {
    const compressed = compressor.compressText("");
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe("");
  });

  test("round-trips emoji + multi-byte Unicode in the browser", () => {
    const text = "Hello 🌍🎉 你好世界 مرحبا 🚀";
    const compressed = compressor.compressText(text);
    const plain = decompressor.decompressText(compressed);
    expect(plain).toBe(text);
  });
});
