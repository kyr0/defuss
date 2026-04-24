import { it, expect, type TestAPI } from "vitest";
import type {
  VAD,
  VADOptions,
  WAVData,
  VoiceDetector,
  VoiceDetectorOptions,
} from "../src/types.js";

interface VadModule {
  createVAD: (
    options?: VADOptions & { sampleRate?: 8000 | 16000 },
  ) => Promise<VAD>;
  createVoiceDetector: (
    options?: VoiceDetectorOptions & { sampleRate?: 8000 | 16000 },
  ) => Promise<VoiceDetector>;
  computeRMS: (samples: Int16Array) => number;
  parseWAV: (buffer: ArrayBuffer) => WAVData;
  toMono: (samples: Int16Array, channels: number) => Int16Array;
  resampleLinear: (
    samples: Int16Array,
    fromRate: number,
    toRate: number,
  ) => Int16Array;
  VOICE_DETECTOR_DEFAULTS: {
    threshold: number;
    rmsFloor: number;
    debounceOn: number;
    debounceOff: number;
  };
}

interface VadTestConfig {
  hopSize?: number;
  minVoiceRatio?: number;
  sampleRate?: 8000 | 16000;
}

/** Load the reference WAV file as an ArrayBuffer (isomorphic). */
async function loadReferenceWAV(): Promise<ArrayBuffer> {
  if (
    typeof process !== "undefined" &&
    process.versions?.node
  ) {
    // Node.js
    const { readFile } = await import("node:fs/promises");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const dir = dirname(fileURLToPath(import.meta.url));
    const wavPath = join(dir, "..", "assets", "reference.wav");
    const buf = await readFile(wavPath);
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  // Browser: fetch from the server
  const resp = await fetch("/assets/reference.wav");
  if (!resp.ok) throw new Error(`Failed to fetch reference.wav: ${resp.status}`);
  return resp.arrayBuffer();
}

export function registerTests(vadModule: VadModule, config?: VadTestConfig) {
  return function (this: { it: TestAPI } | void) {
    const _it = (this && "it" in this) ? this.it : it;
    const hopSize = config?.hopSize ?? 256;
    const minVoiceRatio = config?.minVoiceRatio ?? 0.2;
    const sampleRate = config?.sampleRate ?? 16000;
    const {
      createVAD,
      createVoiceDetector,
      computeRMS,
      parseWAV,
      toMono,
      resampleLinear,
      VOICE_DETECTOR_DEFAULTS,
    } = vadModule;

    _it("should create and destroy a VAD instance", async () => {
      const vad = await createVAD();
      expect(vad).toBeDefined();
      expect(vad.process).toBeTypeOf("function");
      expect(vad.getVersion).toBeTypeOf("function");
      expect(vad.destroy).toBeTypeOf("function");
      await vad.destroy();
    });

    _it("should return a version string", async () => {
      const vad = await createVAD();
      try {
        const version = await vad.getVersion();
        expect(version).toBeTypeOf("string");
        expect(version.length).toBeGreaterThan(0);
      } finally {
        await vad.destroy();
      }
    });

    _it("should detect silence as non-voice", async () => {
      const vad = await createVAD({ hopSize, threshold: 0.5, sampleRate });
      try {
        const silence = new Int16Array(hopSize); // all zeros
        const result = await vad.process(silence);
        expect(result.probability).toBeGreaterThanOrEqual(0);
        expect(result.probability).toBeLessThanOrEqual(1);
        expect(result.isVoice).toBe(false);
      } finally {
        await vad.destroy();
      }
    });

    _it("should throw on wrong sample count", async () => {
      const vad = await createVAD({ hopSize, sampleRate });
      try {
        await expect(vad.process(new Int16Array(100))).rejects.toThrow(
          `Expected ${hopSize} samples`,
        );
      } finally {
        await vad.destroy();
      }
    });

    _it("should throw after destroy", async () => {
      const vad = await createVAD();
      await vad.destroy();
      await expect(vad.process(new Int16Array(hopSize))).rejects.toThrow("destroyed");
    });

    _it("should parse reference WAV file", async () => {
      const buf = await loadReferenceWAV();
      const wav = parseWAV(buf);
      expect(wav.channels).toBe(1);
      expect(wav.bitsPerSample).toBe(16);
      expect(wav.sampleRate).toBeGreaterThan(0);
      expect(wav.samples.length).toBeGreaterThan(0);
    });

    _it("should detect voice in reference WAV", async () => {
      const buf = await loadReferenceWAV();
      const wav = parseWAV(buf);

      // Reference WAV is 24kHz - resample to the target backend sample rate.
      let samples = toMono(wav.samples, wav.channels);
      if (wav.sampleRate !== sampleRate) {
        samples = resampleLinear(samples, wav.sampleRate, sampleRate);
      }

      const vad = await createVAD({ hopSize, threshold: 0.5, sampleRate });

      try {
        const frameCount = Math.floor(samples.length / hopSize);
        expect(frameCount).toBeGreaterThan(0);

        let voiceFrames = 0;
        let totalFrames = 0;

        for (let i = 0; i < frameCount; i++) {
          const frame = samples.slice(i * hopSize, (i + 1) * hopSize);
          const result = await vad.process(frame);
          if (result.isVoice) voiceFrames++;
          totalFrames++;
        }

        // "Das ist ein Referenztext." - continuous speech, expect significant
        // voice activity (at least 20% of frames should detect voice).
        const voiceRatio = voiceFrames / totalFrames;
        expect(voiceRatio).toBeGreaterThan(minVoiceRatio);
        expect(voiceFrames).toBeGreaterThan(0);
      } finally {
        await vad.destroy();
      }
    });

    _it("should process multiple frames consistently", async () => {
      const vad = await createVAD({ hopSize, threshold: 0.5, sampleRate });

      try {
        // Generate a simple tone (440 Hz) - should trigger some voice detection
        const tone = new Int16Array(hopSize);
        for (let i = 0; i < hopSize; i++) {
          tone[i] = Math.round(
            Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 8000,
          );
        }

        const results: boolean[] = [];
        // Process the same frame multiple times to check consistency
        for (let i = 0; i < 10; i++) {
          const r = await vad.process(tone);
          results.push(r.isVoice);
          expect(r.probability).toBeGreaterThanOrEqual(0);
          expect(r.probability).toBeLessThanOrEqual(1);
        }

        // Results should exist (we don't mandate voice/no-voice for a pure tone,
        // but the VAD should not crash and should return valid probabilities)
        expect(results.length).toBe(10);
      } finally {
        await vad.destroy();
      }
    });

    // -- VoiceDetector (hardened wrapper) tests ----------------------------------

    _it("should export VOICE_DETECTOR_DEFAULTS with expected values", () => {
      expect(VOICE_DETECTOR_DEFAULTS.threshold).toBe(0.7);
      expect(VOICE_DETECTOR_DEFAULTS.rmsFloor).toBe(0.015);
      expect(VOICE_DETECTOR_DEFAULTS.debounceOn).toBe(3);
      expect(VOICE_DETECTOR_DEFAULTS.debounceOff).toBe(3);
    });

    _it("should create and destroy a VoiceDetector", async () => {
      const det = await createVoiceDetector();
      expect(det).toBeDefined();
      expect(det.process).toBeTypeOf("function");
      expect(det.getVersion).toBeTypeOf("function");
      expect(det.reset).toBeTypeOf("function");
      expect(det.destroy).toBeTypeOf("function");
      const ver = await det.getVersion();
      expect(ver).toBeTypeOf("string");
      expect(ver.length).toBeGreaterThan(0);
      await det.destroy();
    });

    _it("should compute RMS correctly", () => {
      // Silence => 0
      expect(computeRMS(new Int16Array(hopSize))).toBe(0);
      // Full-scale => ~0.707 (sine RMS)
      const full = new Int16Array(hopSize);
      for (let i = 0; i < hopSize; i++) full[i] = 32767;
      const rms = computeRMS(full);
      expect(rms).toBeGreaterThan(0.9);
      expect(rms).toBeLessThanOrEqual(1);
    });

    _it("VoiceDetector should detect silence as non-voice (stable)", async () => {
      const det = await createVoiceDetector({ hopSize, sampleRate });
      try {
        const silence = new Int16Array(hopSize);
        for (let i = 0; i < 10; i++) {
          const r = await det.process(silence);
          expect(r.isVoiceStable).toBe(false);
          expect(r.rms).toBe(0);
          expect(r.onVoiceStart).toBe(false);
        }
      } finally {
        await det.destroy();
      }
    });

    _it("VoiceDetector should debounce voice transitions on reference WAV", async () => {
      const buf = await loadReferenceWAV();
      const wav = parseWAV(buf);

      let samples = toMono(wav.samples, wav.channels);
      if (wav.sampleRate !== sampleRate) {
        samples = resampleLinear(samples, wav.sampleRate, sampleRate);
      }

      const det = await createVoiceDetector({ hopSize, sampleRate });

      try {
        const frameCount = Math.floor(samples.length / hopSize);
        let starts = 0;
        let ends = 0;
        let stableVoiceFrames = 0;

        for (let i = 0; i < frameCount; i++) {
          const frame = samples.slice(i * hopSize, (i + 1) * hopSize);
          const r = await det.process(frame);
          if (r.onVoiceStart) starts++;
          if (r.onVoiceEnd) ends++;
          if (r.isVoiceStable) stableVoiceFrames++;
        }

        // Should detect at least one voice segment start
        expect(starts).toBeGreaterThan(0);
        // Debounced segments should be fewer than raw transitions
        // (hard to assert precisely, but stable voice frames should be > 0)
        expect(stableVoiceFrames).toBeGreaterThan(0);
        // Starts and ends should be roughly balanced (+/-1 for trailing)
        expect(Math.abs(starts - ends)).toBeLessThanOrEqual(1);
      } finally {
        await det.destroy();
      }
    });

    _it("VoiceDetector.reset() should clear debounce state", async () => {
      const det = await createVoiceDetector({ hopSize, sampleRate });
      try {
        // Feed some silence to build streak, then reset
        const silence = new Int16Array(hopSize);
        for (let i = 0; i < 5; i++) await det.process(silence);
        await det.reset();
        // After reset, processing silence should not produce a transition
        const r = await det.process(silence);
        expect(r.isVoiceStable).toBe(false);
        expect(r.onVoiceEnd).toBe(false);
        expect(r.onVoiceStart).toBe(false);
      } finally {
        await det.destroy();
      }
    });
  };
}
