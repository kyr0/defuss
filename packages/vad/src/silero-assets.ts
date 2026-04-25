import type {
	ResolvedSileroAssetSources,
	SileroAssetOptions,
} from "./silero-types.js";

export const SILERO_DEFAULT_MODEL_URL = new URL(
	"../models/silero/silero_vad.onnx",
	import.meta.url,
).href;

export const SILERO_DEFAULT_CACHE_KEY = "silero/default/v1";
export const SILERO_DEFAULT_CACHE_DB_NAME = "defuss-vad-cache";

export function cloneBytes(input: ArrayBuffer | Uint8Array): Uint8Array {
	if (input instanceof Uint8Array) {
		return new Uint8Array(
			input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength),
		);
	}

	return new Uint8Array(input.slice(0));
}

export function resolveSileroAssetSources(
	options?: SileroAssetOptions,
): ResolvedSileroAssetSources {
	const modelUrl = options?.modelUrl ?? SILERO_DEFAULT_MODEL_URL;
	const cachePrefix =
		options?.cacheKey ??
		(modelUrl === SILERO_DEFAULT_MODEL_URL
			? SILERO_DEFAULT_CACHE_KEY
			: `silero/custom/${hashText(modelUrl)}`);

	return {
		modelUrl,
		cacheEnabled: options?.cache !== false,
		cacheDbName: options?.cacheDbName ?? SILERO_DEFAULT_CACHE_DB_NAME,
		modelCacheKey: `${cachePrefix}:model`,
	};
}

function hashText(input: string): string {
	let hash = 5381;
	for (let index = 0; index < input.length; index++) {
		hash = ((hash << 5) + hash) ^ input.charCodeAt(index);
	}
	return Math.abs(hash >>> 0).toString(36);
}
