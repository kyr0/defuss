import type { TenVADModule } from "../models/tenvad/ten_vad.d.ts";
import type { VAD, VADOptions, VADResult } from "./types.js";
import { loadVADModule, type ForcedVADRuntime } from "./loader.js";

/**
 * Create a VAD (Voice Activity Detection) instance.
 *
 * Loads the ten-vad WASM module, initialises the detector, and returns
 * a simple API for processing 16kHz mono Int16 audio frames.
 *
 * ```ts
 * const vad = await createVAD();
 * const result = await vad.process(samples); // Int16Array of hopSize length
 * console.log(result.probability, result.isVoice);
 * await vad.destroy();
 * ```
 */
export async function createTenVAD(
	options?: VADOptions,
	runtime?: ForcedVADRuntime,
): Promise<VAD> {
	const hopSize = options?.hopSize ?? 256;
	const threshold = options?.threshold ?? 0.7;

	const module: TenVADModule = await loadVADModule({
		wasmBinary: options?.wasmBinary,
		locateFile: options?.locateFile,
		runtime,
	});

	// Allocate a pointer-sized slot for the handle
	const handlePtr = module._malloc(4);
	const rc = module._ten_vad_create(handlePtr, hopSize, threshold);
	if (rc !== 0) {
		module._free(handlePtr);
		throw new Error(`ten_vad_create failed with code ${rc}`);
	}

	const handle = module.getValue!(handlePtr, "i32");
	let destroyed = false;

	function assertAlive(): void {
		if (destroyed) throw new Error("VAD instance has been destroyed");
	}

	const vad: VAD = {
		async process(samples: Int16Array): Promise<VADResult> {
			assertAlive();
			if (samples.length !== hopSize) {
				throw new Error(
					`Expected ${hopSize} samples, got ${samples.length}`,
				);
			}

			// Allocate WASM memory for the frame, probability, and flag
			const audioPtr = module._malloc(hopSize * 2); // Int16 = 2 bytes
			const probPtr = module._malloc(4); // float32
			const flagPtr = module._malloc(4); // int32

			try {
				// Copy samples into WASM heap
				module.HEAP16.set(samples, audioPtr >> 1);

				const result = module._ten_vad_process(
					handle,
					audioPtr,
					hopSize,
					probPtr,
					flagPtr,
				);

				if (result !== 0) {
					throw new Error(`ten_vad_process failed with code ${result}`);
				}

				const probability = module.getValue!(probPtr, "float");
				const flag = module.getValue!(flagPtr, "i32");

				return { probability, isVoice: flag === 1 };
			} finally {
				module._free(audioPtr);
				module._free(probPtr);
				module._free(flagPtr);
			}
		},

		async getVersion(): Promise<string> {
			assertAlive();
			const ptr = module._ten_vad_get_version();
			return module.UTF8ToString!(ptr);
		},

		async destroy(): Promise<void> {
			if (destroyed) return;
			destroyed = true;
			module._ten_vad_destroy(handlePtr);
			module._free(handlePtr);
		},
	};

	return Object.freeze(vad);
}
