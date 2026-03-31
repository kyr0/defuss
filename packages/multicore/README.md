# defuss-multicore

Isomorphic multicore execution + loop-unrolled linear algebra for JavaScript/TypeScript.

- **Web Workers** in the browser, **worker_threads** in Node.js - same API
- Auto-splits arrays/TypedArrays across CPU cores
- JIT loop-unrolled vector/matrix ops (4x/8x/16x unroll factors, auto-selected)
- Parallel `map`, `filter`, `reduce` for any array
- Zero dependencies, ESM + CJS dual output

## Install

```bash
bun add defuss-multicore
```

## Quick Start

```ts
import { multicore, dotProduct, matmul, matadd } from "defuss-multicore";

// 1. Wrap any pure function for parallel execution
const parallelSum = multicore(
  (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
  { reduce: (a: number, b: number) => a + b },
);

const total = await parallelSum([1, 2, 3, /* ...millions of items */ ]);

// 2. Use built-in optimized ops
const scores = dotProduct(embeddings, queries);         // Float32Array
const C      = matmul(A, B);                            // Float64Array[]
const sum    = matadd(A, B);                            // Float64Array[]
```

## API

### `multicore(fn, options?)`

Higher-order function that wraps a **pure function** for parallel execution across CPU cores.

```ts
const parallel = multicore(fn, options?);
const results  = await parallel(data);           // collect all results
for await (const r of parallel(data)) { ... }    // stream as workers finish
```

- Array/TypedArray args are **auto-split** across cores
- Scalar args are **broadcast** to every worker
- Returns `ParallelResult<R>` - both `PromiseLike<R[]>` and `AsyncIterable<R>`

#### `MulticoreOptions<R>`

| Option      | Type                      | Default                | Description |
|-------------|---------------------------|------------------------|-------------|
| `cores`     | `number`                  | `navigator.hardwareConcurrency` | Number of worker threads |
| `threshold` | `number`                  | `1024`                 | Min array length before parallelizing (falls back to main thread below this) |
| `reduce`    | `(a: R, b: R) => R`      | -                      | Reduce partial results into a single value |
| `eager`     | `boolean`                 | `false`                | Pre-spawn workers immediately instead of on first call |

#### `CallOptions` (per-call overrides)

| Option     | Type           | Default  | Description |
|------------|----------------|----------|-------------|
| `cores`    | `number`       | -        | Override core count for this call |
| `signal`   | `AbortSignal`  | -        | Cancel in-flight workers |
| `transfer` | `boolean`      | `true`   | Auto-detect and transfer ArrayBuffer ownership (zero-copy) |

### `map(array, fn, options?)`

Parallel `Array.prototype.map`. Distributes work across cores, flattens results.

```ts
import { map } from "defuss-multicore";

const doubled = await map(hugeArray, (x) => x * 2);
```

### `filter(array, fn, options?)`

Parallel `Array.prototype.filter`.

```ts
import { filter } from "defuss-multicore";

const evens = await filter(hugeArray, (x) => x % 2 === 0);
```

### `reduce(array, fn, initial, options?)`

Parallel `Array.prototype.reduce`. Each worker reduces its chunk, then partial results are reduced on the main thread.

```ts
import { reduce } from "defuss-multicore";

const sum = await reduce(hugeArray, (a, b) => a + b, 0);
```

### `dotProduct(as, bs)`

Batch dot product of vector pairs. JIT loop-unrolled (up to 16x unroll).

```ts
import { dotProduct } from "defuss-multicore";

// 100K pairs of 768-dim vectors (e.g. embedding similarity)
const scores: Float32Array = dotProduct(embeddings, queries);
```

- Input: `Float64Array[]` pairs (each inner array is one vector)
- Output: `Float32Array` of dot products

### `matmul(A, B)`

Matrix multiplication with transpose optimization + loop unrolling.

```ts
import { matmul } from "defuss-multicore";

// A: MxK, B: KxN => C: MxN
const C: Float64Array[] = matmul(A, B);
```

### `matadd(A, B)` / `matsub(A, B)` / `matdiv(A, B)`

Element-wise matrix operations with loop unrolling.

```ts
import { matadd, matsub, matdiv } from "defuss-multicore";

const sum  = matadd(A, B);
const diff = matsub(A, B);
const quot = matdiv(A, B);
```

All matrix ops use `Matrix<Float64Array>` - an array of row vectors (`Float64Array[]`).

### `getPoolSize()`

Returns the number of available CPU cores (used as default worker count).

```ts
import { getPoolSize } from "defuss-multicore";

console.log(`Using ${getPoolSize()} cores`);
```

## Types

```ts
type NumericArray = number[] | Float32Array | Float64Array | Int8Array | ...;
type Matrix<T>   = T[];       // Array of row vectors (e.g. Float64Array[])
type Vectors<T>  = T[];       // Array of vectors

interface ParallelResult<R> extends AsyncIterable<R>, PromiseLike<R[]> {}
```

## Benchmark Results

All benchmarks measured on Node.js (worker_threads) on Apple Silicon (10 cores). Median of 5 runs, 2 warmup. Reproduce with `bun run bench`.

### Loop-Unrolled Ops vs Naive Baseline

Single-threaded comparison - same thread, unrolled kernels vs naive loops:

