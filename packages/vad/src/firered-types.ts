import type { VADOptions, VoiceDetectorOptions } from "./types.js";

export type FireRedExecutionProvider = "wasm" | "webgpu";
export type FireRedRuntimeTarget = "node" | "web";

export interface FireRedAssetOptions {
  /** Override the default shipped ONNX model URL. */
  modelUrl?: string;
  /** Override the default shipped CMVN file URL. */
  cmvnUrl?: string;
  /** Provide ONNX model bytes directly, bypassing URL loading. */
  modelBytes?: ArrayBuffer | Uint8Array;
  /** Provide CMVN bytes directly, bypassing URL loading. */
  cmvnBytes?: ArrayBuffer | Uint8Array;
  /** Enable or disable persistent browser caching. Default: true. */
  cache?: boolean;
  /** Prefix used for persisted browser cache keys. */
  cacheKey?: string;
  /** Override the browser IndexedDB database name. */
  cacheDbName?: string;
  /** Optional ONNX Runtime WASM asset override for extension/bundler setups. */
  wasmPaths?: string | Record<string, string>;
}

export interface FireRedVADOptions extends VADOptions, FireRedAssetOptions {}

export interface FireRedVoiceDetectorOptions
  extends VoiceDetectorOptions,
    FireRedAssetOptions {}

export interface ResolvedFireRedAssetSources {
  modelUrl: string;
  cmvnUrl: string;
  cacheEnabled: boolean;
  cacheDbName: string;
  modelCacheKey: string;
  cmvnCacheKey: string;
}