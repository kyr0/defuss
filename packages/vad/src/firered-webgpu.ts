import type {
  FireRedVADOptions,
  FireRedVoiceDetectorOptions,
} from "./firered-types.js";
import {
  FIRERED_FRAME_LENGTH,
  FIRERED_FRAME_SHIFT,
  FIRERED_MEL_BANDS,
  FIRERED_SAMPLE_RATE,
} from "./firered-fbank.js";
import {
  FIRERED_AUDIO_REQUIREMENTS,
  createFireRedVAD,
  createFireRedVoiceDetector,
} from "./firered-vad.js";
import type { VAD, VADOptions, VADResult, WAVData, VoiceDetector, VoiceDetectorOptions, VoiceDetectorResult } from "./types.js";
import {
  computeRMS,
  VOICE_DETECTOR_DEFAULTS,
} from "./voice-detector.js";

export { parseWAV, toMono, resampleLinear } from "./wav.js";
export {
  computeRMS,
  VOICE_DETECTOR_DEFAULTS,
} from "./voice-detector.js";
export {
  FIRERED_AUDIO_REQUIREMENTS,
  createFireRedVAD,
  createFireRedVoiceDetector,
} from "./firered-vad.js";
export {
  FIRERED_FRAME_LENGTH,
  FIRERED_FRAME_SHIFT,
  FIRERED_MEL_BANDS,
  FIRERED_SAMPLE_RATE,
} from "./firered-fbank.js";
export type {
  FireRedExecutionProvider,
  FireRedRuntimeTarget,
  FireRedVADOptions,
  FireRedVoiceDetectorOptions,
} from "./firered-types.js";
export type {
  VAD,
  VADOptions,
  VADResult,
  WAVData,
  VoiceDetector,
  VoiceDetectorOptions,
  VoiceDetectorResult,
} from "./types.js";

export function createVAD(options?: VADOptions): Promise<VAD>;
export function createVAD(options?: FireRedVADOptions): Promise<VAD>;
export function createVAD(
  options?: VADOptions | FireRedVADOptions,
): Promise<VAD> {
  return createFireRedVAD(
    options as FireRedVADOptions | undefined,
    "web",
    "webgpu",
  );
}

export function createVoiceDetector(
  options?: VoiceDetectorOptions,
): Promise<VoiceDetector>;
export function createVoiceDetector(
  options?: FireRedVoiceDetectorOptions,
): Promise<VoiceDetector>;
export function createVoiceDetector(
  options?: VoiceDetectorOptions | FireRedVoiceDetectorOptions,
): Promise<VoiceDetector> {
  return createFireRedVoiceDetector(
    options as FireRedVoiceDetectorOptions | undefined,
    "web",
    "webgpu",
  );
}

export {
  computeRMS as computeFireRedRMS,
  VOICE_DETECTOR_DEFAULTS as FIRERED_DEFAULTS,
};