import type { VADOptions, VoiceDetectorOptions } from "./types.js";

export type SileroSampleRate = 8000 | 16000;
export type SileroRuntimeTarget = "node" | "web";

export interface SileroAssetOptions {
  modelUrl?: string;
  modelBytes?: ArrayBuffer | Uint8Array;
  cache?: boolean;
  cacheKey?: string;
  cacheDbName?: string;
  wasmPaths?: string | Record<string, string>;
  sampleRate?: SileroSampleRate;
}

export interface SileroVADOptions extends VADOptions, SileroAssetOptions {}

export interface SileroVoiceDetectorOptions
  extends VoiceDetectorOptions,
    SileroAssetOptions {}

export interface ResolvedSileroAssetSources {
  modelUrl: string;
  cacheEnabled: boolean;
  cacheDbName: string;
  modelCacheKey: string;
}