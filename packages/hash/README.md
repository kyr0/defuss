# `defuss-hash`

A library of fast, stable, special-purpose hashing functions:

- **Content hashing** - JIT-optimized pure TypeScript object hashing with key-order stability and path-based subtree skipping.
- **Rendezvous hashing** - minimal-disruption consistent hashing for distributing work items across peers.

## Installation

```bash
bun add defuss-hash
```

## Usage

The primary `contentHash` function is a pure TypeScript implementation - **no WASM, no `init()` call, no async setup**. It works immediately:

```ts
import { contentHash, createContentHasher } from "defuss-hash";

// Hash any JS value - key-order independent, stable
const hash = contentHash(data);

// With skip paths - exclude subtrees from the hash
const skip = ["[*].distance", "[*].tsz", "[*].nteStart", "[*].nteEnde"];
const filtered = contentHash(data, skip);

// Reusable hasher - pre-compiles skip trie for repeated calls
const hasher = createContentHasher(skip);
const next = hasher.hash(data);
```

## Benchmark Results

Measured on a 256-element fixture array with 4 skip paths using `bun bench` (Vitest bench, V8/Node):

| Implementation | ops/s | Relative |
|---|---|---|
| `contentHash` (pure TS, with skip) | **~1,200** | **baseline** |
| `createContentHasher().hash` (reused, with skip) | **~1,380** | 1.14× |
| naive `md5(JSON.stringify())` - no stability, no skip | ~1,490 | 1.23× |
| stable stringify + skip + md5 (JS-only equivalent) | ~430 | 0.35× |

### Why is pure TS the default?

The pure TypeScript hasher runs at **~1,380 ops/s** (reused hasher) vs naive `md5(JSON.stringify())` at ~1,490 ops/s. It is close in raw speed while providing guarantees that naive `md5` doesn't:

1. **Key-order stability** - `{a:1, b:2}` and `{b:2, a:1}` produce the same hash. Naive md5 doesn't because `JSON.stringify` output depends on insertion order.
2. **Skip paths** - you can exclude subtrees like `[*].distance` from the hash. Naive `md5` hashes everything.

On top of that, the pure TS hasher is about **3 times faster** than the semantically equivalent JS baseline (`stable stringify + skip + md5` at ~430 ops/s), because it walks the object graph directly instead of materializing an intermediate canonical JSON string.

### JIT optimization techniques

The pure TS hasher is designed for V8 TurboFan and JavaScriptCore JIT optimizations:

- Code written to yield 4 x 32-bit hash lanes using MurmurHash3 fmix32 mixing
- All hash state in local variables (register-allocated)
- Module-level result registers - zero per-call allocation
- Unrolled string hashing (4 chars/iteration, no branching in loop body)
- Shared `Float64Array` for f64 => bits extraction (allocated once at module load)
- Pre-compiled skip trie with depth-indexed state buffers
- `Math.imul` + bitwise ops stay on the `int32` fast path

## API

### `contentHash(value, skipPaths?)`
Primary. Pure TypeScript - hashes any JS value and returns a stable 128-bit lowercase hex digest (32 chars). No `init()` required.

### `createContentHasher(skipPaths?)`
Creates a reusable hasher with pre-compiled skip trie. Amortises trie compilation across repeated `hash()` calls.

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
