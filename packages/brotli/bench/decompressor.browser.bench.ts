import { beforeAll, bench, describe } from "vitest";
import { init as initCompressor, compress, compressText } from "../src/compressor";
import { init as initDecompressor, decompress, decompressText } from "../src/decompressor";
import { FIXTURE_TEXT, FIXTURE_MARKDOWN, FIXTURE_HTML, FIXTURE_BINARY } from "../src/fixtures";

let compressedJson: Uint8Array;
let compressedMarkdown: Uint8Array;
let compressedHtml: Uint8Array;
let compressedBinary: Uint8Array;
let compressedSvg: Uint8Array;
let compressedPng: Uint8Array;

beforeAll(async () => {
  await initCompressor();
  await initDecompressor();
  const hugeSvg = new Uint8Array(await (await fetch("/huge.svg")).arrayBuffer());
  const hugePng = new Uint8Array(await (await fetch("/huge.png")).arrayBuffer());

  compressedJson = compressText(FIXTURE_TEXT, { quality: 6 });
  compressedMarkdown = compressText(FIXTURE_MARKDOWN, { quality: 6 });
  compressedHtml = compressText(FIXTURE_HTML, { quality: 6 });
  compressedBinary = compress(FIXTURE_BINARY, { quality: 6 });
  compressedSvg = compress(hugeSvg, { quality: 6 });
  compressedPng = compress(hugePng, { quality: 6 });
});

// ── Text benchmarks (decompressText) ────────────────────────────────

describe("decompressText (browser) – short JSON", () => {
  bench("decompressText", () => {
    decompressText(compressedJson);
  });
});

describe("decompressText (browser) – 2 KB Markdown", () => {
  bench("decompressText", () => {
    decompressText(compressedMarkdown);
  });
});

describe("decompressText (browser) – 8 KB HTML", () => {
  bench("decompressText", () => {
    decompressText(compressedHtml);
  });
});

// ── Binary benchmarks (decompress) ──────────────────────────────────

describe("decompress (browser) – 512 B pseudorandom binary", () => {
  bench("decompress", () => {
    decompress(compressedBinary);
  });
});

describe("decompress (browser) – 4.9 MB SVG (huge.svg)", () => {
  bench("decompress", () => {
    decompress(compressedSvg);
  });
});

describe("decompress (browser) – 2.1 MB PNG (huge.png)", () => {
  bench("decompress", () => {
    decompress(compressedPng);
  });
});
