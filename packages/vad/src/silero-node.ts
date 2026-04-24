import type {
  SileroAssetOptions,
  SileroSampleRate,
  SileroVADOptions,
  SileroVoiceDetectorOptions,
} from "./silero-types.js";
import {
  createSileroVAD,
  createSileroVoiceDetector,
  getSileroContextSize,
  getSileroHopSize,
  SILERO_AUDIO_REQUIREMENTS,
  SILERO_SUPPORTED_SAMPLE_RATES,
} from "./silero-vad.js";
import type {
  VAD,
  VADOptions,
  VADResult,
  WAVData,
  VoiceDetector,
  VoiceDetectorOptions,
  VoiceDetectorResult,
} from "./types.js";
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
  createSileroVAD,
  createSileroVoiceDetector,
  getSileroContextSize,
  getSileroHopSize,
  SILERO_AUDIO_REQUIREMENTS,
  SILERO_SUPPORTED_SAMPLE_RATES,
} from "./silero-vad.js";
export type {
  SileroAssetOptions,
  SileroRuntimeTarget,
  SileroSampleRate,
  SileroVADOptions,
  SileroVoiceDetectorOptions,
} from "./silero-types.js";
export type {
  VAD,
  VADOptions,
  VADResult,
  WAVData,
  VoiceDetector,
  VoiceDetectorOptions,
  VoiceDetectorResult,
} from "./types.js";

type SileroPublicVADOptions = VADOptions & SileroAssetOptions;
type SileroPublicVoiceDetectorOptions = VoiceDetectorOptions & SileroAssetOptions;

export function createVAD(options?: VADOptions): Promise<VAD>;
export function createVAD(options?: SileroPublicVADOptions): Promise<VAD>;
export function createVAD(
  options?: VADOptions | SileroPublicVADOptions,
): Promise<VAD> {
  return createSileroVAD(options as SileroVADOptions | undefined, "node");
}

export function createVoiceDetector(
  options?: VoiceDetectorOptions,
): Promise<VoiceDetector>;
export function createVoiceDetector(
  options?: SileroPublicVoiceDetectorOptions,
): Promise<VoiceDetector>;
export function createVoiceDetector(
  options?: VoiceDetectorOptions | SileroPublicVoiceDetectorOptions,
): Promise<VoiceDetector> {
  return createSileroVoiceDetector(
    options as SileroVoiceDetectorOptions | undefined,
    "node",
  );
}

export {
  computeRMS as computeSileroRMS,
  VOICE_DETECTOR_DEFAULTS as SILERO_DEFAULTS,
};