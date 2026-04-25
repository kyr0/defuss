import type { VADOptions, VoiceDetectorOptions } from "./types.js";
import { createTenVAD } from "./vad.js";
import {
	computeRMS,
	createTenVoiceDetector,
	VOICE_DETECTOR_DEFAULTS,
} from "./voice-detector.js";

export { parseWAV, toMono, resampleLinear } from "./wav.js";
export {
	computeRMS,
	VOICE_DETECTOR_DEFAULTS,
} from "./voice-detector.js";
export type {
	VAD,
	VADOptions,
	VADResult,
	WAVData,
	VoiceDetector,
	VoiceDetectorOptions,
	VoiceDetectorResult,
} from "./types.js";

export function createVAD(options?: VADOptions) {
	return createTenVAD(options, "node");
}

export function createVoiceDetector(options?: VoiceDetectorOptions) {
	return createTenVoiceDetector(options, "node");
}

export { computeRMS as computeTenVadRMS, VOICE_DETECTOR_DEFAULTS as TENVAD_DEFAULTS };
