import {
  convolution,
  cross_correlation,
  convolution_2d,
  auto_correlation,
} from "../pkg/defuss_fastmath.js";

// Reusable test functions for convolution operations
export const convolutionTestFunctions = {
  // Data generation functions for consistent comparisons
  createLargeConvolutionData: () => {
    const signal = new Float32Array(1024)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1));
    const kernel = new Float32Array(64)
      .fill(0)
      .map((_, i) => Math.exp(-i * 0.1));
    return { signal, kernel };
  },

  createLarge2DConvolutionData: () => {
    const size = 128;
    const image = new Float32Array(size * size)
      .fill(0)
      .map(() => Math.random());
    const kernelSize = 5;
    const kernel = new Float32Array(kernelSize * kernelSize).fill(
      1 / (kernelSize * kernelSize),
    );
    return { image, kernel, size, kernelSize };
  },

  test1DConvolution: () => {
    const signal = new Float32Array([1, 2, 3, 4]);
    const kernel = new Float32Array([0.5, 1, 0.5]);
    const result = new Float32Array(6); // signal_len + kernel_len - 1 = 4 + 3 - 1 = 6
    convolution(signal, kernel, result);
    return result;
  },

  testCrossCorrelation: () => {
    const signal = new Float32Array([1, 2, 3, 4, 5]);
    const template = new Float32Array([1, 0, -1]);
    const result = new Float32Array(3); // signal_len - template_len + 1 = 5 - 3 + 1 = 3
    cross_correlation(signal, template, result);
    return result;
  },

  test2DConvolution: () => {
    const image = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const kernel = new Float32Array([0, 0, 0, 0, 1, 0, 0, 0, 0]);
    const result = new Float32Array(9);
    convolution_2d(image, kernel, result, 3, 3, 3);
    return result;
  },

  test2DEdgeDetection: () => {
    const image = new Float32Array([1, 1, 1, 1, 2, 1, 1, 1, 1]);
    const kernel = new Float32Array([0, -1, 0, -1, 4, -1, 0, -1, 0]);
    const result = new Float32Array(9);
    convolution_2d(image, kernel, result, 3, 3, 3);
    return result;
  },

  testAutoCorrelation: () => {
    const signal = new Float32Array([1, 2, 1, 0, 0]);
    const result = new Float32Array(5); // 2 * max_lag + 1 = 2 * 2 + 1 = 5
    const maxLag = 2;
    auto_correlation(signal, result, maxLag);
    return result;
  },

  testImpulseResponse: () => {
    const signal = new Float32Array([1, 0, 0, 0]);
    const kernel = new Float32Array([1, 2, 3]);
    const result = new Float32Array(6);
    convolution(signal, kernel, result);
    return result;
  },

  testSinglePointConvolution: () => {
    const signal = new Float32Array([5]);
    const kernel = new Float32Array([2]);
    const result = new Float32Array(1);
    convolution(signal, kernel, result);
    return result;
  },

  // Performance test functions with larger data sets
  testLargeConvolution: () => {
    const signal = new Float32Array(1024)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1));
    const kernel = new Float32Array(64)
      .fill(0)
      .map((_, i) => Math.exp(-i * 0.1));
    const result = new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, result);
    return result;
  },

  testLarge2DConvolution: () => {
    const size = 128;
    const image = new Float32Array(size * size)
      .fill(0)
      .map(() => Math.random());
    const kernelSize = 5;
    const kernel = new Float32Array(kernelSize * kernelSize).fill(
      1 / (kernelSize * kernelSize),
    );
    const result = new Float32Array(size * size);
    convolution_2d(image, kernel, result, size, size, kernelSize);
    return result;
  },

  // Performance test functions with larger data sets using shared data
  testLargeConvolutionWithData: (
    signal: Float32Array,
    kernel: Float32Array,
  ) => {
    const result = new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, result);
    return result;
  },

  testLarge2DConvolutionWithData: (
    image: Float32Array,
    kernel: Float32Array,
    size: number,
    kernelSize: number,
  ) => {
    const result = new Float32Array(size * size);
    convolution_2d(image, kernel, result, size, size, kernelSize);
    return result;
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
  }, // JIT-optimized JavaScript implementations with loop unrolling (factor 4)
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
