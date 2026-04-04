/**
 * TypeScript declarations for ten-vad WebAssembly module.
 *
 * These types describe the low-level Emscripten module interface exposed
 * by the vendored `ten_vad.js` / `ten_vad.wasm` files.
 */

export interface TenVADModule {
  /** Create and initialize a VAD instance. Returns 0 on success, -1 on error. */
  _ten_vad_create(handlePtr: number, hopSize: number, threshold: number): number;

  /** Process one audio frame. Returns 0 on success, -1 on error. */
  _ten_vad_process(
    handle: number,
    audioDataPtr: number,
    audioDataLength: number,
    outProbabilityPtr: number,
    outFlagPtr: number,
  ): number;

  /** Destroy a VAD instance. Returns 0 on success, -1 on error. */
  _ten_vad_destroy(handlePtr: number): number;

  /** Get library version string pointer. */
  _ten_vad_get_version(): number;

  // Memory management
  _malloc(size: number): number;
  _free(ptr: number): void;

  // Typed-array heap views
  HEAP16: Int16Array;
  HEAP32: Int32Array;
  HEAPU8: Uint8Array;
  HEAPF32: Float32Array;

  // Value access helpers (may need polyfill)
  getValue?(ptr: number, type: "i8" | "i16" | "i32" | "float" | "double"): number;
  setValue?(ptr: number, value: number, type: "i8" | "i16" | "i32" | "float" | "double"): void;

  // String helpers (may need polyfill)
  UTF8ToString?(ptr: number): string;
}

export interface TenVADModuleOptions {
  wasmBinary?: ArrayBuffer | Uint8Array;
  locateFile?: (path: string, prefix: string) => string;
  noInitialRun?: boolean;
  noExitRuntime?: boolean;
}

export type CreateVADModuleFn = (options?: TenVADModuleOptions) => Promise<TenVADModule>;

declare const createVADModule: CreateVADModuleFn;
export default createVADModule;
