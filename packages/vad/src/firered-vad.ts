import type * as Ort from "onnxruntime-web";

import { FireRedFbankExtractor, FIRERED_FRAME_LENGTH, FIRERED_FRAME_SHIFT, FIRERED_MEL_BANDS, FIRERED_SAMPLE_RATE } from "./firered-fbank.js";
import { createFireRedRuntime } from "./firered-ort.js";
import { loadFireRedResources } from "./firered-resources.js";
import type {
	FireRedExecutionProvider,
	FireRedRuntimeTarget,
	FireRedVADOptions,
	FireRedVoiceDetectorOptions,
} from "./firered-types.js";
import type { VAD, VADResult, VoiceDetector } from "./types.js";
import { VOICE_DETECTOR_DEFAULTS, createVoiceDetectorFromVAD } from "./voice-detector.js";

const FIRERED_CACHE_DIMS = [8, 1, 128, 19] as const;
const FIRERED_CACHE_SIZE =
	FIRERED_CACHE_DIMS[0] *
	FIRERED_CACHE_DIMS[1] *
	FIRERED_CACHE_DIMS[2] *
	FIRERED_CACHE_DIMS[3];

export async function createFireRedVAD(
	options: FireRedVADOptions | undefined,
	runtimeTarget: FireRedRuntimeTarget,
	executionProvider: FireRedExecutionProvider,
): Promise<VAD> {
	const hopSize = options?.hopSize ?? FIRERED_FRAME_SHIFT;
	if (hopSize !== FIRERED_FRAME_SHIFT) {
		throw new Error(
			`FireRedVAD requires hopSize ${FIRERED_FRAME_SHIFT}, got ${hopSize}`,
		);
	}

	const threshold = options?.threshold ?? 0.5;
	const resources = await loadFireRedResources(options, runtimeTarget);
	const runtime = await createFireRedRuntime({
		executionProvider,
		modelBytes: resources.modelBytes,
		cacheKey: resources.sessionCacheKey,
		wasmPaths: options?.wasmPaths,
	});

	const fbank = new FireRedFbankExtractor();
	const featureBuffer = new Float32Array(FIRERED_MEL_BANDS);
	const firstFrameBuffer = new Float32Array(FIRERED_FRAME_LENGTH);
	const hopBuffer = new Float32Array(FIRERED_FRAME_SHIFT);
	const cacheBuffer = new Float32Array(FIRERED_CACHE_SIZE);
	const pendingSamples: number[] = [];

	let started = false;
	let destroyed = false;

	function assertAlive(): void {
		if (destroyed) {
			throw new Error("VAD instance has been destroyed");
		}
	}

	async function runInference(features: Float32Array): Promise<number> {
		const featTensor = new runtime.ort.Tensor("float32", features, [1, 1, FIRERED_MEL_BANDS]);
		const cacheTensor = new runtime.ort.Tensor("float32", cacheBuffer, [...FIRERED_CACHE_DIMS]);

		const outputs = (await runtime.session.run({
			feat: featTensor,
			caches_in: cacheTensor,
		})) as Record<string, Ort.Tensor>;

		const probsTensor = outputs.probs ?? outputs["probs"];
		if (!probsTensor) {
			throw new Error("FireRed inference did not return 'probs'");
		}

		const probsData = probsTensor.data as Float32Array | readonly number[];
		const probability = Number(probsData[0] ?? 0);

		const cachesTensor = outputs.caches_out ?? outputs["caches_out"];
		if (!cachesTensor) {
			throw new Error("FireRed inference did not return 'caches_out'");
		}

		const cacheData = cachesTensor.data as Float32Array | readonly number[];
		if (cacheData.length !== FIRERED_CACHE_SIZE) {
			throw new Error(
				`FireRed cache size mismatch: expected ${FIRERED_CACHE_SIZE}, got ${cacheData.length}`,
			);
		}

		cacheBuffer.set(cacheData as ArrayLike<number>);
		return Math.max(0, Math.min(1, probability));
	}

	const vad: VAD = {
		async process(samples: Int16Array): Promise<VADResult> {
			assertAlive();
			if (samples.length !== hopSize) {
				throw new Error(`Expected ${hopSize} samples, got ${samples.length}`);
			}

			for (let index = 0; index < samples.length; index++) {
				pendingSamples.push(samples[index]!);
			}

			if (!started) {
				if (pendingSamples.length < FIRERED_FRAME_LENGTH) {
					return { probability: 0, isVoice: false };
				}

				const frame = pendingSamples.splice(0, FIRERED_FRAME_LENGTH);
				for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
					firstFrameBuffer[index] = frame[index]!;
				}
				fbank.extractFrameFull(firstFrameBuffer, featureBuffer);
				started = true;
			} else {
				if (pendingSamples.length < FIRERED_FRAME_SHIFT) {
					return { probability: 0, isVoice: false };
				}

				const frame = pendingSamples.splice(0, FIRERED_FRAME_SHIFT);
				for (let index = 0; index < FIRERED_FRAME_SHIFT; index++) {
					hopBuffer[index] = frame[index]!;
				}
				fbank.extractFrame(hopBuffer, featureBuffer);
			}

			resources.cmvn.normalize(featureBuffer);
			const probability = await runInference(featureBuffer);

			return {
				probability,
				isVoice: probability >= threshold,
			};
		},

		async getVersion(): Promise<string> {
			assertAlive();
			return `fireredvad-stream-vad-with-cache@onnxruntime-web:${executionProvider}`;
		},

		async destroy(): Promise<void> {
			if (destroyed) {
				return;
			}

			destroyed = true;
			pendingSamples.length = 0;
			cacheBuffer.fill(0);
			featureBuffer.fill(0);
			firstFrameBuffer.fill(0);
			hopBuffer.fill(0);
			fbank.reset();
		},
	};

	return Object.freeze(vad);
}

export async function createFireRedVoiceDetector(
	options: FireRedVoiceDetectorOptions | undefined,
	runtimeTarget: FireRedRuntimeTarget,
	executionProvider: FireRedExecutionProvider,
): Promise<VoiceDetector> {
	const vad = await createFireRedVAD(
		{
			...options,
			threshold: options?.threshold ?? VOICE_DETECTOR_DEFAULTS.threshold,
		},
		runtimeTarget,
		executionProvider,
	);

	return createVoiceDetectorFromVAD(vad, options);
}

export const FIRERED_AUDIO_REQUIREMENTS = {
	sampleRate: FIRERED_SAMPLE_RATE,
	hopSize: FIRERED_FRAME_SHIFT,
	windowSize: FIRERED_FRAME_LENGTH,
	melBands: FIRERED_MEL_BANDS,
} as const;
