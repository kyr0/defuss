export const FIRERED_SAMPLE_RATE = 16_000;
export const FIRERED_FRAME_LENGTH = 400;
export const FIRERED_FRAME_SHIFT = 160;
export const FIRERED_FFT_SIZE = 512;
export const FIRERED_FFT_BINS = FIRERED_FFT_SIZE / 2 + 1;
export const FIRERED_MEL_BANDS = 80;

const LOW_FREQ = 20;
const HIGH_FREQ = 8_000;
const PREEMPH_COEFF = 0.97;
const FLOAT32_EPSILON = 1.1920928955078125e-7;

interface MelFilter {
  startBin: number;
  weights: Float32Array;
}

interface FftTables {
  bitReverse: Uint16Array;
  cosTable: Float64Array;
  sinTable: Float64Array;
}

const POVEY_WINDOW = createPoveyWindow();
const MEL_FILTERS = createMelFilterbank();
const FFT_TABLES = createFftTables(FIRERED_FFT_SIZE);

export class FireRedFbankExtractor {
  private readonly overlapBuffer = new Float64Array(
    FIRERED_FRAME_LENGTH - FIRERED_FRAME_SHIFT,
  );
  private readonly frameBuffer = new Float64Array(FIRERED_FRAME_LENGTH);
  private readonly workFrame = new Float64Array(FIRERED_FRAME_LENGTH);
  private readonly fftReal = new Float64Array(FIRERED_FFT_SIZE);
  private readonly fftImag = new Float64Array(FIRERED_FFT_SIZE);
  private readonly powerSpectrum = new Float64Array(FIRERED_FFT_BINS);
  private firstFrame = true;

  extractFrame(
    samples: Float32Array,
    output = new Float32Array(FIRERED_MEL_BANDS),
  ): Float32Array {
    if (samples.length !== FIRERED_FRAME_SHIFT) {
      throw new Error(
        `Expected ${FIRERED_FRAME_SHIFT} FireRed samples, got ${samples.length}`,
      );
    }
    if (this.firstFrame) {
      throw new Error("FireRed FBank must start with extractFrameFull()");
    }

    this.frameBuffer.set(this.overlapBuffer, 0);
    for (let index = 0; index < FIRERED_FRAME_SHIFT; index++) {
      this.frameBuffer[FIRERED_FRAME_LENGTH - FIRERED_FRAME_SHIFT + index] =
        samples[index]!;
    }

    this.overlapBuffer.set(this.frameBuffer.subarray(FIRERED_FRAME_SHIFT));
    this.processFrame(this.frameBuffer, output);
    return output;
  }

  extractFrameFull(
    frameSamples: Float32Array,
    output = new Float32Array(FIRERED_MEL_BANDS),
  ): Float32Array {
    if (frameSamples.length !== FIRERED_FRAME_LENGTH) {
      throw new Error(
        `Expected ${FIRERED_FRAME_LENGTH} FireRed samples, got ${frameSamples.length}`,
      );
    }

    this.overlapBuffer.set(frameSamples.subarray(FIRERED_FRAME_SHIFT));
    this.firstFrame = false;

    for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
      this.frameBuffer[index] = frameSamples[index]!;
    }

    this.processFrame(this.frameBuffer, output);
    return output;
  }

  reset(): void {
    this.overlapBuffer.fill(0);
    this.frameBuffer.fill(0);
    this.workFrame.fill(0);
    this.fftReal.fill(0);
    this.fftImag.fill(0);
    this.powerSpectrum.fill(0);
    this.firstFrame = true;
  }

  private processFrame(frame: Float64Array, output: Float32Array): void {
    this.workFrame.set(frame);

    let mean = 0;
    for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
      mean += this.workFrame[index]!;
    }
    mean /= FIRERED_FRAME_LENGTH;

    for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
      this.workFrame[index]! -= mean;
    }

    for (let index = FIRERED_FRAME_LENGTH - 1; index >= 1; index--) {
      this.workFrame[index]! -= PREEMPH_COEFF * this.workFrame[index - 1]!;
    }
    this.workFrame[0]! -= PREEMPH_COEFF * this.workFrame[0]!;

    for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
      this.workFrame[index]! *= POVEY_WINDOW[index]!;
    }

    for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
      this.fftReal[index] = this.workFrame[index]!;
      this.fftImag[index] = 0;
    }
    this.fftReal.fill(0, FIRERED_FRAME_LENGTH);
    this.fftImag.fill(0, FIRERED_FRAME_LENGTH);

    fftInPlace(this.fftReal, this.fftImag, FFT_TABLES);

    for (let bin = 0; bin < FIRERED_FFT_BINS; bin++) {
      const real = this.fftReal[bin]!;
      const imag = this.fftImag[bin]!;
      this.powerSpectrum[bin] = real * real + imag * imag;
    }

    for (let band = 0; band < FIRERED_MEL_BANDS; band++) {
      const filter = MEL_FILTERS[band]!;
      let energy = 0;

      for (let index = 0; index < filter.weights.length; index++) {
        energy +=
          filter.weights[index]! *
          this.powerSpectrum[filter.startBin + index]!;
      }

      output[band] = Math.log(Math.max(FLOAT32_EPSILON, energy));
    }
  }
}

