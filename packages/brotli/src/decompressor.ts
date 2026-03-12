/**
 * Options for Brotli decompression.
 */
export interface BrotliDecompressOptions {
  /**
   * Hard limit for decompressed output size in bytes.
   *
   * Guards against **decompression bombs** — a tiny compressed payload that
   * expands into gigabytes. If the decoded output would exceed this limit
   * the WASM module throws immediately.
   *
   * @default 67_108_864 (64 MiB)
   */
  maxOutputSize?: number;
}

/**
 * Default decompressed-output cap: 64 MiB.
 * Raise explicitly if you legitimately expect larger payloads.
 */
export const DEFAULT_MAX_OUTPUT_SIZE = 64 * 1024 * 1024;

let initPromise: Promise<void> | null = null;
let ready = false;
export let wasmDecompressBytes: ((input: Uint8Array, maxOutputSize: number) => Uint8Array) | null = null;

/**
 * Throws if `init()` has not been called yet.
 * Used internally before every decompress call.
 */
export function assertReady(): void {
  if (!ready || !wasmDecompressBytes) {
    throw new Error("defuss-brotli/decompressor is not initialized. Call await init() first.");
  }
}

/**
 * Validates and applies defaults for decompression options.
 *
 * @throws If `maxOutputSize` is not a positive integer.
 */
export function normalizeOptions(
  options: BrotliDecompressOptions = {},
): Required<BrotliDecompressOptions> {
  const maxOutputSize = options.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE;
  if (!Number.isInteger(maxOutputSize) || maxOutputSize <= 0) {
    throw new Error("maxOutputSize must be a positive integer");
  }
  return { maxOutputSize };
}

/**
 * Load the Brotli decompressor WASM module. Must be called (and awaited)
 * once before any `decompress` / `decompressText` call.
 *
 * Idempotent — calling `init()` multiple times returns the same Promise and
 * does not reload the WASM binary.
 *
 * Works identically in Node.js and browsers.
 */
export async function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await import("../wasm/pkg/decompressor/defuss_brotli_decompressor.js");
      wasmDecompressBytes = wasm.decompress_bytes;
      ready = true;
    })();
  }
  return initPromise;
}

/**
 * Non-throwing readiness check.
 *
 * @returns `true` after `init()` has resolved, `false` otherwise.
 */
export function isReady(): boolean {
  return ready;
}

/**
 * Decompress a Brotli-compressed `Uint8Array` back to raw bytes.
 *
 * Use this when the decompressed content is **binary** (images, protobuf,
 * WASM, etc.) or when you want to handle text decoding yourself.
 *
 * For UTF-8 text payloads, see {@link decompressText}.
 *
 * @param input   Brotli-compressed bytes.
 * @param options Decompression limits — see {@link BrotliDecompressOptions}.
 * @returns A new `Uint8Array` containing the decompressed output.
 *
 * @throws If `init()` was not called first.
 * @throws If the output would exceed `maxOutputSize`.
 * @throws If the input is not valid Brotli data.
 *
 * @example
 * ```ts
 * await init();
 * const raw = decompress(compressedBytes);
 * ```
 */
export function decompress(
  input: Uint8Array,
  options: BrotliDecompressOptions = {},
): Uint8Array {
  assertReady();
  const { maxOutputSize } = normalizeOptions(options);
  return wasmDecompressBytes!(input, maxOutputSize);
}

/**
 * Decompress a Brotli-compressed `Uint8Array` and decode the result as a
 * UTF-8 string.
 *
 * Internally calls {@link decompress} and then applies `TextDecoder` to
 * convert the bytes back to a JS string. This is the counterpart to
 * `compressText()` from the compressor module.
 *
 * **Note:** If the decompressed bytes are not valid UTF-8, `TextDecoder`
 * will insert U+FFFD replacement characters rather than throwing.
 *
 * @param input   Brotli-compressed bytes that decode to UTF-8 text.
 * @param options Decompression limits — see {@link BrotliDecompressOptions}.
 * @returns The decompressed UTF-8 string.
 *
 * @example
 * ```ts
 * await init();
 * const json = decompressText(compressedJsonBytes);
 * const data = JSON.parse(json);
 * ```
 */
export function decompressText(
  input: Uint8Array,
  options: BrotliDecompressOptions = {},
): string {
  return new TextDecoder().decode(decompress(input, options));
}
