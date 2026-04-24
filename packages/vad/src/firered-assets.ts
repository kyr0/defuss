import type {
  FireRedAssetOptions,
  ResolvedFireRedAssetSources,
} from "./firered-types.js";

export const FIRERED_DEFAULT_MODEL_URL = new URL(
  "../models/firered/fireredvad_stream_vad_with_cache.onnx",
  import.meta.url,
).href;

export const FIRERED_DEFAULT_CMVN_URL = new URL(
  "../models/firered/cmvn.ark",
  import.meta.url,
).href;

export const FIRERED_DEFAULT_CACHE_KEY = "firered/default/v1";
export const FIRERED_DEFAULT_CACHE_DB_NAME = "defuss-vad-cache";

export function cloneBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    return new Uint8Array(
      input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
    );
  }

  return new Uint8Array(input.slice(0));
}

export function resolveFireRedAssetSources(
  options?: FireRedAssetOptions,
): ResolvedFireRedAssetSources {
  const modelUrl = options?.modelUrl ?? FIRERED_DEFAULT_MODEL_URL;
  const cmvnUrl = options?.cmvnUrl ?? FIRERED_DEFAULT_CMVN_URL;
  const cachePrefix =
    options?.cacheKey ??
    (modelUrl === FIRERED_DEFAULT_MODEL_URL && cmvnUrl === FIRERED_DEFAULT_CMVN_URL
      ? FIRERED_DEFAULT_CACHE_KEY
      : `firered/custom/${hashText(`${modelUrl}|${cmvnUrl}`)}`);

  return {
    modelUrl,
    cmvnUrl,
    cacheEnabled: options?.cache !== false,
    cacheDbName: options?.cacheDbName ?? FIRERED_DEFAULT_CACHE_DB_NAME,
    modelCacheKey: `${cachePrefix}:model`,
    cmvnCacheKey: `${cachePrefix}:cmvn`,
  };
}

function hashText(input: string): string {
  let hash = 5381;
  for (let index = 0; index < input.length; index++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
  }
  return Math.abs(hash >>> 0).toString(36);
}