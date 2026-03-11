/**
 * JIT-optimized pure TypeScript content hasher.
 * Walks JS objects directly - no WASM boundary, no serialization.
 *
 * V8 TurboFan optimization strategies used:
 * - All hash state in local `let` variables (register-allocated by TurboFan)
 * - Module-level result registers (_r0 to _r3) avoid per-call heap allocation
 * - Shared Float64Array for f64→bits (allocated once at module load)
 * - Small functions (< 600 bytes bytecode) for automatic inlining
 * - Unrolled string hashing (4 chars per iteration, packed into 32-bit words)
 * - No branching in unrolled loop bodies
 * - Math.imul + bitwise ops stay on the int32 fast path
 * - Pre-compiled skip trie with depth-indexed state buffers (zero alloc)
 * - typeof-based dispatch (fast hidden-class tag check in V8)
 *
 * Hash output: 128-bit (32 hex chars).
 * Independent algorithm - values differ from the WASM version.
 */

// ================================================================
//  Shared buffers - allocated once at module load
// ================================================================

/** Extract f64 bit pattern as two u32 values */
const _f64 = new Float64Array(1);
const _u32 = new Uint32Array(_f64.buffer);

// ================================================================
//  Result registers
//
//  All hash functions write their 128-bit result here.
//  The caller saves its accumulator state in locals before each
//  recursive call, then reads _r0 to _r3 after it returns.
// ================================================================

let _r0 = 0;
let _r1 = 0;
let _r2 = 0;
let _r3 = 0;

// ================================================================
//  Constants
// ================================================================

// Type tokens
const N  = 0x42108421 | 0; // null
const TR = 0x42108422 | 0; // true
const FL = 0x42108423 | 0; // false
const DG = 0x42108424 | 0; // number
const SV = 0x42108425 | 0; // string value
const AR = 0x42108426 | 0; // array
const OB = 0x42108427 | 0; // object
const KY = 0x42108428 | 0; // object key
const CT = 0x42108429 | 0; // count sentinel

// Seeds (pi fractional bits)
const P0 = 0x243f6a88 | 0;
const P1 = 0x85a308d3 | 0;
const P2 = 0x13198a2e | 0;
const P3 = 0x03707344 | 0;

// MurmurHash3 finalizer multipliers
const M0 = 0x85ebca6b | 0;
const M1 = 0xc2b2ae35 | 0;

// ================================================================
//  Hex lookup - 256 pre-built 2-char hex strings
// ================================================================

const _H: string[] = /* @__PURE__ */ (() => {
  const t: string[] = new Array(256);
  for (let i = 0; i < 256; i++) t[i] = (i < 16 ? "0" : "") + i.toString(16);
  return t;
})();

function toHex(): string {
  const a = _r0 >>> 0;
  const b = _r1 >>> 0;
  const c = _r2 >>> 0;
  const d = _r3 >>> 0;
  return (
    _H[a >>> 24] + _H[(a >>> 16) & 0xff] + _H[(a >>> 8) & 0xff] + _H[a & 0xff] +
    _H[b >>> 24] + _H[(b >>> 16) & 0xff] + _H[(b >>> 8) & 0xff] + _H[b & 0xff] +
    _H[c >>> 24] + _H[(c >>> 16) & 0xff] + _H[(c >>> 8) & 0xff] + _H[c & 0xff] +
    _H[d >>> 24] + _H[(d >>> 16) & 0xff] + _H[(d >>> 8) & 0xff] + _H[d & 0xff]
  );
}

// ================================================================
//  MurmurHash3 fmix32 - core mixing primitive
//  Tiny enough that TurboFan will always inline it.
// ================================================================

function mx(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, M0);
  h ^= h >>> 13;
  h = Math.imul(h, M1);
  h ^= h >>> 16;
  return h | 0;
}

// ================================================================
//  Leaf hashers - write 128-bit result to _r0 to _r3
// ================================================================

function hNull(): void {
  _r0 = mx(mx(P0 ^ N));
  _r1 = mx(mx(P1 ^ N));
  _r2 = mx(mx(P2 ^ N));
  _r3 = mx(mx(P3 ^ N));
}

function hBool(v: boolean): void {
  const t = v ? TR : FL;
  _r0 = mx(mx(P0 ^ t));
  _r1 = mx(mx(P1 ^ t));
  _r2 = mx(mx(P2 ^ t));
  _r3 = mx(mx(P3 ^ t));
}

function hNum(n: number): void {
  _f64[0] = n;
  const lo = _u32[0] | 0;
  const hi = _u32[1] | 0;
  _r0 = mx(mx(P0 ^ DG) ^ lo);
  _r1 = mx(mx(P1 ^ DG) ^ hi);
  _r2 = mx(mx(P2 ^ DG) ^ lo);
  _r3 = mx(mx(P3 ^ DG) ^ hi);
}

