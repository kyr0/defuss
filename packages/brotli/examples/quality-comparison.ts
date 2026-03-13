import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { init as initCompressor, compress, compressText } from "../dist/compressor.js";
import { init as initDecompressor, decompress, decompressText } from "../dist/decompressor.js";

const FIXTURE_TEXT =
  '{"hello":"brotli","arr":[1,2,3],"md":"# Title\n\nSome **markdown** and <b>HTML</b>."}';

const FIXTURE_BINARY = Uint8Array.from(
  Array.from({ length: 512 }, (_, i) => (i * 73 + 19) & 0xff),
);

const QUALITIES = [1, 4, 6, 9, 11] as const;

interface Fixture {
  name: string;
  data: Uint8Array;
  isText: boolean;
  text?: string;
}

const root = resolve(import.meta.dirname, "..");
const hugeSvg = new Uint8Array(readFileSync(resolve(root, "huge.svg")).buffer);
const hugePng = new Uint8Array(readFileSync(resolve(root, "huge.png")).buffer);

const fixtures: Fixture[] = [
  { name: "Short JSON (~83 B)", data: new TextEncoder().encode(FIXTURE_TEXT), isText: true, text: FIXTURE_TEXT },
  { name: "Pseudorandom binary (512 B)", data: FIXTURE_BINARY, isText: false },
  { name: `SVG (${(hugeSvg.length / 1024 / 1024).toFixed(1)} MB)`, data: hugeSvg, isText: false },
  { name: `PNG (${(hugePng.length / 1024 / 1024).toFixed(1)} MB)`, data: hugePng, isText: false },
];

function pad(s: string | number, width: number): string {
  return String(s).padStart(width);
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

async function main() {
  await initCompressor();
  await initDecompressor();

  let allPassed = true;

  for (const fixture of fixtures) {
    const inputSize = fixture.data.length;

    console.log(`\n${"═".repeat(72)}`);
    console.log(`  ${fixture.name}  (${fmtSize(inputSize)} input)`);
    console.log(`${"═".repeat(72)}`);
    console.log(
      `  ${pad("Quality", 7)}  │  ${pad("Output", 10)}  │  ${pad("Ratio", 7)}  │  ${pad("Compress ms", 11)}  │  ${pad("Decompress ms", 13)}`,
    );
    console.log(
      `  ${"─".repeat(7)}  │  ${"─".repeat(10)}  │  ${"─".repeat(7)}  │  ${"─".repeat(11)}  │  ${"─".repeat(13)}`,
    );

    for (const q of QUALITIES) {
      const t0 = performance.now();
      const compressed = fixture.isText
        ? compressText(fixture.text!, { quality: q })
        : compress(fixture.data, { quality: q });
      const t1 = performance.now();

      const t2 = performance.now();
      let ok: boolean;
      if (fixture.isText) {
        const roundTripped = decompressText(compressed);
        ok = roundTripped === fixture.text!;
      } else {
        const roundTripped = decompress(compressed);
        ok = roundTripped.length === fixture.data.length &&
          roundTripped.every((b, i) => b === fixture.data[i]);
      }
      const t3 = performance.now();

      if (!ok) allPassed = false;

      const ratio = ((compressed.length / inputSize) * 100).toFixed(1);
      const compMs = (t1 - t0).toFixed(2);
      const decMs = (t3 - t2).toFixed(2);
      const check = ok ? "[OK]" : "✗";

      console.log(
        `  ${pad(q, 7)}  │  ${pad(fmtSize(compressed.length), 10)}  │  ${pad(ratio + "%", 7)}  │  ${pad(compMs, 11)}  │  ${pad(decMs, 13)}  ${check}`,
      );
    }
  }

  console.log(`\n${"═".repeat(72)}`);
  if (allPassed) {
    console.log("  [OK] All round-trips passed");
  } else {
    console.log("  ✗ Some round-trips FAILED");
    process.exit(1);
  }
  console.log(`${"═".repeat(72)}\n`);
}

main();
