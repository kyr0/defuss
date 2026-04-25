import type * as Ort from "onnxruntime-web";

import type { FireRedExecutionProvider } from "./firered-types.js";

export interface FireRedRuntimeHandle {
	ort: typeof import("onnxruntime-web");
	session: Ort.InferenceSession;
}

const ortModulePromises = new Map<
	FireRedExecutionProvider,
	Promise<typeof import("onnxruntime-web")>
>();

const runtimePromises = new Map<string, Promise<FireRedRuntimeHandle>>();

export async function createFireRedRuntime(options: {
	executionProvider: FireRedExecutionProvider;
	modelBytes: Uint8Array;
	cacheKey: string | null;
	wasmPaths?: string | Record<string, string>;
}): Promise<FireRedRuntimeHandle> {
	const runtimeKey = options.cacheKey
		? `${options.executionProvider}|${options.cacheKey}|${JSON.stringify(
			options.wasmPaths ?? null,
		)}`
		: null;

	if (runtimeKey) {
		const cached = runtimePromises.get(runtimeKey);
		if (cached) {
			return cached;
		}

		const next = createFireRedRuntimeUncached(options);
		runtimePromises.set(runtimeKey, next);
		return next;
	}

	return createFireRedRuntimeUncached(options);
}

async function createFireRedRuntimeUncached(options: {
	executionProvider: FireRedExecutionProvider;
	modelBytes: Uint8Array;
	wasmPaths?: string | Record<string, string>;
}): Promise<FireRedRuntimeHandle> {
	const ort = await getOrtModule(options.executionProvider);
	configureOrtEnvironment(ort, options.executionProvider, options.wasmPaths);

	const session = await ort.InferenceSession.create(options.modelBytes, {
		executionProviders: [options.executionProvider],
		graphOptimizationLevel: "all",
	} as Ort.InferenceSession.SessionOptions);

	return { ort, session };
}

async function getOrtModule(
	executionProvider: FireRedExecutionProvider,
): Promise<typeof import("onnxruntime-web")> {
	const cached = ortModulePromises.get(executionProvider);
	if (cached) {
		return cached;
	}

	const next = (
		executionProvider === "webgpu"
			? import("onnxruntime-web/webgpu")
			: import("onnxruntime-web/wasm")
	) as Promise<typeof import("onnxruntime-web")>;

	ortModulePromises.set(executionProvider, next);
	return next;
}

function configureOrtEnvironment(
	ort: typeof import("onnxruntime-web"),
	executionProvider: FireRedExecutionProvider,
	wasmPaths?: string | Record<string, string>,
): void {
	const wasmEnv = ort.env?.wasm as
		| {
			numThreads?: number;
			proxy?: boolean;
			simd?: boolean;
			wasmPaths?: string | Record<string, string>;
		}
		| undefined;

	if (!wasmEnv) {
		return;
	}

	wasmEnv.numThreads = 1;
	wasmEnv.proxy = false;
	wasmEnv.simd = true;

	if (wasmPaths !== undefined) {
		wasmEnv.wasmPaths = wasmPaths;
	}

	if (executionProvider === "webgpu" && typeof navigator !== "undefined") {
		// The explicit WebGPU entrypoint prefers GPU execution only.
		// ONNX Runtime handles capability checks during session creation.
	}
}
