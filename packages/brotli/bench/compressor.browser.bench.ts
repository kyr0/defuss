import { beforeAll, bench, describe } from "vitest";
import { init, compressText } from "../src/compressor";
import { FIXTURE_TEXT, FIXTURE_MARKDOWN, FIXTURE_HTML } from "../src/fixtures";

beforeAll(async () => {
  await init();
});

describe("compress (browser) – short JSON", () => {
  bench("quality 6", () => {
    compressText(FIXTURE_TEXT, { quality: 6 });
  });
});

describe("compress (browser) – 2 KB Markdown", () => {
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

describe("compress (browser) – 8 KB HTML", () => {
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
