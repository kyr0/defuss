import type * as Ort from "onnxruntime-web";

import { createSileroRuntime } from "./silero-ort.js";
import { loadSileroResources } from "./silero-resources.js";
import type {
	SileroRuntimeTarget,
	SileroSampleRate,
	SileroVADOptions,
	SileroVoiceDetectorOptions,
} from "./silero-types.js";
import type { VAD, VADResult, VoiceDetector } from "./types.js";
import {
	createVoiceDetectorFromVAD,
	VOICE_DETECTOR_DEFAULTS,
} from "./voice-detector.js";

const SILERO_STATE_DIMS = [2, 1, 128] as const;
const SILERO_STATE_SIZE =
	SILERO_STATE_DIMS[0] * SILERO_STATE_DIMS[1] * SILERO_STATE_DIMS[2];

export const SILERO_SUPPORTED_SAMPLE_RATES = [8000, 16000] as const;

export const SILERO_AUDIO_REQUIREMENTS = {
	defaultSampleRate: 16000,
	supportedSampleRates: SILERO_SUPPORTED_SAMPLE_RATES,
	frameSizes: {
		8000: 256,
		16000: 512,
	},
	contextSizes: {
		8000: 32,
		16000: 64,
	},
	stateShape: SILERO_STATE_DIMS,
} as const;

export function getSileroHopSize(sampleRate: SileroSampleRate): number {
	return SILERO_AUDIO_REQUIREMENTS.frameSizes[sampleRate];
}

export function getSileroContextSize(sampleRate: SileroSampleRate): number {
	return SILERO_AUDIO_REQUIREMENTS.contextSizes[sampleRate];
}

export async function createSileroVAD(
	options: SileroVADOptions | undefined,
	runtimeTarget: SileroRuntimeTarget,
): Promise<VAD> {
	const sampleRate = options?.sampleRate ?? 16000;
	assertSileroSampleRate(sampleRate);

	const expectedHopSize = getSileroHopSize(sampleRate);
	const contextSize = getSileroContextSize(sampleRate);
	const hopSize = options?.hopSize ?? expectedHopSize;
	if (hopSize !== expectedHopSize) {
		throw new Error(
			`SileroVAD requires hopSize ${expectedHopSize} for sampleRate ${sampleRate}, got ${hopSize}`,
		);
	}

	const threshold = options?.threshold ?? 0.5;
	const resources = await loadSileroResources(options, runtimeTarget);
	const runtime = await createSileroRuntime({
		modelBytes: resources.modelBytes,
		cacheKey: resources.sessionCacheKey,
		wasmPaths: options?.wasmPaths,
	});

	const stateBuffer = new Float32Array(SILERO_STATE_SIZE);
	const contextBuffer = new Float32Array(contextSize);
	const inputBuffer = new Float32Array(contextSize + hopSize);
	const sampleRateBuffer = new BigInt64Array([BigInt(sampleRate)]);

	let destroyed = false;

	function assertAlive(): void {
		if (destroyed) {
			throw new Error("VAD instance has been destroyed");
		}
	}

	async function resetState(): Promise<void> {
		stateBuffer.fill(0);
		contextBuffer.fill(0);
		inputBuffer.fill(0);
	}

	async function runInference(samples: Int16Array): Promise<number> {
		inputBuffer.set(contextBuffer, 0);
		for (let index = 0; index < samples.length; index++) {
			inputBuffer[contextSize + index] = samples[index]! / 32768;
		}

		const inputTensor = new runtime.ort.Tensor("float32", inputBuffer, [
			1,
			inputBuffer.length,
		]);
		const stateTensor = new runtime.ort.Tensor("float32", stateBuffer, [
			...SILERO_STATE_DIMS,
		]);
		const sampleRateTensor = new runtime.ort.Tensor(
			"int64",
			sampleRateBuffer,
			[1],
		);

		const outputs = (await runtime.session.run({
			input: inputTensor,
			state: stateTensor,
			sr: sampleRateTensor,
		})) as Record<string, Ort.Tensor>;

		const outputTensor = outputs.output ?? outputs["output"];
		if (!outputTensor) {
			throw new Error("Silero inference did not return 'output'");
		}

		const probability = Number(
			(outputTensor.data as Float32Array | readonly number[])[0] ?? 0,
		);

		const nextStateTensor = outputs.stateN ?? outputs["stateN"];
		if (!nextStateTensor) {
			throw new Error("Silero inference did not return 'stateN'");
		}

		const nextState = nextStateTensor.data as Float32Array | readonly number[];
		if (nextState.length !== stateBuffer.length) {
			throw new Error(
				`Silero state size mismatch: expected ${stateBuffer.length}, got ${nextState.length}`,
			);
		}

		stateBuffer.set(nextState as ArrayLike<number>);
		contextBuffer.set(inputBuffer.subarray(inputBuffer.length - contextSize));

		return clampProbability(probability);
	}

	const vad = {
		async process(samples: Int16Array): Promise<VADResult> {
			assertAlive();
			if (samples.length !== hopSize) {
				throw new Error(`Expected ${hopSize} samples, got ${samples.length}`);
			}

			const probability = await runInference(samples);
			return {
				probability,
				isVoice: probability >= threshold,
			};
		},

		async getVersion(): Promise<string> {
			assertAlive();
			return `silero_vad.onnx@onnxruntime-web:wasm:${sampleRate}`;
		},

		async reset(): Promise<void> {
			assertAlive();
			await resetState();
		},

		async destroy(): Promise<void> {
			if (destroyed) {
				return;
			}

			destroyed = true;
			await resetState();
		},
	} as VAD & {
		reset: () => Promise<void>;
	};

	return Object.freeze(vad);
}

export async function createSileroVoiceDetector(
	options: SileroVoiceDetectorOptions | undefined,
	runtimeTarget: SileroRuntimeTarget,
): Promise<VoiceDetector> {
	const vad = await createSileroVAD(
		{
			...options,
			threshold: options?.threshold ?? VOICE_DETECTOR_DEFAULTS.threshold,
		},
		runtimeTarget,
	);

	return createVoiceDetectorFromVAD(vad, options);
}

function assertSileroSampleRate(sampleRate: number): asserts sampleRate is SileroSampleRate {
	if (sampleRate === 8000 || sampleRate === 16000) {
		return;
	}

	throw new Error(
		`SileroVAD supports sampleRate 8000 or 16000, got ${sampleRate}`,
	);
}

function clampProbability(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}

	return Math.max(0, Math.min(1, value));
}