function melScale(freq: number): number {
  return 1127 * Math.log(1 + freq / 700);
}

function createPoveyWindow(): Float64Array {
  const window = new Float64Array(FIRERED_FRAME_LENGTH);
  for (let index = 0; index < FIRERED_FRAME_LENGTH; index++) {
    const hann =
      0.5 -
      0.5 *
        Math.cos(
          (2 * Math.PI * index) / (FIRERED_FRAME_LENGTH - 1),
        );
    window[index] = Math.pow(hann, 0.85);
  }
  return window;
}

function createMelFilterbank(): MelFilter[] {
  const melLow = melScale(LOW_FREQ);
  const melHigh = melScale(HIGH_FREQ);
  const melDelta = (melHigh - melLow) / (FIRERED_MEL_BANDS + 1);
  const fftBinWidth = FIRERED_SAMPLE_RATE / FIRERED_FFT_SIZE;
  const filters: MelFilter[] = [];

  for (let band = 0; band < FIRERED_MEL_BANDS; band++) {
    const leftMel = melLow + band * melDelta;
    const centerMel = melLow + (band + 1) * melDelta;
    const rightMel = melLow + (band + 2) * melDelta;

    let startBin = FIRERED_FFT_BINS;
    const weights: number[] = [];

    for (let bin = 0; bin < FIRERED_FFT_BINS; bin++) {
      const freq = fftBinWidth * bin;
      const mel = melScale(freq);

      if (mel > leftMel && mel < rightMel) {
        const weight =
          mel <= centerMel
            ? (mel - leftMel) / (centerMel - leftMel)
            : (rightMel - mel) / (rightMel - centerMel);

        if (startBin === FIRERED_FFT_BINS) {
          startBin = bin;
        }

        const expectedIndex = bin - startBin;
        while (weights.length < expectedIndex) {
          weights.push(0);
        }
        weights.push(weight);
      }
    }

    if (startBin === FIRERED_FFT_BINS) {
      startBin = 0;
    }

    filters.push({
      startBin,
      weights: Float32Array.from(weights),
    });
  }

  return filters;
}

function createFftTables(size: number): FftTables {
  if (size === 0 || (size & (size - 1)) !== 0) {
    throw new Error(`FFT size must be a power of two, got ${size}`);
  }

  const levels = Math.round(Math.log2(size));
  const bitReverse = new Uint16Array(size);
  const cosTable = new Float64Array(size / 2);
  const sinTable = new Float64Array(size / 2);

  for (let index = 0; index < size; index++) {
    let value = index;
    let reversed = 0;
    for (let bit = 0; bit < levels; bit++) {
      reversed = (reversed << 1) | (value & 1);
      value >>>= 1;
    }
    bitReverse[index] = reversed;
  }

  for (let index = 0; index < size / 2; index++) {
    const angle = (-2 * Math.PI * index) / size;
    cosTable[index] = Math.cos(angle);
    sinTable[index] = Math.sin(angle);
  }

  return { bitReverse, cosTable, sinTable };
}

function fftInPlace(
  real: Float64Array,
  imag: Float64Array,
  tables: FftTables,
): void {
  const size = real.length;

  for (let index = 0; index < size; index++) {
    const swapped = tables.bitReverse[index]!;
    if (swapped > index) {
      const realValue = real[index]!;
      const imagValue = imag[index]!;
      real[index] = real[swapped]!;
      imag[index] = imag[swapped]!;
      real[swapped] = realValue;
      imag[swapped] = imagValue;
    }
  }

  for (let blockSize = 2; blockSize <= size; blockSize <<= 1) {
    const halfSize = blockSize >> 1;
    const tableStep = size / blockSize;

    for (let blockStart = 0; blockStart < size; blockStart += blockSize) {
      let tableIndex = 0;

      for (let index = blockStart; index < blockStart + halfSize; index++) {
        const matchIndex = index + halfSize;
        const cos = tables.cosTable[tableIndex]!;
        const sin = tables.sinTable[tableIndex]!;

        const tempReal =
          real[matchIndex]! * cos - imag[matchIndex]! * sin;
        const tempImag =
          real[matchIndex]! * sin + imag[matchIndex]! * cos;

        real[matchIndex] = real[index]! - tempReal;
        imag[matchIndex] = imag[index]! - tempImag;
        real[index] += tempReal;
        imag[index] += tempImag;

        tableIndex += tableStep;
      }
    }
  }
}