| Operation | Size | Speedup |
|-----------|------|---------|
| **matmul** | 200 x 300 x 200 | **2.36x** |
| **matadd** | 1000 x 1000 | **2.11x** |
| **matmul** | 500 x 500 | **2.06x** |
| **dotProduct** | 100K x 768-dim | **1.46x** |
| **matsub** | 1000 x 1000 | 0.49x |
| **matdiv** | 1000 x 1000 | 0.37x |

Loop unrolling shines on **compute-heavy inner loops** like matrix multiplication, where the unrolled kernel avoids branch overhead and allows the CPU to pipeline instructions. Element-wise ops (add/sub/div) benefit less because the operation per element is trivial - the memory access pattern dominates.

### Multicore Workers vs Single-Thread

Worker parallelism - dispatching across all CPU cores vs running on the main thread:

| Workload | Size | Speedup |
|----------|------|---------|
| **Key stretching** (PBKDF2-like) | 100K x 1000 rounds | **4.89x** |
| **CRC32** (network packets) | 10K x 4KB | **1.31x** |
| **CRC32** (small messages) | 500K x 64B | 0.80x |
| **Transform** (sin+cos) | 5M items | 0.60x |
| **FNV-1a** hash | 1M x 128B | 0.44x |
| **Filter** elements | 2M items | 0.39x |
| **Sum** (accumulate) | 10M items | 0.06x |

## When to Use `multicore()`

The benchmarks tell a clear story: **worker parallelism pays off when each chunk does meaningful CPU work**. The overhead of serializing data, posting messages, and collecting results is ~2-10ms per dispatch. If the per-chunk work is under that threshold, you lose.

### DO: Parallelize These

- **Key derivation / password hashing** - thousands of rounds per item (4.9x speedup)
- **Batch checksumming** (CRC32, SHA, etc.) of large messages - enough work per chunk to amortize dispatch
- **Heavy per-element computation** - image processing, physics simulation, compression
- **Any workload where each chunk runs >5ms** on a single core

### DON'T: Parallelize These

- **Simple reductions** (sum, min, max) - main-thread loop is faster than worker dispatch
- **Trivial transforms** (multiply, add constant) - memory-bandwidth bound, not CPU-bound
- **Small arrays** (<1024 elements) - the `threshold` option exists for this reason
- **Single function calls** - multicore is for **batches**, not individual invocations
- **I/O-bound work** - fetch, file reads, DB queries are already async; workers add overhead

### DO: Use Loop-Unrolled Ops

- **`matmul`** for matrix multiplication, neural network layers (2x+ speedup)
- **`matadd`** for accumulating matrices (2.1x)
- **`dotProduct`** for embedding similarity, cosine distance, attention scores (1.5x+ speedup)

### Key Principles

1. **Measure first.** The `threshold` option exists so small inputs fall back to the main thread automatically. But "small" depends on your workload - a 10K-element array of simple additions is too small; a 10K-element array of 1000-round hash stretches is perfect.

2. **Worker functions must be pure.** They run in isolated contexts - no closures, no imports, no DOM access. Everything the function needs must be passed as arguments or computed inline.

3. **Transferables are auto-detected.** ArrayBuffers are transferred (zero-copy) by default. Disable with `{ transfer: false }` if you need to reuse the buffer after the call.

4. **Use `reduce` for aggregation.** Without it, you get back an array of partial results (one per worker). With `reduce`, partial results are combined into a single value.

5. **Use `eager: true` for latency-sensitive paths.** By default, the worker pool is created lazily on first call. Set `eager: true` to pre-spawn workers at wrap time.

## Pattern: Crypto/Compression Worker

```ts
import { multicore } from "defuss-multicore";

const parallelCRC32 = multicore(
  (seeds: number[]) => {
    // Build CRC32 lookup table inside worker (no closures!)
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      table[i] = c;
    }

    const results = new Uint32Array(seeds.length);
    for (let idx = 0; idx < seeds.length; idx++) {
      const buf = generateMessage(seeds[idx]); // deterministic from seed
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
      }
      results[idx] = (crc ^ 0xFFFFFFFF) >>> 0;
    }
    return results;
  },
  {
    threshold: 256,
    reduce: (a: Uint32Array, b: Uint32Array) => {
      const merged = new Uint32Array(a.length + b.length);
      merged.set(a, 0);
      merged.set(b, a.length);
      return merged;
    },
  },
);

const checksums = await parallelCRC32(messageIndices);
```

## Pattern: Streaming Results

```ts
const parallel = multicore(heavyComputation);

// Stream results as each worker finishes (submission order)
for await (const result of parallel(data)) {
  console.log("Worker finished:", result);
}
```

## Pattern: Cancellation

```ts
const controller = new AbortController();
const parallel = multicore(expensiveFn);

const result = parallel(data, { signal: controller.signal });

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  await result;
} catch (e) {
  console.log("Cancelled");
}
```

## Testing

```bash
# Unit tests (272 tests)
bun run test

# Browser E2E tests via Playwright (21 tests)
bun run test:browser
```

## Requirements

- **Node.js** ^18.17.1 || ^20.3.0 || >=21.0.0
- **Browser** Any browser with Web Workers + structured clone

## License

MIT
