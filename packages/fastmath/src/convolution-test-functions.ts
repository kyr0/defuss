import {
  convolution,
  cross_correlation,
  convolution_2d,
  auto_correlation,
} from "../pkg/defuss_fastmath.js";

// Pseudo-random number generator for reproducible results
class SeededRandom {
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

// Configurable test functions based on size
export const convolutionTestFunctions = {
  // 1D Convolution test with configurable size
  test1DConvolution: (size = 4, kernelSize = 3) => {
    const signal = createTestData.signal(size);
    const kernel = createTestData.kernel1D(kernelSize);
    const result = new Float32Array(size + kernelSize - 1);
    convolution(signal, kernel, result);
    return { signal, kernel, result };
  },

  // Cross correlation test with configurable size
  testCrossCorrelation: (size = 5, templateSize = 3) => {
    const signal = createTestData.signal(size);
    const template = createTestData.kernel1D(templateSize);
    const result = new Float32Array(size - templateSize + 1);
    cross_correlation(signal, template, result);
    return { signal, template, result };
  },

  // 2D Convolution test with configurable size
  test2DConvolution: (imageSize = 3, kernelSize = 3) => {
    const image = createTestData.image2D(imageSize);
    const kernel = createTestData.kernel2D(kernelSize);
    const result = new Float32Array(imageSize * imageSize);
    convolution_2d(image, kernel, result, imageSize, imageSize, kernelSize);
    return { image, kernel, result, imageSize, kernelSize };
  },

  // Auto correlation test with configurable size
  testAutoCorrelation: (size = 5, maxLag = 2) => {
    const signal = createTestData.signal(size);
    const result = new Float32Array(2 * maxLag + 1);
    auto_correlation(signal, result, maxLag);
    return { signal, result, maxLag };
  },

  // Impulse response test with configurable size
  testImpulseResponse: (signalSize = 4, kernelSize = 3) => {
    const signal = new Float32Array(signalSize);
    signal[0] = 1; // Impulse at the beginning
    const kernel = createTestData.kernel1D(kernelSize);
    const result = new Float32Array(signalSize + kernelSize - 1);
    convolution(signal, kernel, result);
    return { signal, kernel, result };
  },

  // Performance test functions with configurable sizes
  testConvolution: (signalSize = 1024, kernelSize = 64) => {
    const signal = createTestData.signal(signalSize);
    const kernel = createTestData.kernel1D(kernelSize);
    const result = new Float32Array(signalSize + kernelSize - 1);
    convolution(signal, kernel, result);
    return { signal, kernel, result };
  },

  test2DConvolutionPerf: (imageSize = 128, kernelSize = 5) => {
    const image = createTestData.image2D(imageSize);
    const kernel = createTestData.kernel2D(kernelSize);
    const result = new Float32Array(imageSize * imageSize);
    convolution_2d(image, kernel, result, imageSize, imageSize, kernelSize);
    return { image, kernel, result, imageSize, kernelSize };
  },

  // Test functions that work with external data (for shared benchmarking)
  testConvolutionWithData: (signal: Float32Array, kernel: Float32Array) => {
    const result = new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, result);
    return result;
  },

  test2DConvolutionWithData: (
    image: Float32Array,
    kernel: Float32Array,
    imageSize: number,
    kernelSize: number,
  ) => {
    const result = new Float32Array(imageSize * imageSize);
    convolution_2d(image, kernel, result, imageSize, imageSize, kernelSize);
    return result;
  },

  // Specialized test cases
  testEdgeDetection: (imageSize = 3) => {
    const image = createTestData.image2D(imageSize, 42); // Use specific seed for consistency
    // Create edge detection kernel (Laplacian)
    const kernelSize = 3;
    const kernel = new Float32Array([0, -1, 0, -1, 4, -1, 0, -1, 0]);
    const result = new Float32Array(imageSize * imageSize);
    convolution_2d(image, kernel, result, imageSize, imageSize, kernelSize);
    return { image, kernel, result, imageSize, kernelSize };
  },

  testSinglePoint: () => {
    const signal = new Float32Array([5]);
    const kernel = new Float32Array([2]);
    const result = new Float32Array(1);
    convolution(signal, kernel, result);
    return { signal, kernel, result };
  },
};