/**
 * Hash a string with a type token (SV for values, KY for object keys).
 * Unrolled ×4: processes 4 chars per iteration as two packed 32-bit words.
 * Cross-lane mixing: lanes a/d get w0, lanes b/c get w1 in round 1,
 * then swap in round 2 for full independence.
 */
function hStr(s: string, tok: number): void {
  let a = mx(P0 ^ tok) | 0;
  let b = mx(P1 ^ tok) | 0;
  let c = mx(P2 ^ tok) | 0;
  let d = mx(P3 ^ tok) | 0;

  const len = s.length;
  a = mx(a ^ len);
  b = mx(b ^ len);
  c = mx(c ^ len);
  d = mx(d ^ len);

  // ---- Unrolled ×4 body (no branching) ----
  let i = 0;
  const end4 = len - 3;
  for (; i < end4; i += 4) {
    const c0 = s.charCodeAt(i) | 0;
    const c1 = s.charCodeAt(i + 1) | 0;
    const c2 = s.charCodeAt(i + 2) | 0;
    const c3 = s.charCodeAt(i + 3) | 0;
    // Round 1: a←c0, b←c1, c←c2, d←c3
    a = Math.imul(a ^ c0, M0) | 0; a ^= a >>> 16;
    b = Math.imul(b ^ c1, M1) | 0; b ^= b >>> 16;
    c = Math.imul(c ^ c2, M0) | 0; c ^= c >>> 16;
    d = Math.imul(d ^ c3, M1) | 0; d ^= d >>> 16;
    // Round 2 cross-mix: a←c2, b←c3, c←c0, d←c1
    a = Math.imul(a ^ c2, M1) | 0; a ^= a >>> 16;
    b = Math.imul(b ^ c3, M0) | 0; b ^= b >>> 16;
    c = Math.imul(c ^ c0, M1) | 0; c ^= c >>> 16;
    d = Math.imul(d ^ c1, M0) | 0; d ^= d >>> 16;
  }

  // ---- Remainder (0–3 chars) ----
  for (; i < len; i++) {
    const ch = s.charCodeAt(i) | 0;
    a = Math.imul(a ^ ch, M0) | 0; a ^= a >>> 16;
    b = Math.imul(b ^ ch, M1) | 0; b ^= b >>> 16;
    c = Math.imul(c ^ ch, M0) | 0; c ^= c >>> 16;
    d = Math.imul(d ^ ch, M1) | 0; d ^= d >>> 16;
  }

  _r0 = mx(a);
  _r1 = mx(b);
  _r2 = mx(c);
  _r3 = mx(d);
}

// ================================================================
//  Skip trie
// ================================================================

interface TrieNode {
  keys: Map<string, number>;
  indices: Map<number, number>;
  wild: number;    // child index for [*] or *, or -1
  terminal: boolean;
}

function newTrieNode(): TrieNode {
  return { keys: new Map(), indices: new Map(), wild: -1, terminal: false };
}

// Pre-allocated depth-indexed state buffers.
// Eliminates per-element Vec/Array allocation during tree walk.
const _TRIE_MAX_DEPTH = 64;
const _tS: number[][] = [];
const _tC: number[] = new Array(_TRIE_MAX_DEPTH).fill(0);
for (let _i = 0; _i < _TRIE_MAX_DEPTH; _i++) _tS[_i] = new Array(16).fill(0);
let _tD = 0;

/** Compile skip path strings into a trie (cold path, called once). */
function compileTrie(paths: readonly string[]): TrieNode[] {
  const nodes: TrieNode[] = [newTrieNode()];

  function addNode(): number {
    nodes.push(newTrieNode());
    return nodes.length - 1;
  }

  for (const path of paths) {
    let cursor = 0;
    let i = 0;
    let segStart = 0;

    while (i < path.length) {
      if (path[i] === ".") {
        if (segStart < i) {
          const seg = path.slice(segStart, i);
          cursor = seg === "*" ? ensureWild(cursor) : ensureKey(cursor, seg);
        }
        segStart = ++i;
      } else if (path[i] === "[") {
        if (segStart < i) {
          const seg = path.slice(segStart, i);
          cursor = seg === "*" ? ensureWild(cursor) : ensureKey(cursor, seg);
        }
        const close = path.indexOf("]", i + 1);
        if (close < 0) throw new Error(`Unterminated bracket in "${path}"`);
        const inner = path.slice(i + 1, close);
        if (inner === "*") {
          cursor = ensureWild(cursor);
        } else {
          const idx = Number(inner);
          if (!Number.isFinite(idx)) throw new Error(`Invalid index in "${path}"`);
          cursor = ensureIdx(cursor, idx);
        }
        i = close + 1;
        if (i < path.length && path[i] === ".") i++;
        segStart = i;
      } else {
        i++;
      }
    }

    if (segStart < path.length) {
      const seg = path.slice(segStart);
      cursor = seg === "*" ? ensureWild(cursor) : ensureKey(cursor, seg);
    }

    nodes[cursor].terminal = true;
  }

  return nodes;

  function ensureKey(at: number, key: string): number {
    let child = nodes[at].keys.get(key);
    if (child === undefined) { child = addNode(); nodes[at].keys.set(key, child); }
    return child;
  }
  function ensureIdx(at: number, idx: number): number {
    let child = nodes[at].indices.get(idx);
    if (child === undefined) { child = addNode(); nodes[at].indices.set(idx, child); }
    return child;
  }
  function ensureWild(at: number): number {
    if (nodes[at].wild >= 0) return nodes[at].wild;
    return (nodes[at].wild = addNode());
  }
}

