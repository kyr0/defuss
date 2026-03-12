export const FIXTURE_TEXT =
  '{"hello":"brotli","arr":[1,2,3],"md":"# Title\n\nSome **markdown** and <b>HTML</b>."}';

export const FIXTURE_TEXT_BROTLI = Uint8Array.from([
  0x1b, 0x52, 0x00, 0x00, 0xc4, 0x68, 0x73, 0xa9, 0x72, 0x4f, 0x83, 0xcd, 0x9b, 0xa6, 0x22, 0x2e, 0xb0, 0x01, 0x07, 0x4e, 0x81, 0xbc, 0x2d, 0x38, 0xd3, 0x28, 0xc3, 0xc6, 0xd8, 0xd9, 0x22, 0x14, 0x5f, 0xbf, 0x58, 0xf5, 0x0f, 0x03, 0xc9, 0x32, 0x6e, 0x5d, 0x0d, 0x01, 0xf1, 0xb2, 0xc0, 0x70, 0x55, 0x41, 0x13, 0x74, 0x5f, 0x40, 0x9f, 0xc1, 0x00, 0x25, 0x05, 0x72, 0x3c, 0x58, 0x8c, 0x61, 0x66, 0x36, 0x9e, 0x03, 0x63, 0x65, 0x85, 0xb1, 0x12, 0x47, 0xb7, 0x2d, 0x39, 0x71, 0x24, 0xfc,
]);

export const FIXTURE_BINARY = Uint8Array.from(
  Array.from({ length: 512 }, (_, i) => (i * 73 + 19) & 0xff),
);

/** ~2 KB Markdown document for benchmarking and examples. */
export const FIXTURE_MARKDOWN = `# defuss-brotli

A split pure-Rust Brotli package for Node.js and browsers.

## Why Brotli?

Brotli typically achieves **15-25 %** better compression than gzip on web text
while decompressing at comparable speed. It is natively supported by all modern
browsers via the \`Accept-Encoding: br\` header.

## Features

- Pure-Rust WebAssembly core — no native addons, runs everywhere WASM does
- Split compressor / decompressor exports for minimal bundle size
- TypeScript-first API with full JSDoc documentation
- Vitest coverage in both Node.js and browser environments

## Quick Start

\`\`\`ts
import { init, compressText } from "defuss-brotli/compressor";

await init();
const compressed = compressText("Hello, Brotli!");
\`\`\`

### Decompression

\`\`\`ts
import { init, decompressText } from "defuss-brotli/decompressor";

await init();
const text = decompressText(compressed);
\`\`\`

## Quality Levels

| Quality | Speed    | Ratio  | Use case               |
|---------|----------|--------|------------------------|
| 0-1     | Fastest  | ~40 %  | Real-time streaming    |
| 4-6     | Balanced | ~30 %  | On-the-fly web serving |
| 9-11    | Slowest  | ~25 %  | Static asset pipeline  |

The default quality is **6** which offers a good trade-off between compression
speed and output size for most web workloads.

## Compression Options

- \`quality\` (0-11): Higher values compress more but take longer
- \`lgwin\` (10-24): Sliding window size exponent; larger windows find more
  matches but use more memory

## Decompression Options

- \`maxOutputSize\`: Hard cap on decompressed size to prevent decompression bombs
  (default: 64 MiB)

## Architecture

The package is built from two independent Rust crates compiled to WebAssembly:

1. **compressor** — the full Brotli encoder (~180 KB WASM)
2. **decompressor** — the lightweight decoder (~45 KB WASM)

Browser apps that only need to decompress pre-compressed data can import just
the decompressor, keeping the bundle small.

## License

MIT
`;

/** ~8 KB repetitive HTML for benchmarking and examples. */
export const FIXTURE_HTML = Array.from({ length: 40 }, (_, i) => `<section class="card" id="card-${i}">
  <header class="card-header">
    <h2 class="card-title">Card Title ${i}</h2>
    <span class="badge badge-primary">Tag ${i % 5}</span>
  </header>
  <div class="card-body">
    <p>This is the description for card number ${i}. It contains enough text
    to be realistic but is repeated to create a compressible payload that
    exercises the sliding window matching in the Brotli encoder.</p>
    <ul>
      <li>Feature alpha for item ${i}</li>
      <li>Feature beta for item ${i}</li>
      <li>Feature gamma for item ${i}</li>
    </ul>
  </div>
  <footer class="card-footer">
    <button class="btn btn-primary">Action</button>
    <button class="btn btn-outline">Cancel</button>
  </footer>
</section>`).join("\n");
