import type { WAVData } from "./types.js";

/**
 * Parse a WAV file buffer (PCM 16-bit) and return metadata + raw samples.
 *
 * Supports standard RIFF/WAVE files with 16-bit PCM encoding.
 * Throws on invalid or unsupported formats.
 */
export function parseWAV(buffer: ArrayBuffer): WAVData {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  if (buffer.byteLength < 44) {
    throw new Error("Invalid WAV file: too small");
  }

  // RIFF header
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  if (riff !== "RIFF") {
    throw new Error("Invalid WAV file: missing RIFF header");
  }

  const wave = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  if (wave !== "WAVE") {
    throw new Error("Invalid WAV file: not WAVE format");
  }

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataSize = 0;

  // Walk chunks
  while (offset < buffer.byteLength - 8) {
    const chunkId = String.fromCharCode(
      bytes[offset]!,
      bytes[offset + 1]!,
      bytes[offset + 2]!,
      bytes[offset + 3]!,
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === "fmt ") {
      const audioFormat = view.getUint16(offset + 8, true);
      if (audioFormat !== 1) {
        throw new Error("Unsupported WAV format: only PCM is supported");
      }
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
      bitsPerSample = view.getUint16(offset + 22, true);
      if (bitsPerSample !== 16) {
        throw new Error("Unsupported bit depth: only 16-bit is supported");
      }
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = chunkSize;
      break;
    }

    offset += 8 + chunkSize;
    // Align to even byte boundary
    if (chunkSize % 2 === 1) offset++;
  }

  if (dataOffset === -1) {
    throw new Error("Invalid WAV file: no data chunk found");
  }

  const samples = new Int16Array(
    buffer.slice(dataOffset, dataOffset + dataSize),
  );

  return { sampleRate, channels, bitsPerSample, samples };
}

/**
 * Extract the first channel from interleaved multi-channel samples.
 */
export function toMono(samples: Int16Array, channels: number): Int16Array {
  if (channels === 1) return samples;
  const mono = new Int16Array(Math.floor(samples.length / channels));
  for (let i = 0; i < mono.length; i++) {
    mono[i] = samples[i * channels]!;
  }
  return mono;
}

/**
 * Resample audio from one sample rate to another using linear interpolation.
 *
 * This is a simple resampler suitable for converting between common rates
 * (e.g. 24kHz => 16kHz). For production use with high quality requirements,
 * consider a proper sinc-based resampler.
 */
export function resampleLinear(
  samples: Int16Array,
  fromRate: number,
  toRate: number,
): Int16Array {
  if (fromRate === toRate) return samples;

  const ratio = fromRate / toRate;
  const outLength = Math.floor(samples.length / ratio);
  const out = new Int16Array(outLength);

  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const lo = Math.floor(srcIdx);
    const hi = Math.min(lo + 1, samples.length - 1);
    const frac = srcIdx - lo;
    out[i] = Math.round(samples[lo]! * (1 - frac) + samples[hi]! * frac);
  }

  return out;
}