/**
 * Advance trie by an object key.
 * Reads from _tS[_tD], writes next states to _tS[_tD + 1].
 * Returns true if any reached state is terminal (= skip this subtree).
 */
function advKey(nodes: TrieNode[], key: string): boolean {
  const src = _tS[_tD];
  const srcN = _tC[_tD];
  const dst = _tS[_tD + 1];
  let dstN = 0;
  let skip = false;

  for (let s = 0; s < srcN; s++) {
    const node = nodes[src[s]];

    const child = node.keys.get(key);
    if (child !== undefined) {
      if (nodes[child].terminal) skip = true;
      let dup = false;
      for (let j = 0; j < dstN; j++) if (dst[j] === child) { dup = true; break; }
      if (!dup) dst[dstN++] = child;
    }

    if (node.wild >= 0) {
      const wc = node.wild;
      if (nodes[wc].terminal) skip = true;
      let dup = false;
      for (let j = 0; j < dstN; j++) if (dst[j] === wc) { dup = true; break; }
      if (!dup) dst[dstN++] = wc;
    }
  }

  _tC[_tD + 1] = dstN;
  return skip;
}

/**
 * Advance trie by an array index.
 * Reads from _tS[_tD], writes next states to _tS[_tD + 1].
 * Returns true if any reached state is terminal (= skip).
 */
function advIdx(nodes: TrieNode[], index: number): boolean {
  const src = _tS[_tD];
  const srcN = _tC[_tD];
  const dst = _tS[_tD + 1];
  let dstN = 0;
  let skip = false;

  for (let s = 0; s < srcN; s++) {
    const node = nodes[src[s]];

    const child = node.indices.get(index);
    if (child !== undefined) {
      if (nodes[child].terminal) skip = true;
      let dup = false;
      for (let j = 0; j < dstN; j++) if (dst[j] === child) { dup = true; break; }
      if (!dup) dst[dstN++] = child;
    }

    if (node.wild >= 0) {
      const wc = node.wild;
      if (nodes[wc].terminal) skip = true;
      let dup = false;
      for (let j = 0; j < dstN; j++) if (dst[j] === wc) { dup = true; break; }
      if (!dup) dst[dstN++] = wc;
    }
  }

  _tC[_tD + 1] = dstN;
  return skip;
}

// ================================================================
//  Tree walker - no-skip (hot path, fully inlined mixing)
// ================================================================

function hVal(v: unknown): void {
  if (v === null) { hNull(); return; }
  switch (typeof v) {
    case "boolean": hBool(v as boolean); return;
    case "number":  hNum(v as number); return;
    case "string":  hStr(v as string, SV); return;
    case "object":
      if (Array.isArray(v)) hArr(v);
      else hObj(v as Record<string, unknown>);
      return;
  }
}

function hArr(arr: unknown[]): void {
  let a0 = mx(P0 ^ AR) | 0;
  let a1 = mx(P1 ^ AR) | 0;
  let a2 = mx(P2 ^ AR) | 0;
  let a3 = mx(P3 ^ AR) | 0;
  const len = arr.length;

  for (let i = 0; i < len; i++) {
    // Mix array index
    a0 = mx(a0 ^ i); a1 = mx(a1 ^ i);
    a2 = mx(a2 ^ i); a3 = mx(a3 ^ i);
    // Hash child value (writes _r0…_r3)
    hVal(arr[i]);
    // Mix child hash into accumulator
    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);
  }

  const cnt = CT ^ len;
  _r0 = mx(a0 ^ cnt); _r1 = mx(a1 ^ cnt);
  _r2 = mx(a2 ^ cnt); _r3 = mx(a3 ^ cnt);
}

