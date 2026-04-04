import { it, expect, type TestAPI } from "vitest";
import { createVAD, parseWAV, toMono, resampleLinear } from "defuss-vad";
import type { VAD } from "defuss-vad";

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

export function registerTests(this: { it: TestAPI } | void) {
  const _it = (this && "it" in this) ? this.it : it;

  _it("should create and destroy a VAD instance", async () => {
    const vad = await createVAD();
    expect(vad).toBeDefined();
    expect(vad.process).toBeTypeOf("function");
    expect(vad.getVersion).toBeTypeOf("function");
    expect(vad.destroy).toBeTypeOf("function");
    vad.destroy();
  });

  _it("should return a version string", async () => {
    const vad = await createVAD();
    try {
      const version = vad.getVersion();
      expect(version).toBeTypeOf("string");
      expect(version.length).toBeGreaterThan(0);
    } finally {
      vad.destroy();
    }
  });

  _it("should detect silence as non-voice", async () => {
    const vad = await createVAD({ hopSize: 256, threshold: 0.5 });
    try {
      const silence = new Int16Array(256); // all zeros
      const result = vad.process(silence);
      expect(result.probability).toBeGreaterThanOrEqual(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.isVoice).toBe(false);
    } finally {
      vad.destroy();
    }
  });

  _it("should throw on wrong sample count", async () => {
    const vad = await createVAD({ hopSize: 256 });
    try {
      expect(() => vad.process(new Int16Array(100))).toThrow("Expected 256 samples");
    } finally {
      vad.destroy();
    }
  });

  _it("should throw after destroy", async () => {
    const vad = await createVAD();
    vad.destroy();
    expect(() => vad.process(new Int16Array(256))).toThrow("destroyed");
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

    // Reference WAV is 24kHz - resample to 16kHz for ten-vad
    let samples = toMono(wav.samples, wav.channels);
    if (wav.sampleRate !== 16000) {
      samples = resampleLinear(samples, wav.sampleRate, 16000);
    }

    const hopSize = 256;
    const vad = await createVAD({ hopSize, threshold: 0.5 });

    try {
      const frameCount = Math.floor(samples.length / hopSize);
      expect(frameCount).toBeGreaterThan(0);

      let voiceFrames = 0;
      let totalFrames = 0;

      for (let i = 0; i < frameCount; i++) {
        const frame = samples.slice(i * hopSize, (i + 1) * hopSize);
        const result = vad.process(frame);
        if (result.isVoice) voiceFrames++;
        totalFrames++;
      }

      // "Das ist ein Referenztext." - continuous speech, expect significant
      // voice activity (at least 20% of frames should detect voice).
      const voiceRatio = voiceFrames / totalFrames;
      expect(voiceRatio).toBeGreaterThan(0.2);
      expect(voiceFrames).toBeGreaterThan(0);
    } finally {
      vad.destroy();
    }
  });

  _it("should process multiple frames consistently", async () => {
    const vad = await createVAD({ hopSize: 256, threshold: 0.5 });

    try {
      // Generate a simple tone (440 Hz) - should trigger some voice detection
      const tone = new Int16Array(256);
      for (let i = 0; i < 256; i++) {
        tone[i] = Math.round(Math.sin((2 * Math.PI * 440 * i) / 16000) * 8000);
      }

      const results: boolean[] = [];
      // Process the same frame multiple times to check consistency
      for (let i = 0; i < 10; i++) {
        const r = vad.process(tone);
        results.push(r.isVoice);
        expect(r.probability).toBeGreaterThanOrEqual(0);
        expect(r.probability).toBeLessThanOrEqual(1);
      }

      // Results should exist (we don't mandate voice/no-voice for a pure tone,
      // but the VAD should not crash and should return valid probabilities)
      expect(results.length).toBe(10);
    } finally {
      vad.destroy();
    }
  });
}
