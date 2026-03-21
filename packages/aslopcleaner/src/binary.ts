import { open } from 'node:fs/promises';

const SAMPLE_SIZE = 1024;
const MAX_SAMPLES = 5;
const SUSPICIOUS_RATIO = 0.15;

function getSampleOffsets(size: number): number[] {
  if (size <= SAMPLE_SIZE) {
    return [0];
  }

  const maxOffset = Math.max(0, size - SAMPLE_SIZE);
  const offsets = new Set<number>([0, maxOffset]);

  for (let i = 1; i < MAX_SAMPLES - 1; i += 1) {
    offsets.add(Math.floor((maxOffset * i) / (MAX_SAMPLES - 1)));
  }

  return [...offsets].sort((a, b) => a - b);
}

function scoreSample(buffer: Uint8Array): number {
  let suspicious = 0;
  let total = 0;

  for (const byte of buffer) {
    if (byte === 0) {
      return 1;
    }

    total += 1;

    const isAllowedControl =
      byte === 9 || byte === 10 || byte === 13 || byte === 12;

    if ((byte < 32 && !isAllowedControl) || byte === 127) {
      suspicious += 1;
    }
  }

  return total === 0 ? 0 : suspicious / total;
}

export async function isProbablyBinary(filePath: string): Promise<boolean> {
  const handle = await open(filePath, 'r');

  try {
    const stats = await handle.stat();
    const offsets = getSampleOffsets(stats.size);
    const sampleBuffer = Buffer.allocUnsafe(SAMPLE_SIZE);

    for (const offset of offsets) {
      const { bytesRead } = await handle.read(sampleBuffer, 0, SAMPLE_SIZE, offset);
      if (bytesRead === 0) {
        continue;
      }

      const score = scoreSample(sampleBuffer.subarray(0, bytesRead));
      if (score >= SUSPICIOUS_RATIO) {
        return true;
      }
    }

    return false;
  } finally {
    await handle.close();
  }
}
