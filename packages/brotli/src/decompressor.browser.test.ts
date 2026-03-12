import { beforeAll, describe, expect, test } from "vitest";

import { FIXTURE_TEXT, FIXTURE_TEXT_BROTLI } from "./fixtures";
import * as compressor from "./compressor";
import * as decompressor from "./decompressor";

beforeAll(async () => {
  await compressor.init();
  await decompressor.init();
});

describe("decompressor (browser)", () => {
  test("decompresses the static fixture with only the decoder loaded", () => {
    expect(decompressor.decompressText(FIXTURE_TEXT_BROTLI)).toBe(FIXTURE_TEXT);
  });

  test("enforces maxOutputSize in the browser", () => {
    expect(() =>
      decompressor.decompress(FIXTURE_TEXT_BROTLI, { maxOutputSize: 8 }),
    ).toThrow();
  });
});
