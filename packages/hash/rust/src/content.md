# `content.rs`

## Purpose

`content.rs` implements the first `defuss-hash` primitive: a stable structural content hash for JSON values.
It is designed for deduplication and "did meaningful content change?" checks, not for security.

## Public WASM surface

- `content_hash(value, skip_paths)`
- `ContentHasher::new(skip_paths)`
- `ContentHasher::hash(value)`

The JavaScript package wraps the WASM exports and exposes:

- `await init()`
- `contentHash(value, skipPaths?)`
- `createContentHasher(skipPaths?)`

## Input assumptions

- input must be JSON-compatible
- object keys are strings
- arrays are ordered
- numbers are JavaScript numbers after WASM boundary conversion
- no guarantees are made for partial inputs; hash the full object graph you care about

Unsupported or non-JSON runtime values should be treated as invalid caller input.

## Skip path syntax

Supported segments:

- `a.b`
- `a.b.*`
- `a.b[0]`
- `a.b[*]`
- `[*].distance`

Semantics:

- terminal path match skips the entire matched subtree
- trailing `*` skips each direct child under the matched container but keeps the parent container shape in the hash
- arrays keep index order for non-skipped items

Examples:

- `x.y` removes `x.y` completely from the hash
- `a.b.*` keeps `a.b` as an object/array container, but ignores its direct children
- `q.z[1].*` keeps `q.z[1]` itself, but ignores its direct children

## Algorithm

1. Parse the skip paths into a compact trie.
2. Walk the JSON value recursively.
3. For objects:
   - collect keys
   - sort them lexicographically
   - hash each remaining `key + child-hash` pair in order
4. For arrays:
   - preserve element order
   - hash `index + child-hash` for each remaining item
5. For scalars:
   - hash type token + canonical scalar bytes
6. Mix into a two-lane 128-bit non-cryptographic digest and return lowercase hex.

## Guarantees

- object key order does not affect the digest
- array order does affect the digest
- skipped paths do not affect the digest
- same effective JSON structure yields the same digest across supported runtimes

## Non-guarantees

- not cryptographically secure
- not suitable for signatures, MACs, or adversarial collision resistance
- numeric representation is based on the JavaScript-visible value after crossing into WASM

## Complexity

Let `n` be the number of visited nodes and `k` the number of keys in an object.

- traversal: `O(n)`
- object key sorting: `O(k log k)` per object
- skip matching: proportional to the active trie frontier, which is typically small

## Why a compiled matcher

Skip paths are compiled once into a trie so repeated hashing does not repeatedly compare every node against every raw path string.
That matters in the boring but lucrative way performance usually matters: less wasted work.
