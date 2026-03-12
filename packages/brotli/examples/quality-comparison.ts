import { init as initCompressor, compressText } from "../src/compressor";
import { init as initDecompressor, decompressText } from "../src/decompressor";
import { FIXTURE_TEXT, FIXTURE_MARKDOWN, FIXTURE_HTML } from "../src/fixtures";

const QUALITIES = [1, 4, 6, 9, 11] as const;

interface Fixture {
  name: string;
  data: string;
}

const fixtures: Fixture[] = [
  { name: "Short JSON (~83 B)", data: FIXTURE_TEXT },
  { name: "Markdown (~2 KB)", data: FIXTURE_MARKDOWN },
  { name: "HTML (~8 KB)", data: FIXTURE_HTML },
];

function pad(s: string | number, width: number): string {
  return String(s).padStart(width);
}

async function main() {
  await initCompressor();
  await initDecompressor();

  let allPassed = true;

  for (const fixture of fixtures) {
    const inputBytes = new TextEncoder().encode(fixture.data);
    const inputSize = inputBytes.length;

    console.log(`\n${"═".repeat(72)}`);
    console.log(`  ${fixture.name}  (${inputSize} bytes input)`);
    console.log(`${"═".repeat(72)}`);
    console.log(
      `  ${pad("Quality", 7)}  │  ${pad("Output B", 8)}  │  ${pad("Ratio", 7)}  │  ${pad("Compress ms", 11)}  │  ${pad("Decompress ms", 13)}`,
    );
    console.log(
      `  ${"─".repeat(7)}  │  ${"─".repeat(8)}  │  ${"─".repeat(7)}  │  ${"─".repeat(11)}  │  ${"─".repeat(13)}`,
    );

    for (const q of QUALITIES) {
      const t0 = performance.now();
      const compressed = compressText(fixture.data, { quality: q });
      const t1 = performance.now();

      const t2 = performance.now();
      const roundTripped = decompressText(compressed);
      const t3 = performance.now();

      const ok = roundTripped === fixture.data;
      if (!ok) allPassed = false;

      const ratio = ((compressed.length / inputSize) * 100).toFixed(1);
      const compMs = (t1 - t0).toFixed(2);
      const decMs = (t3 - t2).toFixed(2);
      const check = ok ? "✓" : "✗";

      console.log(
        `  ${pad(q, 7)}  │  ${pad(compressed.length, 8)}  │  ${pad(ratio + "%", 7)}  │  ${pad(compMs, 11)}  │  ${pad(decMs, 13)}  ${check}`,
      );
    }
  }

  console.log(`\n${"═".repeat(72)}`);
  if (allPassed) {
    console.log("  ✓ All round-trips passed");
  } else {
    console.log("  ✗ Some round-trips FAILED");
    process.exit(1);
  }
  console.log(`${"═".repeat(72)}\n`);
}

main();
