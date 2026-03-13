/**
 * End-to-end test that imports the built dist/ modules directly
 * (with inlined WASM) and verifies compress → decompress round-trips.
 *
 * Run: bun run test:e2e
 */
import { init as initCompressor, compress, compressText, isReady as compressorReady } from "../dist/compressor.js";
import { init as initDecompressor, decompress, decompressText, isReady as decompressorReady } from "../dist/decompressor.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  [OK] ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

async function main() {
  console.log("\n  defuss-brotli e2e (dist/ with inlined WASM)\n");

  // --- Init ---
  await initCompressor();
  await initDecompressor();
  assert(compressorReady(), "compressor.isReady() after init");
  assert(decompressorReady(), "decompressor.isReady() after init");

  // --- Text round-trip ---
  const text = '{"hello":"brotli","works":true}';
  const compressed = compressText(text);
  assert(compressed instanceof Uint8Array, "compressText returns Uint8Array");
  assert(compressed.length > 0, "compressed output is non-empty");
  assert(compressed.length < new TextEncoder().encode(text).length + 20, "compressed output is reasonably sized");

  const decompressed = decompressText(compressed);
  assert(decompressed === text, "text round-trip: compressText → decompressText");

  // --- Binary round-trip ---
  const binary = new Uint8Array(Array.from({ length: 256 }, (_, i) => i));
  const compressedBin = compress(binary, { quality: 4 });
  const decompressedBin = decompress(compressedBin);
  assert(decompressedBin.length === binary.length, "binary round-trip: same length");
  assert(
    Array.from(decompressedBin).every((b, i) => b === binary[i]),
    "binary round-trip: bytes match",
  );

  // --- Empty round-trip ---
  const emptyCompressed = compressText("");
  const emptyDecompressed = decompressText(emptyCompressed);
  assert(emptyDecompressed === "", "empty string round-trip");

  // --- Unicode round-trip ---
  const unicode = "Hello 🌍🎉 你好世界 مرحبا 🚀 café naïve";
  const unicodeCompressed = compressText(unicode);
  const unicodeDecompressed = decompressText(unicodeCompressed);
  assert(unicodeDecompressed === unicode, "Unicode round-trip (emoji + CJK + Arabic)");

  // --- Quality levels ---
  const longText = "The quick brown fox jumps over the lazy dog. ".repeat(100);
  const q1 = compressText(longText, { quality: 1 });
  const q6 = compressText(longText, { quality: 6 });
  const q11 = compressText(longText, { quality: 11 });
  assert(decompressText(q1) === longText, "quality 1 round-trip");
  assert(decompressText(q6) === longText, "quality 6 round-trip");
  assert(decompressText(q11) === longText, "quality 11 round-trip");
  assert(q11.length <= q1.length, "quality 11 output ≤ quality 1 output");

  // --- Idempotent init ---
  await initCompressor();
  await initDecompressor();
  assert(compressorReady(), "compressor still ready after second init()");
  assert(decompressorReady(), "decompressor still ready after second init()");

  // --- Summary ---
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
