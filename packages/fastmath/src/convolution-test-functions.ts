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
    const signal = new Float32Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1));
    const kernel = new Float32Array(64).fill(0).map((_, i) => Math.exp(-i * 0.1));
    return { signal, kernel };
  },

  createLarge2DConvolutionData: () => {
    const size = 128;
    const image = new Float32Array(size * size).fill(0).map(() => Math.random());
    const kernelSize = 5;
    const kernel = new Float32Array(kernelSize * kernelSize).fill(1 / (kernelSize * kernelSize));
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
    const signal = new Float32Array(1024).fill(0).map((_, i) => Math.sin(i * 0.1));
    const kernel = new Float32Array(64).fill(0).map((_, i) => Math.exp(-i * 0.1));
    const result = new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, result);
    return result;
  },

  testLarge2DConvolution: () => {
    const size = 128;
    const image = new Float32Array(size * size).fill(0).map(() => Math.random());
    const kernelSize = 5;
    const kernel = new Float32Array(kernelSize * kernelSize).fill(1 / (kernelSize * kernelSize));
    const result = new Float32Array(size * size);
    convolution_2d(image, kernel, result, size, size, kernelSize);
    return result;
  },

  // Performance test functions with larger data sets using shared data
  testLargeConvolutionWithData: (signal: Float32Array, kernel: Float32Array) => {
    const result = new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, result);
    return result;
  },

  testLarge2DConvolutionWithData: (image: Float32Array, kernel: Float32Array, size: number, kernelSize: number) => {
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
        if (n >= m && (n - m) < signalLen) {
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
    kernelSize: number
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
  }
};
