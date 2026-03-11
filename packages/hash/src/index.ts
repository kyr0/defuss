export {
  fnv1a64,
  mix64,
  rendezvousScore,
  pickResponsiblePeer,
  isResponsibleForWorkItem,
} from "./rendezvous";
export type { PeerId } from "./rendezvous";

export type JsonPrimitive = null | boolean | number | string;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue | undefined };

let initPromise: Promise<void> | null = null;
let ready = false;

let wasmContentHash: (value: unknown, skipPaths: string[]) => string;
let wasmContentHashJsonStr: (json: string, skipPaths: string[]) => string;
let wasmContentHashJsonBytes: (bytes: Uint8Array, skipPaths: string[]) => string;
let WasmContentHasherCtor: new (skipPaths: string[]) => {
  hash(value: unknown): string;
  hash_json_str(json: string): string;
  hash_json_bytes(bytes: Uint8Array): string;
};

export async function init(input?: unknown): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // Dynamic import triggers WASM loading (bundler target auto-inits)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wasm: any = await import("../wasm/pkg/defuss_hash.js");
      wasmContentHash = wasm.content_hash;
      wasmContentHashJsonStr = wasm.content_hash_json_str;
      wasmContentHashJsonBytes = wasm.content_hash_json_bytes;
      WasmContentHasherCtor = wasm.ContentHasher;
      ready = true;
    })();
  }

  return initPromise;
}

export function isReady(): boolean {
  return ready;
}

function assertReady(): void {
  if (!ready) {
    throw new Error(
      "defuss-hash is not initialized. Call await init() before hashing.",
    );
  }
}

/**
 * WASM convenience path: hash any JS value. Pays the JS→WASM object graph
 * transfer cost via serde_wasm_bindgen. Requires init().
 */
export function contentHashWasm(
  value: JsonValue,
  skipPaths: readonly string[] = [],
): string {
  assertReady();
  return wasmContentHash(value, [...skipPaths]);
}

/**
 * Fast path: hash a JSON string directly. Rust parses the bytes —
 * avoids JS→WASM object clone entirely.
 */
export function contentHashJson(
  json: string,
  skipPaths: readonly string[] = [],
): string {
  assertReady();
  return wasmContentHashJsonStr(json, [...skipPaths]);
}

/**
 * Fast path: hash raw JSON bytes (Uint8Array). Same as contentHashJson
 * but for binary input (e.g. fetch response body).
 */
export function contentHashJsonBytes(
  bytes: Uint8Array,
  skipPaths: readonly string[] = [],
): string {
  assertReady();
  return wasmContentHashJsonBytes(bytes, [...skipPaths]);
}

export class ContentHasherWasm {
  readonly #inner: {
    hash(value: unknown): string;
    hash_json_str(json: string): string;
    hash_json_bytes(bytes: Uint8Array): string;
  };

  constructor(skipPaths: readonly string[] = []) {
    assertReady();
    this.#inner = new WasmContentHasherCtor([...skipPaths]);
  }

  /** Convenience: hash a JS value (slower — serde_wasm_bindgen crossing). */
  hash(value: JsonValue): string {
    return this.#inner.hash(value);
  }

  /** Fast path: hash a JSON string directly in Rust. */
  hashJson(json: string): string {
    return this.#inner.hash_json_str(json);
  }

  /** Fast path: hash raw JSON bytes directly in Rust. */
  hashJsonBytes(bytes: Uint8Array): string {
    return this.#inner.hash_json_bytes(bytes);
  }
}

export function createContentHasherWasm(
  skipPaths: readonly string[] = [],
): ContentHasherWasm {
  return new ContentHasherWasm(skipPaths);
}

// Primary exports — pure TypeScript JIT-optimized hasher (no WASM, no init() needed)
export {
  contentHash,
  ContentHasher,
  createContentHasher,
} from "./content-hash-js";
