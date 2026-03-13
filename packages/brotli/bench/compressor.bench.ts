import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, bench, describe } from "vitest";
import { init, compress, compressText } from "../src/compressor";
import { FIXTURE_TEXT, FIXTURE_MARKDOWN, FIXTURE_HTML, FIXTURE_BINARY } from "../src/fixtures";

let hugeSvg: Uint8Array;
let hugePng: Uint8Array;

beforeAll(async () => {
  await init();
  const root = resolve(import.meta.dirname, "..");
  hugeSvg = new Uint8Array(readFileSync(resolve(root, "huge.svg")).buffer);
  hugePng = new Uint8Array(readFileSync(resolve(root, "huge.png")).buffer);
});

// ── Text benchmarks (compressText) ──────────────────────────────────

describe("compressText – short JSON (83 B)", () => {
  bench("quality 6", () => {
    compressText(FIXTURE_TEXT, { quality: 6 });
  });
});

describe("compressText – 2 KB Markdown", () => {
  bench("quality 1", () => {
    compressText(FIXTURE_MARKDOWN, { quality: 1 });
  });

  bench("quality 6", () => {
    compressText(FIXTURE_MARKDOWN, { quality: 6 });
  });

  bench("quality 11", () => {
    compressText(FIXTURE_MARKDOWN, { quality: 11 });
  });
});

describe("compressText – 8 KB HTML", () => {
  bench("quality 1", () => {
    compressText(FIXTURE_HTML, { quality: 1 });
  });

  bench("quality 6", () => {
    compressText(FIXTURE_HTML, { quality: 6 });
  });

  bench("quality 11", () => {
    compressText(FIXTURE_HTML, { quality: 11 });
  });
});

// ── Binary benchmarks (compress) ────────────────────────────────────

describe("compress – 512 B pseudorandom binary", () => {
  bench("quality 6", () => {
    compress(FIXTURE_BINARY, { quality: 6 });
  });
});

describe("compress – 4.9 MB SVG (huge.svg)", () => {
  bench("quality 1", () => {
    compress(hugeSvg, { quality: 1 });
  });

  bench("quality 6", () => {
    compress(hugeSvg, { quality: 6 });
  });

  bench("quality 11", () => {
    compress(hugeSvg, { quality: 11 });
  });
});

describe("compress – 2.1 MB PNG (huge.png)", () => {
  bench("quality 1", () => {
    compress(hugePng, { quality: 1 });
  });

  bench("quality 6", () => {
    compress(hugePng, { quality: 6 });
  });

  bench("quality 11", () => {
    compress(hugePng, { quality: 11 });
  });
});
