# `defuss-hash`

A library of fast, stable, special-purpose hashing functions:

- **Content hashing** — key-order-independent JSON object hashing in Rust + WebAssembly, with path-based subtree skipping.
- **Rendezvous hashing** — minimal-disruption consistent hashing for distributing work items across peers.

## Installation

```bash
bun add defuss-hash
```

## Prerequisites (WASM content hashing)

The content hashing module requires Rust, the `wasm32-unknown-unknown` target, and `wasm-pack`. Run the setup script to install everything:

```bash
bun run setup
```

This installs / verifies:
- Stable Rust toolchain (via `rust-toolchain.toml`)
- `wasm32-unknown-unknown` target
- `wasm-pack`

Then build:

```bash
bun run build
```

## Usage

```ts
import { init, contentHash, createContentHasher } from "defuss-hash";

await init();

const skip = [
  "[*].distance",
  "[*].tsz",
  "[*].nteStart",
  "[*].nteEnde",
];

const hash = contentHash(data, skip);
const hasher = createContentHasher(skip);
const next = hasher.hash(data);
```

## API

### `await init(input?)`
Loads the ready-built WASM module once.

### `contentHash(value, skipPaths?)`
Hashes a JSON value and returns a stable lowercase hex digest.

### `createContentHasher(skipPaths?)`
Compiles the skip matcher once and reuses it across repeated hashes.

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
