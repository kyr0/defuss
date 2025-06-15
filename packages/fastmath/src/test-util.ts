// Pseudo-random number generator for reproducible results
export class SeededRandom {
  private seed: number;

  constructor(seed = 42) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// Data generation functions with configurable size and pseudo-random values
export const createTestData = {
  // Generate test data for benchmarking
  convolution1D: (signalSize: number, kernelSize: number) => {
    const signal = createTestData.signal(signalSize);
    const kernel = createTestData.kernel1D(kernelSize);
    return { signal, kernel };
  },

  convolution2D: (imageSize: number, kernelSize: number) => {
    const image = createTestData.image2D(imageSize);
    const kernel = createTestData.kernel2D(kernelSize);
    return { image, kernel, imageSize, kernelSize };
  },

  // 1D data generation
  signal: (size: number, seed = 42): Float32Array => {
    const rng = new SeededRandom(seed);
    return new Float32Array(size).fill(0).map(() => rng.range(-1, 1));
  },

  kernel1D: (size: number, seed = 123): Float32Array => {
    const rng = new SeededRandom(seed);
    const kernel = new Float32Array(size)
      .fill(0)
      .map(() => rng.range(-0.5, 0.5));
    // Normalize kernel
    const sum = kernel.reduce((acc, val) => acc + Math.abs(val), 0);
    return kernel.map((val) => val / sum);
  },

  // 2D data generation
  image2D: (size: number, seed = 84): Float32Array => {
    const rng = new SeededRandom(seed);
    return new Float32Array(size * size).fill(0).map(() => rng.range(0, 1));
  },

  kernel2D: (size: number, seed = 246): Float32Array => {
    const rng = new SeededRandom(seed);
    const kernel = new Float32Array(size * size)
      .fill(0)
      .map(() => rng.range(-0.1, 0.1));
    // Normalize kernel
    const sum = kernel.reduce((acc, val) => acc + Math.abs(val), 0);
    return kernel.map((val) => val / sum);
  },

  // 3D data generation (for potential future use)
  data3D: (size: number, seed = 168): Float32Array => {
    const rng = new SeededRandom(seed);
    return new Float32Array(size * size * size)
      .fill(0)
      .map(() => rng.range(-1, 1));
  },
};
