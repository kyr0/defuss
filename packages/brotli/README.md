# `defuss-brotli`

A split pure-Rust Brotli package for Node.js + browsers.

- **Small browser decoder bundle** - import only the decompressor, skip the encoder WASM entirely
- **Separate heavier encoder bundle** - used server-side or at build time
- **Single NPM package** with split exports
- **Pure-Rust WebAssembly** - no native addons
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
| `compress(bytes, opts)` | `Uint8Array` | None - bytes pass through as-is | Binary data, files, pre-encoded buffers |
| `compressText(text, opts)` | `string` | `TextEncoder` (UTF-8) applied internally | JSON, HTML, Markdown, any JS string |

**Why `TextEncoder`?** JS strings are UTF-16 internally, but Brotli operates on
raw bytes. `TextEncoder` converts to canonical UTF-8 - the standard encoding for
web text. `compressText` handles this so you don't have to.

### `decompress` vs `decompressText`

| Function | Output | Decoding | When to use |
|---|---|---|---|
| `decompress(bytes, opts)` | `Uint8Array` | None - raw bytes returned | Binary data, custom decoding |
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

- **`quality`** - 0 is fastest/largest, 11 is slowest/smallest. 5–7 is the sweet spot for on-the-fly web serving.
- **`lgwin`** - Sliding window size exponent. Larger windows find more matches at the cost of memory. 22 covers most web-text repetition patterns.

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
- `init()` is **idempotent** - calling it multiple times returns the same Promise and does not reload WASM.
- Importing only `defuss-brotli/decompressor` **never loads** the encoder WASM binary.

### Limits

- `quality` must be an integer in **0–11** (Brotli spec hard limit).
- `lgwin` must be an integer in **10–24** (Brotli spec hard limit).
- `maxOutputSize` defaults to **64 MiB** - the WASM module rejects output exceeding this.
- Browser WASM memory is capped at **~2 GB** on 64-bit platforms (practical upper bound for very large payloads).

## Why the Split Exports?

The encoder and decoder are built from **two separate Rust Wasm crates**:

| Export | Rust crate | WASM size | Bundle (JS + WASM) | Typical use |
|---|---|---|---|---|
| `defuss-brotli/compressor` | `brotli` | 984 KB | 1.3 MB | Server-side, build pipelines |
| `defuss-brotli/decompressor` | `brotli-decompressor` | 208 KB | 276 KB | Browser clients |

Browser apps that only decompress pre-compressed data import just the decompressor, keeping the bundle small.

## Benchmarks

Measured with `vitest bench` on the payloads shown. Numbers are **ops/sec** (higher is better).

Run benchmarks yourself:

```bash
bun run bench           # Node.js
bun run bench:browser   # Chromium via Playwright
```

### Node.js (Bun)

**Text Compression – `compressText`** (ops/sec, higher is better):

| Payload | Quality 1 | Quality 6 | Quality 11 |
|---|---|---|---|
| Short JSON (83 B) | – | 33,773 | – |
| Markdown (2 KB) | 16,612 | 10,098 | 327 |
| HTML (8 KB) | 5,010 | 2,473 | 19 |

**Binary Compression – `compress`** (ops/sec):

| Payload | Quality 1 | Quality 6 | Quality 11 |
|---|---|---|---|
| Pseudorandom (512 B) | – | 25,331 | – |
| SVG (4.9 MB) | 8.6 | 4.2 | 0.15 |
| PNG (2.1 MB) | 39.2 | 81.4 | 0.21 |

PNG compresses faster than SVG at q6 because already-compressed data triggers
Brotli's fast-path fallback earlier, producing less work per byte.

**Text Decompression – `decompressText`** (ops/sec):

| Payload | ops/sec |
|---|---|
| Short JSON (83 B) | 143,102 |
| Markdown (2 KB) | 46,341 |
| HTML (8 KB) | 34,720 |

**Binary Decompression – `decompress`** (ops/sec):

| Payload | ops/sec |
|---|---|
| Pseudorandom (512 B) | 111,424 |
| SVG (4.9 MB) | 34.5 |
| PNG (2.1 MB) | 654 |

### Browser (Chromium)

**Text Compression – `compressText`** (ops/sec, higher is better):

| Payload | Quality 1 | Quality 6 | Quality 11 |
|---|---|---|---|
| Short JSON (83 B) | – | 36,264 | – |
| Markdown (2 KB) | 36,002 | 12,932 | 408 |
| HTML (8 KB) | 8,222 | 2,535 | 19 |

**Binary Compression – `compress`** (ops/sec):

| Payload | Quality 1 | Quality 6 | Quality 11 |
|---|---|---|---|
| Pseudorandom (512 B) | – | 29,712 | – |
| SVG (4.9 MB) | 15.9 | 4.8 | 0.15 |

