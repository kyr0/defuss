/** Options for creating a VAD instance. */
export interface VADOptions {
  /** Number of samples per analysis frame. Default: 256 (16ms at 16kHz). */
  hopSize?: number;
  /** Voice detection threshold in [0.0, 1.0]. Default: 0.5. */
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