// Benchmark comparison functions with configurable sizes
export const benchmarkFunctions = {
  // Generate test data for benchmarking
  generateConvolutionData: (signalSize: number, kernelSize: number) => {
    const signal = createTestData.signal(signalSize);
    const kernel = createTestData.kernel1D(kernelSize);
    return { signal, kernel };
  },

  generate2DConvolutionData: (imageSize: number, kernelSize: number) => {
    const image = createTestData.image2D(imageSize);
    const kernel = createTestData.kernel2D(kernelSize);
    return { image, kernel, imageSize, kernelSize };
  },

  // JavaScript naive implementations for comparison
  naiveConvolution: (signal: Float32Array, kernel: Float32Array) => {
    const signalLen = signal.length;
    const kernelLen = kernel.length;
    const resultLen = signalLen + kernelLen - 1;
    const result = new Float32Array(resultLen);

    for (let n = 0; n < resultLen; n++) {
      let sum = 0;
      for (let m = 0; m < kernelLen; m++) {
        if (n >= m && n - m < signalLen) {
          sum += signal[n - m] * kernel[m];
        }
      }
      result[n] = sum;
    }
    return result;
  },

  naive2DConvolution: (
    image: Float32Array,
    kernel: Float32Array,
    imgWidth: number,
    imgHeight: number,
    kernelSize: number,
  ) => {
    const result = new Float32Array(imgWidth * imgHeight);
    const halfKernel = Math.floor(kernelSize / 2);

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        let sum = 0;

        for (let ky = 0; ky < kernelSize; ky++) {
          for (let kx = 0; kx < kernelSize; kx++) {
            const imgY = y + ky - halfKernel;
            const imgX = x + kx - halfKernel;

            // Handle boundary conditions (zero padding)
            if (imgY >= 0 && imgY < imgHeight && imgX >= 0 && imgX < imgWidth) {
              const imgIdx = imgY * imgWidth + imgX;
              const kernelIdx = ky * kernelSize + kx;
              sum += image[imgIdx] * kernel[kernelIdx];
            }
          }
        }

        result[y * imgWidth + x] = sum;
      }
    }
    return result;
  },
  // JIT-optimized JavaScript implementations with loop unrolling (factor 4)
  jitOptimizedConvolution: (signal: Float32Array, kernel: Float32Array) => {
    const signalLen = signal.length;
    const kernelLen = kernel.length;
    const resultLen = signalLen + kernelLen - 1;
    const result = new Float32Array(resultLen);

    // Unroll factor 4 for the inner kernel loop
    const unrollFactor = 4;
    const kernelLenUnrolled =
      Math.floor(kernelLen / unrollFactor) * unrollFactor;

    for (let n = 0; n < resultLen; n++) {
      let sum = 0;

      // Unrolled loop (factor 4)
      let m = 0;
      for (; m < kernelLenUnrolled; m += unrollFactor) {
        const baseIdx = n - m;

        // Manual unrolling of 4 iterations
        if (baseIdx >= 0 && baseIdx < signalLen)
          sum += signal[baseIdx] * kernel[m];
        if (baseIdx - 1 >= 0 && baseIdx - 1 < signalLen)
          sum += signal[baseIdx - 1] * kernel[m + 1];
        if (baseIdx - 2 >= 0 && baseIdx - 2 < signalLen)
          sum += signal[baseIdx - 2] * kernel[m + 2];
        if (baseIdx - 3 >= 0 && baseIdx - 3 < signalLen)
          sum += signal[baseIdx - 3] * kernel[m + 3];
      }

      // Handle remaining iterations
      for (; m < kernelLen; m++) {
        if (n >= m && n - m < signalLen) {
          sum += signal[n - m] * kernel[m];
        }
      }

      result[n] = sum;
    }
    return result;
  },

  jitOptimized2DConvolution: (
    image: Float32Array,
    kernel: Float32Array,
    imgWidth: number,
    imgHeight: number,
    kernelSize: number,
  ) => {
    const result = new Float32Array(imgWidth * imgHeight);
    const halfKernel = Math.floor(kernelSize / 2);
    const unrollFactor = 4;

    for (let y = 0; y < imgHeight; y++) {
      for (let x = 0; x < imgWidth; x++) {
        let sum = 0;

        // Unroll the kernel computation where possible
        let kidx = 0;
        const totalKernelSize = kernelSize * kernelSize;
        const unrolledSize =
          Math.floor(totalKernelSize / unrollFactor) * unrollFactor;

        // Flattened kernel loop with unrolling
        for (; kidx < unrolledSize; kidx += unrollFactor) {
          // Manual unrolling of 4 kernel elements
          for (let u = 0; u < unrollFactor; u++) {
            const kernelIdx = kidx + u;
            const ky = Math.floor(kernelIdx / kernelSize);
            const kx = kernelIdx % kernelSize;
            const imgY = y + ky - halfKernel;
            const imgX = x + kx - halfKernel;

            if (imgY >= 0 && imgY < imgHeight && imgX >= 0 && imgX < imgWidth) {
              const imgIdx = imgY * imgWidth + imgX;
              sum += image[imgIdx] * kernel[kernelIdx];
            }
          }
        }

        // Handle remaining kernel elements
        for (; kidx < totalKernelSize; kidx++) {
          const ky = Math.floor(kidx / kernelSize);
          const kx = kidx % kernelSize;
          const imgY = y + ky - halfKernel;
          const imgX = x + kx - halfKernel;

          if (imgY >= 0 && imgY < imgHeight && imgX >= 0 && imgX < imgWidth) {
            const imgIdx = imgY * imgWidth + imgX;
            sum += image[imgIdx] * kernel[kidx];
          }
        }

        result[y * imgWidth + x] = sum;
      }
    }
    return result;
  },
};
