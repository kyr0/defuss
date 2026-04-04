/** Options for creating a VAD instance. */
export interface VADOptions {
  /** Number of samples per analysis frame. Default: 256 (16ms at 16kHz). */
  hopSize?: number;
  /** Voice detection threshold in [0.0, 1.0]. Default: 0.7. */
  threshold?: number;
  /**
   * Pre-loaded WASM binary. When provided, skips fetching the .wasm file.
   * Useful in Node.js or when bundling the binary separately.
   */
  wasmBinary?: ArrayBuffer | Uint8Array;
  /**
   * Custom function to resolve the WASM file path.
   * Receives the filename ("ten_vad.wasm") and the default prefix,
   * must return the full URL or path to the file.
   */
  locateFile?: (path: string, prefix: string) => string;
}

/** Result from processing a single audio frame. */
export interface VADResult {
  /** Voice probability in [0.0, 1.0]. */
  probability: number;
  /** Whether voice activity was detected (probability >= threshold). */
  isVoice: boolean;
}

/** A VAD instance with methods for processing audio. */
export interface VAD {
  /**
   * Process one frame of 16-bit PCM audio samples (16kHz, mono).
   * The length of `samples` must equal the configured `hopSize`.
   */
  process(samples: Int16Array): VADResult;
  /** Get the underlying ten-vad library version string. */
  getVersion(): string;
  /** Destroy the VAD instance and free WASM memory. */
  destroy(): void;
}

/** Metadata from a parsed WAV file. */
export interface WAVData {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  /** Raw PCM samples as Int16Array (interleaved if multi-channel). */
  samples: Int16Array;
}

// -- Voice Detector (hardened wrapper) -----------------------------------------

/** Options for the hardened voice detector. */
export interface VoiceDetectorOptions extends VADOptions {
  /**
   * Minimum RMS energy (0..1 scale) for a frame to be counted as voice.
   * Rejects quiet breaths, sibilants, and mic noise.
   * Default: 0.015.
   */
  rmsFloor?: number;
  /**
   * Number of consecutive raw-voice frames required before emitting
   * a voice-start transition. Filters single-frame spikes.
   * Default: 3.
   */
  debounceOn?: number;
  /**
   * Number of consecutive raw-silence frames required before emitting
   * a voice-end transition. Prevents flicker during brief pauses.
   * Default: 3.
   */
  debounceOff?: number;
}

/** Extended result from the hardened voice detector. */
export interface VoiceDetectorResult extends VADResult {
  /** RMS energy of the frame (0..1 scale, computed from Int16 samples). */
  rms: number;
  /** Debounced voice state (stable, unlike the raw `isVoice`). */
  isVoiceStable: boolean;
  /** True only on the frame where a voice-start transition occurs. */
  onVoiceStart: boolean;
  /** True only on the frame where a voice-end transition occurs. */
  onVoiceEnd: boolean;
}

/** A hardened voice detector with RMS gating and debounce. */
export interface VoiceDetector {
  /**
   * Process one frame of 16-bit PCM audio (16kHz, mono, `hopSize` samples).
   * Returns the raw VAD result plus debounced state and transition flags.
   */
  process(samples: Int16Array): VoiceDetectorResult;
  /** Get the underlying ten-vad library version string. */
  getVersion(): string;
  /** Reset the debounce state (e.g. when starting a new stream). */
  reset(): void;
  /** Destroy the underlying VAD instance and free WASM memory. */
  destroy(): void;
}
