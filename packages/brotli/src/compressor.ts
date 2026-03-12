/**
 * Options for Brotli compression.
 *
 * @example
 * ```ts
 * compress(data, { quality: 11, lgwin: 22 }); // smallest output, slowest
 * compress(data, { quality: 1 });              // fastest, larger output
 * ```
 */
export interface BrotliCompressOptions {
  /**
   * Brotli compression quality level (0–11).
   *
   * - **0** — fastest compression, largest output
   * - **5–7** — good balance for web text (HTML/CSS/JS/JSON)
   * - **11** — smallest output, slowest compression
   *
   * @default 6
   */
  quality?: number;

  /**
   * Sliding window size exponent (10–24).
   *
   * Larger windows let the encoder find longer matches at the cost of more
   * memory. **22** is a strong default for typical web payloads.
   *
   * @default 22
   */
  lgwin?: number;
}

/** Default compression quality. Good balance of speed and ratio for web text. */
export const DEFAULT_QUALITY = 6;

/** Default sliding window exponent. Covers most web-text repetition patterns. */
export const DEFAULT_LGWIN = 22;

let initPromise: Promise<void> | null = null;
let ready = false;
let wasmCompressBytes: ((input: Uint8Array, quality: number, lgwin: number) => Uint8Array) | null = null;

/**
 * Throws if `init()` has not been called yet.
 * Used internally before every compress call.
 */
export function assertReady(): void {
  if (!ready || !wasmCompressBytes) {
    throw new Error("defuss-brotli/compressor is not initialized. Call await init() first.");
  }
}

/**
 * Validates and applies defaults for compression options.
 *
 * @throws If `quality` is not an integer in 0–11 or `lgwin` is not in 10–24.
 */
export function normalizeOptions(options: BrotliCompressOptions = {}): Required<BrotliCompressOptions> {
  const quality = options.quality ?? DEFAULT_QUALITY;
  const lgwin = options.lgwin ?? DEFAULT_LGWIN;

  if (!Number.isInteger(quality) || quality < 0 || quality > 11) {
    throw new Error("quality must be an integer between 0 and 11");
  }
  if (!Number.isInteger(lgwin) || lgwin < 10 || lgwin > 24) {
    throw new Error("lgwin must be an integer between 10 and 24");
  }

  return { quality, lgwin };
}

/**
 * Load the Brotli compressor WASM module. Must be called (and awaited) once
 * before any `compress` / `compressText` call.
 *
 * Idempotent — calling `init()` multiple times returns the same Promise and
 * does not reload the WASM binary.
 *
 * Works identically in Node.js and browsers.
 */
export async function init(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const wasm = await import("../wasm/pkg/compressor/defuss_brotli_compressor.js");
      wasmCompressBytes = wasm.compress_bytes;
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
 * Compress raw bytes with Brotli.
 *
 * Use this when you already have a `Uint8Array` (binary data, pre-encoded
 * text, HTTP response bodies, etc.). No encoding is performed — what you
 * pass in is exactly what gets compressed.
 *
 * For compressing JS strings directly, see {@link compressText}.
 *
 * @param input   Raw bytes to compress.
 * @param options Compression tuning — see {@link BrotliCompressOptions}.
 * @returns A new `Uint8Array` containing the Brotli-compressed output.
 *
 * @throws If `init()` was not called first.
 * @throws If options are out of range.
 *
 * @example
 * ```ts
 * await init();
 * const compressed = compress(myFileBytes, { quality: 11 });
 * ```
 */
export function compress(input: Uint8Array, options: BrotliCompressOptions = {}): Uint8Array {
  assertReady();
  const { quality, lgwin } = normalizeOptions(options);
  return wasmCompressBytes!(input, quality, lgwin);
}

/**
 * Compress a JS string with Brotli.
 *
 * Internally encodes the string to UTF-8 via `TextEncoder` and then
 * delegates to {@link compress}. This is the right choice when your input is
 * a plain string (JSON, HTML, Markdown, etc.) and you don't want to deal
 * with encoding yourself.
 *
 * To decompress back to a string, use `decompressText()` from the
 * decompressor module.
 *
 * @param text    The string to compress.
 * @param options Compression tuning — see {@link BrotliCompressOptions}.
 * @returns A new `Uint8Array` containing the Brotli-compressed output.
 *
 * @example
 * ```ts
 * await init();
 * const compressed = compressText('{"hello":"world"}', { quality: 6 });
 * ```
 */
export function compressText(text: string, options: BrotliCompressOptions = {}): Uint8Array {
  return compress(new TextEncoder().encode(text), options);
}