function hObj(obj: Record<string, unknown>): void {
  const keys = Object.keys(obj);
  keys.sort();
  let a0 = mx(P0 ^ OB) | 0;
  let a1 = mx(P1 ^ OB) | 0;
  let a2 = mx(P2 ^ OB) | 0;
  let a3 = mx(P3 ^ OB) | 0;
  let count = 0;
  const len = keys.length;

  for (let i = 0; i < len; i++) {
    const key = keys[i];
    const val = obj[key];
    if (val === undefined) continue; // match JSON.stringify semantics

    // Hash key
    hStr(key, KY);
    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);
    // Hash value
    hVal(val);
    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);
    count++;
  }

  const cnt = CT ^ count;
  _r0 = mx(a0 ^ cnt); _r1 = mx(a1 ^ cnt);
  _r2 = mx(a2 ^ cnt); _r3 = mx(a3 ^ cnt);
}

// ================================================================
//  Tree walker - with skip trie
// ================================================================

function hValS(v: unknown, tr: TrieNode[]): void {
  if (v === null) { hNull(); return; }
  switch (typeof v) {
    case "boolean": hBool(v as boolean); return;
    case "number":  hNum(v as number); return;
    case "string":  hStr(v as string, SV); return;
    case "object":
      if (Array.isArray(v)) hArrS(v, tr);
      else hObjS(v as Record<string, unknown>, tr);
      return;
  }
}

function hArrS(arr: unknown[], tr: TrieNode[]): void {
  const depth = _tD;
  let a0 = mx(P0 ^ AR) | 0;
  let a1 = mx(P1 ^ AR) | 0;
  let a2 = mx(P2 ^ AR) | 0;
  let a3 = mx(P3 ^ AR) | 0;
  let count = 0;
  const len = arr.length;

  for (let i = 0; i < len; i++) {
    _tD = depth;
    if (advIdx(tr, i)) continue;

    a0 = mx(a0 ^ i); a1 = mx(a1 ^ i);
    a2 = mx(a2 ^ i); a3 = mx(a3 ^ i);

    _tD = depth + 1;
    hValS(arr[i], tr);

    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);
    count++;
  }

  _tD = depth;
  const cnt = CT ^ count;
  _r0 = mx(a0 ^ cnt); _r1 = mx(a1 ^ cnt);
  _r2 = mx(a2 ^ cnt); _r3 = mx(a3 ^ cnt);
}

function hObjS(obj: Record<string, unknown>, tr: TrieNode[]): void {
  const depth = _tD;
  const keys = Object.keys(obj);
  keys.sort();
  let a0 = mx(P0 ^ OB) | 0;
  let a1 = mx(P1 ^ OB) | 0;
  let a2 = mx(P2 ^ OB) | 0;
  let a3 = mx(P3 ^ OB) | 0;
  let count = 0;
  const len = keys.length;

  for (let i = 0; i < len; i++) {
    const key = keys[i];
    const val = obj[key];
    if (val === undefined) continue;

    _tD = depth;
    if (advKey(tr, key)) continue;

    hStr(key, KY);
    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);

    _tD = depth + 1;
    hValS(val, tr);

    a0 = mx(a0 ^ _r0); a1 = mx(a1 ^ _r1);
    a2 = mx(a2 ^ _r2); a3 = mx(a3 ^ _r3);
    count++;
  }

  _tD = depth;
  const cnt = CT ^ count;
  _r0 = mx(a0 ^ cnt); _r1 = mx(a1 ^ cnt);
  _r2 = mx(a2 ^ cnt); _r3 = mx(a3 ^ cnt);
}

// ================================================================
//  Public API
// ================================================================

/**
 * Pure TypeScript content hash - walks JS objects directly.
 * No WASM, no serialization, no init() needed.
 * Returns a 128-bit hex string (32 chars).
 *
 * Note: produces different hash values than the WASM version
 * (different algorithm), but provides the same guarantees:
 * key-order independence, stable array ordering, skip paths.
 */
export function contentHash(
  value: unknown,
  skipPaths?: readonly string[],
): string {
  if (skipPaths?.length) {
    const trie = compileTrie(skipPaths);
    _tS[0][0] = 0;
    _tC[0] = 1;
    _tD = 0;
    hValS(value, trie);
  } else {
    hVal(value);
  }
  return toHex();
}

/**
 * Reusable hasher with pre-compiled skip trie.
 * Amortises trie compilation across many hash() calls.
 * No init() or WASM needed.
 */
export class ContentHasher {
  private readonly _trie: TrieNode[] | null;

  constructor(skipPaths?: readonly string[]) {
    this._trie = skipPaths?.length ? compileTrie(skipPaths) : null;
  }

  hash(value: unknown): string {
    const trie = this._trie;
    if (trie) {
      _tS[0][0] = 0;
      _tC[0] = 1;
      _tD = 0;
      hValS(value, trie);
    } else {
      hVal(value);
    }
    return toHex();
  }
}

export function createContentHasher(
  skipPaths?: readonly string[],
): ContentHasher {
  return new ContentHasher(skipPaths);
}
