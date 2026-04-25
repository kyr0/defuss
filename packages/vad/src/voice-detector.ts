import type {
	VAD,
	VoiceDetector,
	VoiceDetectorOptions,
	VoiceDetectorResult,
} from "./types.js";
import type { ForcedVADRuntime } from "./loader.js";
import { createTenVAD } from "./vad.js";

/** Default values for voice detector tuning. */
export const VOICE_DETECTOR_DEFAULTS = {
	/** VAD probability threshold. */
	threshold: 0.7,
	/** Minimum RMS energy (0..1) for a frame to count as voice. */
	rmsFloor: 0.015,
	/** Consecutive voice frames required before START. */
	debounceOn: 3,
	/** Consecutive silence frames required before END. */
	debounceOff: 3,
} as const;

/**
 * Compute RMS energy for a frame of Int16 PCM samples.
 * Returns a value in [0..1] range.
 */
export function computeRMS(samples: Int16Array): number {
	let sum = 0;
	for (let i = 0; i < samples.length; i++) {
		const v = samples[i]! / 32768;
		sum += v * v;
	}
	return Math.sqrt(sum / samples.length);
}

/**
 * Create a hardened voice detector that wraps the raw WASM VAD
 * with RMS energy gating and consecutive-frame debounce.
 *
 * Fully isomorphic - works in browsers and Node.js.
 *
 * ```ts
 * const detector = await createVoiceDetector();
 * const result = await detector.process(frame);
 * if (result.onVoiceStart) console.log("speech started");
 * if (result.onVoiceEnd)   console.log("speech ended");
 * await detector.destroy();
 * ```
 */
export function createVoiceDetectorFromVAD(
	vad: VAD,
	options?: VoiceDetectorOptions,
): VoiceDetector {
	const resettableVad = vad as VAD & {
		reset?: () => Promise<void> | void;
	};
	const rmsFloor = options?.rmsFloor ?? VOICE_DETECTOR_DEFAULTS.rmsFloor;
	const debounceOn = options?.debounceOn ?? VOICE_DETECTOR_DEFAULTS.debounceOn;
	const debounceOff =
		options?.debounceOff ?? VOICE_DETECTOR_DEFAULTS.debounceOff;

	let voiceStreak = 0;
	let silenceStreak = 0;
	let stableVoice = false;

	const detector: VoiceDetector = {
		async process(samples: Int16Array): Promise<VoiceDetectorResult> {
			const raw = await vad.process(samples);
			const rms = computeRMS(samples);

			// Gate: require both VAD voice AND sufficient energy
			const gatedVoice = raw.isVoice && rms >= rmsFloor;

			// Debounce: count consecutive frames before switching state
			if (gatedVoice) {
				voiceStreak++;
				silenceStreak = 0;
			} else {
				silenceStreak++;
				voiceStreak = 0;
			}

			const prevStable = stableVoice;

			if (voiceStreak >= debounceOn) stableVoice = true;
			if (silenceStreak >= debounceOff) stableVoice = false;

			return {
				probability: raw.probability,
				isVoice: raw.isVoice,
				rms,
				isVoiceStable: stableVoice,
				onVoiceStart: stableVoice && !prevStable,
				onVoiceEnd: !stableVoice && prevStable,
			};
		},

		async getVersion(): Promise<string> {
			return vad.getVersion();
		},

		async reset(): Promise<void> {
			if (typeof resettableVad.reset === "function") {
				await resettableVad.reset();
			}

			voiceStreak = 0;
			silenceStreak = 0;
			stableVoice = false;
		},

		async destroy(): Promise<void> {
			await vad.destroy();
		},
	};

	return Object.freeze(detector);
}

export async function createTenVoiceDetector(
	options?: VoiceDetectorOptions,
	runtime?: ForcedVADRuntime,
): Promise<VoiceDetector> {
	const vad = await createTenVAD(options, runtime);
	return createVoiceDetectorFromVAD(vad, options);
}