**Text Decompression – `decompressText`** (ops/sec):

| Payload | ops/sec |
|---|---|
| Short JSON (83 B) | 157,906 |
| Markdown (2 KB) | 51,946 |
| HTML (8 KB) | 35,990 |

**Binary Decompression – `decompress`** (ops/sec):

| Payload | ops/sec |
|---|---|
| Pseudorandom (512 B) | 122,072 |
| SVG (4.9 MB) | 39.7 |
| PNG (2.1 MB) | 841 |

## Examples

Run the quality comparison example to see compression ratios at different quality levels:

```bash
bun run example
```

Sample output:

```
════════════════════════════════════════════════════════════════════════
  Short JSON (~83 B)  (83 B input)
════════════════════════════════════════════════════════════════════════
  Quality  │      Output  │    Ratio  │  Compress ms  │  Decompress ms
  ───────  │  ──────────  │  ───────  │  ───────────  │  ─────────────
        1  │        87 B  │   104.8%  │         1.22  │           0.39
        4  │        83 B  │   100.0%  │         0.38  │           0.39
        6  │        80 B  │    96.4%  │         1.41  │           0.22
        9  │        80 B  │    96.4%  │         2.14  │           0.19
       11  │        85 B  │   102.4%  │         3.44  │           0.21

════════════════════════════════════════════════════════════════════════
  Pseudorandom binary (512 B)  (512 B input)
════════════════════════════════════════════════════════════════════════
  Quality  │      Output  │    Ratio  │  Compress ms  │  Decompress ms
  ───────  │  ──────────  │  ───────  │  ───────────  │  ─────────────
        1  │       286 B  │    55.9%  │         0.08  │           0.88
        4  │       278 B  │    54.3%  │         0.27  │           0.07
        6  │       270 B  │    52.7%  │         0.34  │           0.09
        9  │       259 B  │    50.6%  │         0.65  │           0.05
       11  │       239 B  │    46.7%  │         3.16  │           0.39

════════════════════════════════════════════════════════════════════════
  SVG (4.9 MB)  (4.9 MB input)
════════════════════════════════════════════════════════════════════════
  Quality  │      Output  │    Ratio  │  Compress ms  │  Decompress ms
  ───────  │  ──────────  │  ───────  │  ───────────  │  ─────────────
        1  │      2.8 MB  │    57.0%  │        67.01  │          70.33
        4  │      1.9 MB  │    38.0%  │        85.98  │          41.85
        6  │      1.8 MB  │    37.4%  │       203.16  │          42.70
        9  │      1.8 MB  │    36.8%  │       506.93  │          41.66
       11  │      1.7 MB  │    34.5%  │      5108.92  │          47.78

════════════════════════════════════════════════════════════════════════
  PNG (2.1 MB)  (2.1 MB input)
════════════════════════════════════════════════════════════════════════
  Quality  │      Output  │    Ratio  │  Compress ms  │  Decompress ms
  ───────  │  ──────────  │  ───────  │  ───────────  │  ─────────────
        1  │      2.1 MB  │   100.1%  │        16.59  │          11.37
        4  │      2.1 MB  │   100.0%  │         6.00  │          10.96
        6  │      2.1 MB  │   100.0%  │        13.40  │          11.11
        9  │      2.0 MB  │    99.0%  │       192.97  │          23.06
       11  │      2.0 MB  │    96.2%  │      3101.38  │          30.33

════════════════════════════════════════════════════════════════════════
 All round-trips passed
════════════════════════════════════════════════════════════════════════
```

**Key takeaways:**

- **SVG** (text-based) compresses well: 57% → 34.5% ratio as quality increases, at the cost of much longer compression times at q11.
- **PNG** (already compressed) barely shrinks: ~100% ratio at q1–q6, only 96% at q11 — Brotli can't improve on an already-compressed binary format.
- **Short text** can actually *grow* at low quality levels (104.8% at q1) — the Brotli header overhead exceeds the savings on tiny payloads.

## Defaults

For typical web text (JSON, Markdown, HTML, CSS, JS):

- `quality = 6`
- `lgwin = 22`

That is a sane point on the speed/ratio curve. Crank `quality` higher if you
need smaller output and can afford more CPU time.

## Build

### Prerequisites

- [Bun](https://bun.sh/) >= 1.0
- Rust toolchain + `wasm32-unknown-unknown` target
- `wasm-pack`
- `wasm-opt` (optional, from [binaryen](https://github.com/WebAssembly/binaryen) — produces smaller WASM)

Install everything automatically (cross-platform — installs Rust/wasm-pack if missing):

```bash
make setup
# or
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

## Test and Benchmark

Node:

```bash
bun test
bun example
bun test:e2e

bun bench
bun bench:browser
```

Browser:

```bash
bun run test:browser
```

## License

MIT
