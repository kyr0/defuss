# `defuss-hash`

A library of fast, stable, special-purpose hashing functions:

- **Content hashing** — JIT-optimized pure TypeScript object hashing with key-order stability and path-based subtree skipping. Optional Rust + WebAssembly backend for JSON string inputs.
- **Rendezvous hashing** — minimal-disruption consistent hashing for distributing work items across peers.

## Installation

```bash
bun add defuss-hash
```

## Usage

The primary `contentHash` function is a pure TypeScript implementation — **no WASM, no `init()` call, no async setup**. It works immediately:

```ts
import { contentHash, createContentHasher } from "defuss-hash";

// Hash any JS value — key-order independent, stable
const hash = contentHash(data);

// With skip paths — exclude subtrees from the hash
const skip = ["[*].distance", "[*].tsz", "[*].nteStart", "[*].nteEnde"];
const filtered = contentHash(data, skip);

// Reusable hasher — pre-compiles skip trie for repeated calls
const hasher = createContentHasher(skip);
const next = hasher.hash(data);
```

### WASM backend (optional)

For hashing JSON strings or byte buffers directly in Rust, use the WASM variants. These require a one-time `init()` call:

```ts
import {
  init,
  contentHashWasm,
  contentHashJson,
  contentHashJsonBytes,
  createContentHasherWasm,
} from "defuss-hash";

await init();

// Hash a JS value via WASM (slower — pays JS→WASM object clone cost)
contentHashWasm(data, skip);

// Hash a JSON string directly in Rust (fast — no object clone)
contentHashJson(jsonString, skip);

// Hash raw JSON bytes (e.g. from fetch response body)
contentHashJsonBytes(uint8Array, skip);

// Reusable WASM hasher
const hasher = createContentHasherWasm(skip);
hasher.hash(data);
hasher.hashJson(jsonString);
hasher.hashJsonBytes(uint8Array);
```

## Benchmark Results

Measured on a 256-element fixture array with 4 skip paths, using Vitest bench (V8/Node):

| Implementation | ops/s | Relative |
|---|---|---|
| `contentHash` (pure TS, with skip) | **~1,400** | **baseline** |
| `createContentHasher().hash` (reused, with skip) | **~1,430** | 1.02× |
| naive `md5(JSON.stringify())` — no stability, no skip | ~1,490 | 1.06× |
| `contentHashJson` (WASM, JSON string, with skip) | ~690 | 0.49× |
| `JSON.stringify` + `contentHashJson` (full round-trip) | ~550 | 0.39× |
| stable stringify + skip + md5 (JS-only equivalent) | ~430 | 0.30× |
| `contentHashWasm` (WASM, JsValue crossing, with skip) | ~230 | 0.16× |

### Why is pure TS the default?

The pure TypeScript hasher runs at **~1,430 ops/s** — within ~2% of naive `md5(JSON.stringify())` at ~1,490 ops/s. It's essentially the same speed, but provides two guarantees that naive md5 doesn't:

1. **Key-order stability** — `{a:1, b:2}` and `{b:2, a:1}` produce the same hash. Naive md5 doesn't because `JSON.stringify` output depends on insertion order.
2. **Skip paths** — you can exclude subtrees like `[*].distance` from the hash. Naive md5 hashes everything.

On top of that, the pure TS hasher is **3.3× faster** than the semantically equivalent JS baseline (stable stringify + skip + md5 at ~430 ops/s) and **6× faster** than the WASM convenience path — because it walks the JS object graph directly in V8-optimized code, avoiding both JSON serialization and the JS→WASM boundary crossing.

The WASM backend (`contentHashJson`) remains useful when you already have a JSON string or byte buffer (e.g. from a network response) and want to hash it without parsing into JS objects first. In that scenario it runs at ~690 ops/s with no `JSON.parse` overhead.

### JIT optimization techniques

The pure TS hasher is designed for V8 TurboFan:

- 4×32-bit hash lanes using MurmurHash3 fmix32 mixing
- All hash state in local variables (register-allocated)
- Module-level result registers — zero per-call allocation
- Unrolled string hashing (4 chars/iteration, no branching in loop body)
- Shared `Float64Array` for f64→bits extraction (allocated once at module load)
- Pre-compiled skip trie with depth-indexed state buffers
- `Math.imul` + bitwise ops stay on the int32 fast path

## API

### `contentHash(value, skipPaths?)`
Primary. Pure TypeScript — hashes any JS value and returns a stable 128-bit lowercase hex digest (32 chars). No `init()` required.

### `createContentHasher(skipPaths?)`
Creates a reusable hasher with pre-compiled skip trie. Amortises trie compilation across repeated `hash()` calls.

### `await init()`
Loads the WASM module. Required before using any `*Wasm` or `*Json` functions.

### `contentHashWasm(value, skipPaths?)`
Hashes a JS value via the Rust/WASM backend. Requires `init()`.

### `contentHashJson(json, skipPaths?)`
Hashes a JSON string directly in Rust — avoids JS→WASM object clone. Requires `init()`.

### `contentHashJsonBytes(bytes, skipPaths?)`
Hashes raw JSON bytes (`Uint8Array`) in Rust. Requires `init()`.

### `createContentHasherWasm(skipPaths?)`
Creates a reusable WASM hasher with `.hash()`, `.hashJson()`, and `.hashJsonBytes()` methods.

## Skip path syntax

- `a.b`
- `a.b.*`
- `a.b[0]`
- `a.b[*]`
- `[*].distance`

A terminal skip path removes the whole matched subtree from the hash.
A trailing `*` skips the matched node's direct children while preserving the parent container shape.

## Guarantees

- object key order does not affect the hash
- array order does affect the hash
- skipped paths do not affect the hash
- only JSON values are supported

See [`rust/src/content.md`](./rust/src/content.md) for the algorithm notes and constraints.

## Rendezvous Hashing

Deterministic, minimal-disruption work-item assignment across a set of peers. When a peer joins or leaves, only ~`1/n` of keys are remapped.

```ts
import {
  pickResponsiblePeer,
  isResponsibleForWorkItem,
} from "defuss-hash";

const peers = ["peer-0", "peer-1", "peer-2"];

// Deterministically pick the responsible peer for a work item
const owner = pickResponsiblePeer("work-item-42", peers);

// Check if a specific peer is responsible
const isMine = isResponsibleForWorkItem("peer-1", "work-item-42", peers);
```
