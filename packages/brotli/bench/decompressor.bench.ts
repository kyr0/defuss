import { beforeAll, bench, describe } from "vitest";
import { init as initCompressor, compressText } from "../src/compressor";
import { init as initDecompressor, decompressText } from "../src/decompressor";
import { FIXTURE_TEXT, FIXTURE_MARKDOWN, FIXTURE_HTML } from "../src/fixtures";

let compressedJson: Uint8Array;
let compressedMarkdown: Uint8Array;
let compressedHtml: Uint8Array;

beforeAll(async () => {
  await initCompressor();
  await initDecompressor();
  compressedJson = compressText(FIXTURE_TEXT, { quality: 6 });
  compressedMarkdown = compressText(FIXTURE_MARKDOWN, { quality: 6 });
  compressedHtml = compressText(FIXTURE_HTML, { quality: 6 });
});

describe("decompress – short JSON", () => {
  bench("decompressText", () => {
    decompressText(compressedJson);
  });
});

describe("decompress – 2 KB Markdown", () => {
  bench("decompressText", () => {
    decompressText(compressedMarkdown);
  });
});

describe("decompress – 8 KB HTML", () => {
  bench("decompressText", () => {
    decompressText(compressedHtml);
  });
});
