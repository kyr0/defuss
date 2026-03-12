# `defuss-brotli`

A split pure-Rust Brotli package for Node.js + browsers.

- **Small browser decoder bundle** — import only the decompressor, skip the encoder WASM entirely
- **Separate heavier encoder bundle** — used server-side or at build time
- **Single NPM package** with split exports
- **Pure-Rust WebAssembly** — no native addons
- **Typed TypeScript API** with full JSDoc
- **Vitest coverage** in Node and browser

## Install

```bash
bun add defuss-brotli
```

## Quick Start

### Compress

```ts
import { init, compressText } from "defuss-brotli/compressor";

await init();

const compressed = compressText("Hello, Brotli!", { quality: 6 });
```

### Decompress

```ts
import { init, decompressText } from "defuss-brotli/decompressor";

await init();

const text = decompressText(compressed);
// → "Hello, Brotli!"
```

## API

### `compress` vs `compressText`

| Function | Input | Encoding | When to use |
|---|---|---|---|
| `compress(bytes, opts)` | `Uint8Array` | None — bytes pass through as-is | Binary data, files, pre-encoded buffers |
| `compressText(text, opts)` | `string` | `TextEncoder` (UTF-8) applied internally | JSON, HTML, Markdown, any JS string |

**Why `TextEncoder`?** JS strings are UTF-16 internally, but Brotli operates on
raw bytes. `TextEncoder` converts to canonical UTF-8 — the standard encoding for
web text. `compressText` handles this so you don't have to.

### `decompress` vs `decompressText`

| Function | Output | Decoding | When to use |
|---|---|---|---|
| `decompress(bytes, opts)` | `Uint8Array` | None — raw bytes returned | Binary data, custom decoding |
| `decompressText(bytes, opts)` | `string` | `TextDecoder` (UTF-8) applied internally | Text that was compressed with `compressText` |

**Why `TextDecoder`?** Reverses the `TextEncoder` step. If the bytes are not
valid UTF-8, replacement characters (U+FFFD) are inserted rather than throwing.

### Compression Options

```ts
interface BrotliCompressOptions {
  quality?: number;  // 0–11, default 6
  lgwin?: number;    // 10–24, default 22
}
```

- **`quality`** — 0 is fastest/largest, 11 is slowest/smallest. 5–7 is the sweet spot for on-the-fly web serving.
- **`lgwin`** — Sliding window size exponent. Larger windows find more matches at the cost of memory. 22 covers most web-text repetition patterns.

### Decompression Options

```ts
interface BrotliDecompressOptions {
  maxOutputSize?: number;  // default 64 MiB (67_108_864)
}
```

Hard cap on decompressed output to prevent **decompression bombs**. Raise explicitly if your payloads legitimately exceed 64 MiB.

## Assumptions, Guarantees, Limits

### Assumptions

- Compressed input was produced by a **valid Brotli encoder** (this library, Node.js `zlib`, nginx, etc.).
- Text payloads compressed with `compressText` are valid **UTF-8** when decompressed.

### Guarantees

- `compressText(s)` → `decompressText(...)` is a **perfect round-trip** for any JS string.
- `compress(b)` → `decompress(...)` is a **perfect round-trip** for any `Uint8Array`.
- `init()` is **idempotent** — calling it multiple times returns the same Promise and does not reload WASM.
- Importing only `defuss-brotli/decompressor` **never loads** the encoder WASM binary.

### Limits

- `quality` must be an integer in **0–11** (Brotli spec hard limit).
- `lgwin` must be an integer in **10–24** (Brotli spec hard limit).
- `maxOutputSize` defaults to **64 MiB** — the WASM module rejects output exceeding this.
- Browser WASM memory is capped at **~2 GB** on 64-bit platforms (practical upper bound for very large payloads).

## Why the Split Exports?

The encoder and decoder are built from **two separate Rust Wasm crates**:

| Export | Rust crate | WASM size | Typical use |
|---|---|---|---|
| `defuss-brotli/compressor` | `brotli` | ~180 KB | Server-side, build pipelines |
| `defuss-brotli/decompressor` | `brotli-decompressor` | ~45 KB | Browser clients |

Browser apps that only decompress pre-compressed data import just the decompressor, keeping the bundle small.

## Benchmarks

Measured with `vitest bench` on the payloads shown. Numbers are **ops/sec** (higher is better).

Run benchmarks yourself:

```bash
bun run bench           # Node.js
bun run bench:browser   # Chromium via Playwright
```

### Node.js (Bun)

**Compression** (ops/sec, higher is better):

| Payload | Quality 1 | Quality 6 | Quality 11 |
|---|---|---|---|
| Short JSON (83 B) | — | 37,358 | — |
| Markdown (2 KB) | 21,164 | 11,875 | 409 |
| HTML (8 KB) | 5,514 | 2,312 | 16 |

Quality 1 is **1.8×** faster than q6 and **52×** faster than q11 on 2 KB text.
On 8 KB HTML the gap widens: q1 is **2.4×** faster than q6 and **338×** faster than q11.

**Decompression** (ops/sec):

| Payload | ops/sec |
|---|---|
| Short JSON (83 B) | 155,065 |
| Markdown (2 KB) | 49,037 |
| HTML (8 KB) | 37,400 |

Decompression is consistently fast regardless of the quality level used during compression.

### Browser (Chromium)

_Run `bun run bench:browser` and paste the vitest table output here after your first run._

## Examples

Run the quality comparison example to see compression ratios at different quality levels:

```bash
bun run example
```

Sample output:

```
════════════════════════════════════════════════════════════════════════
  Short JSON (~83 B)  (83 bytes input)
════════════════════════════════════════════════════════════════════════
  Quality  │  Output B  │    Ratio  │  Compress ms  │  Decompress ms
  ───────  │  ────────  │  ───────  │  ───────────  │  ─────────────
        1  │        81  │   97.6%  │         0.12  │           0.02  ✓
        4  │        79  │   95.2%  │         0.14  │           0.01  ✓
        6  │        77  │   92.8%  │         0.15  │           0.01  ✓
        9  │        77  │   92.8%  │         0.18  │           0.01  ✓
       11  │        76  │   91.6%  │         0.45  │           0.01  ✓

  ✓ All round-trips passed
```

## Defaults

For typical web text (JSON, Markdown, HTML, CSS, JS):

- `quality = 6`
- `lgwin = 22`

That is a sane point on the speed/ratio curve. Crank `quality` higher if you
need smaller output and can afford more CPU time.

## Build

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Rust toolchain
- `wasm32-unknown-unknown` target
- `wasm-pack`

Install Rust prerequisites with:

```bash
bun run setup
```

Build everything:

```bash
bun install
bun run build
```

What happens during build:

1. `wasm-pack` builds the compressor crate
2. `wasm-pack` builds the decompressor crate
3. `wasm-opt -Oz` runs if available
4. `bun build` bundles `src/compressor.ts` and `src/decompressor.ts` into `dist/`
5. `tsc` generates declaration files

## Test

Node:

```bash
bun test
```

Browser:

```bash
bun run test:browser
```

## License

MIT
