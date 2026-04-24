import type * as Ort from "onnxruntime-web";

import {
  createFireRedRuntime,
  type FireRedRuntimeHandle,
} from "./firered-ort.js";

export interface SileroRuntimeHandle {
  ort: typeof import("onnxruntime-web");
  session: Ort.InferenceSession;
}

export async function createSileroRuntime(options: {
  modelBytes: Uint8Array;
  cacheKey: string | null;
  wasmPaths?: string | Record<string, string>;
}): Promise<SileroRuntimeHandle> {
  return createFireRedRuntime({
    executionProvider: "wasm",
    modelBytes: options.modelBytes,
    cacheKey: options.cacheKey,
    wasmPaths: options.wasmPaths,
  }) as Promise<FireRedRuntimeHandle> as Promise<SileroRuntimeHandle>;
}