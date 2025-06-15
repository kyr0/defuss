import { cross_correlation, auto_correlation } from "../pkg/defuss_fastmath.js";
import { convolution, convolution_2d } from "./index.js";
import { createTestData } from "./test-util.js";

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
  testConvolutionWithData: (
    signal: Float32Array,
    kernel: Float32Array,
    result?: Float32Array,
  ) => {
    // Reuse the result buffer if provided to avoid allocations
    const output =
      result || new Float32Array(signal.length + kernel.length - 1);
    convolution(signal, kernel, output);
    return output;
  },

  test2DConvolutionWithData: (
    image: Float32Array,
    kernel: Float32Array,
    imageSize: number,
    kernelSize: number,
    result?: Float32Array,
  ) => {
    // Reuse the result buffer if provided to avoid allocations
    const output = result || new Float32Array(imageSize * imageSize);
    convolution_2d(image, kernel, output, imageSize, imageSize, kernelSize);
    return output;
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
