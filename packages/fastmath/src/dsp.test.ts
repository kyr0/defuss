import { describe, it, expect, beforeAll } from "vitest";
import init, { sine, saw, triangle, square } from "../pkg/defuss_fastmath.js";

describe("Audio DSP Oscillators", () => {
  beforeAll(async () => {
    await init();
  });

  const sampleRate = 44100;
  const frequency = 440; // A4 note
  const amplitude = 1.0;
  const numSamples = 1024; // Stereo samples
  const currentFrame = BigInt(0);

  it("should generate sine wave correctly", () => {
    const buffer = new Float32Array(numSamples * 2); // Stereo buffer

    sine(buffer, frequency, amplitude, sampleRate, numSamples, currentFrame);

    // Check that buffer is not all zeros
    expect(buffer.some((sample) => sample !== 0)).toBe(true);

    // Check stereo interleaving (left and right channels should be the same)
    for (let i = 0; i < numSamples; i++) {
      expect(buffer[i * 2]).toBeCloseTo(buffer[i * 2 + 1], 5); // Left == Right
    }

    // Check amplitude bounds
    const maxValue = Math.max(...Array.from(buffer));
    const minValue = Math.min(...Array.from(buffer));
    expect(maxValue).toBeLessThanOrEqual(amplitude);
    expect(minValue).toBeGreaterThanOrEqual(-amplitude);
  });

  it("should generate sawtooth wave correctly", () => {
    const buffer = new Float32Array(numSamples * 2);

    saw(buffer, frequency, amplitude, sampleRate, numSamples, currentFrame);

    // Check that buffer is not all zeros
    expect(buffer.some((sample) => sample !== 0)).toBe(true);

    // Check stereo interleaving
    for (let i = 0; i < Math.min(10, numSamples); i++) {
      expect(buffer[i * 2]).toBeCloseTo(buffer[i * 2 + 1], 5);
    }

    // Check amplitude bounds
    const maxValue = Math.max(...Array.from(buffer));
    const minValue = Math.min(...Array.from(buffer));
    expect(maxValue).toBeLessThanOrEqual(amplitude);
    expect(minValue).toBeGreaterThanOrEqual(-amplitude);
  });

  it("should generate triangle wave correctly", () => {
    const buffer = new Float32Array(numSamples * 2);

    triangle(
      buffer,
      frequency,
      amplitude,
      sampleRate,
      numSamples,
      currentFrame,
    );

    // Check that buffer is not all zeros
    expect(buffer.some((sample) => sample !== 0)).toBe(true);

    // Check stereo interleaving
    for (let i = 0; i < Math.min(10, numSamples); i++) {
      expect(buffer[i * 2]).toBeCloseTo(buffer[i * 2 + 1], 5);
    }

    // Check amplitude bounds
    const maxValue = Math.max(...Array.from(buffer));
    const minValue = Math.min(...Array.from(buffer));
    expect(maxValue).toBeLessThanOrEqual(amplitude);
    expect(minValue).toBeGreaterThanOrEqual(-amplitude);
  });

  it("should generate square wave correctly", () => {
    const buffer = new Float32Array(numSamples * 2);

    square(buffer, frequency, amplitude, sampleRate, numSamples, currentFrame);

    // Check that buffer is not all zeros
    expect(buffer.some((sample) => sample !== 0)).toBe(true);

    // Check stereo interleaving
    for (let i = 0; i < Math.min(10, numSamples); i++) {
      expect(buffer[i * 2]).toBeCloseTo(buffer[i * 2 + 1], 5);
    }

    // Square wave should only have values of +amplitude or -amplitude (approximately)
    const uniqueValues = [
      ...new Set(Array.from(buffer).map((v) => Math.round(v * 10) / 10)),
    ];
    expect(uniqueValues.length).toBeLessThanOrEqual(3); // Should be mostly +1, -1, and maybe some intermediate values due to timing
  });

  it("should respect amplitude parameter", () => {
    const buffer1 = new Float32Array(100 * 2);
    const buffer2 = new Float32Array(100 * 2);
    const amplitude1 = 0.5;
    const amplitude2 = 0.25;

    sine(buffer1, frequency, amplitude1, sampleRate, 100, currentFrame);
    sine(buffer2, frequency, amplitude2, sampleRate, 100, currentFrame);

    const max1 = Math.max(...Array.from(buffer1));
    const max2 = Math.max(...Array.from(buffer2));

    // Amplitude2 should be roughly half of amplitude1
    expect(max2).toBeLessThan(max1);
    expect(max2 / max1).toBeCloseTo(0.5, 1);
  });

  it("should handle zero amplitude", () => {
    const buffer = new Float32Array(100 * 2);

    sine(buffer, frequency, 0.0, sampleRate, 100, currentFrame);

    // All samples should be zero
    expect(buffer.every((sample) => sample === 0)).toBe(true);
  });

  it("should handle different frequencies", () => {
    const buffer1 = new Float32Array(1000 * 2);
    const buffer2 = new Float32Array(1000 * 2);

    sine(buffer1, 220, amplitude, sampleRate, 1000, currentFrame); // A3
    sine(buffer2, 880, amplitude, sampleRate, 1000, currentFrame); // A5

    // Higher frequency should have more zero crossings
    let crossings1 = 0;
    let crossings2 = 0;

    for (let i = 1; i < 1000; i++) {
      if (buffer1[i * 2] >= 0 !== buffer1[(i - 1) * 2] >= 0) crossings1++;
      if (buffer2[i * 2] >= 0 !== buffer2[(i - 1) * 2] >= 0) crossings2++;
    }

    expect(crossings2).toBeGreaterThan(crossings1);
  });
});
