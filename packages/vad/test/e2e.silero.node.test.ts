import { describe, expect, it } from "vitest";
import * as sileroNode from "defuss-vad/silero-node";
import { registerTests } from "./e2e.shared.js";

describe(
  "defuss-vad e2e (Silero Node.js)",
  registerTests(sileroNode, {
    hopSize: 512,
    minVoiceRatio: 0.1,
    sampleRate: 16000,
  }),
);

describe("defuss-vad Silero Node.js (8kHz)", () => {
  it("should expose the expected audio requirements", () => {
    expect(sileroNode.SILERO_AUDIO_REQUIREMENTS.defaultSampleRate).toBe(16000);
    expect(sileroNode.SILERO_AUDIO_REQUIREMENTS.frameSizes[8000]).toBe(256);
    expect(sileroNode.SILERO_AUDIO_REQUIREMENTS.frameSizes[16000]).toBe(512);
    expect(sileroNode.SILERO_AUDIO_REQUIREMENTS.contextSizes[8000]).toBe(32);
    expect(sileroNode.SILERO_AUDIO_REQUIREMENTS.contextSizes[16000]).toBe(64);
    expect(sileroNode.SILERO_SUPPORTED_SAMPLE_RATES).toEqual([8000, 16000]);
  });

  it("should reject unsupported sample rates", async () => {
    await expect(
      sileroNode.createVAD({
        sampleRate: 12000 as never,
      }),
    ).rejects.toThrow("SileroVAD supports sampleRate 8000 or 16000");
  });

  it("should reject mismatched 8k frame sizes", async () => {
    await expect(
      sileroNode.createVAD({
        sampleRate: 8000,
        hopSize: 512,
      }),
    ).rejects.toThrow("SileroVAD requires hopSize 256 for sampleRate 8000");
  });

  it("should detect voice in the 8kHz-resampled reference WAV", async () => {
    const { readFile } = await import("node:fs/promises");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");

    const dir = dirname(fileURLToPath(import.meta.url));
    const wavPath = join(dir, "..", "assets", "reference.wav");
    const buffer = await readFile(wavPath);
    const wav = sileroNode.parseWAV(
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
    );

    let samples = sileroNode.toMono(wav.samples, wav.channels);
    if (wav.sampleRate !== 8000) {
      samples = sileroNode.resampleLinear(samples, wav.sampleRate, 8000);
    }

    const vad = await sileroNode.createVAD({
      sampleRate: 8000,
      hopSize: 256,
      threshold: 0.5,
    });

    try {
      const frameCount = Math.floor(samples.length / 256);
      let voiceFrames = 0;

      for (let index = 0; index < frameCount; index++) {
        const frame = samples.slice(index * 256, (index + 1) * 256);
        const result = await vad.process(frame);
        if (result.isVoice) {
          voiceFrames++;
        }
      }

      expect(frameCount).toBeGreaterThan(0);
      expect(voiceFrames).toBeGreaterThan(0);
      expect(voiceFrames / frameCount).toBeGreaterThan(0.1);
    } finally {
      await vad.destroy();
    }
  });
});