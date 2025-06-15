/**
 * @fileoverview High-performance convolution implementation using WebNN API
 * 
 * This module provides WebNN-accelerated convolution operations for both 1D and 2D data.
 * Features include:
 * - Automatic hardware acceleration (GPU/NPU) 
 * - Graph compilation and reuse for optimal performance
 * - Memory-efficient tensor management
 * - Support for different padding modes and strides
 */

/// <reference path="./webnn-types.d.ts" />

// WebNN context and graph cache for performance
let webnnContext: MLContext | null = null;
const graphCache = new Map<string, MLGraph>();
let isWebNNSupported: boolean | null = null;

/**
 * Check if WebNN is supported in the current environment.
 * @returns Promise<boolean> True if WebNN is available and functional
 */
export async function isWebNNAvailable(): Promise<boolean> {
  if (isWebNNSupported !== null) {
    return isWebNNSupported;
  }

  try {
    if (!('ml' in navigator)) {
      isWebNNSupported = false;
      return false;
    }

    // Try to create a context to verify WebNN is actually functional
    const context = await (navigator as any).ml.createContext();
    if (!context) {
      isWebNNSupported = false;
      return false;
    }

    webnnContext = context;
    isWebNNSupported = true;
    return true;
  } catch (error) {
    console.warn('WebNN not available:', error);
    isWebNNSupported = false;
    return false;
  }
}

/**
 * Get or create WebNN context with optimal device selection.
 * @returns Promise<MLContext> WebNN context
 */
async function getWebNNContext(): Promise<MLContext> {
  if (webnnContext) {
    return webnnContext;
  }

  if (!(await isWebNNAvailable())) {
    throw new Error('WebNN is not supported in this environment');
  }

  return webnnContext!;
}

/**
 * Generate cache key for compiled graphs.
 * @param operation Operation type (conv1d, conv2d)
 * @param inputShape Input tensor shape
 * @param kernelShape Kernel tensor shape
 * @param options Additional options like padding, stride
 * @returns Unique cache key string
 */
function getCacheKey(
  operation: string,
  inputShape: number[],
  kernelShape: number[],
  options: any = {}
): string {
  return `${operation}_${inputShape.join('x')}_${kernelShape.join('x')}_${JSON.stringify(options)}`;
}

/**
 * High-performance 1D convolution using WebNN.
 * Automatically handles graph compilation, caching, and execution.
 * 
 * @param signal Input signal data
 * @param kernel Convolution kernel
 * @param result Output buffer (will be resized if needed)
 * @param stride Convolution stride (default: 1)
 * @param padding Padding mode: 'valid' or 'same' (default: 'valid')
 * @returns Promise<Float32Array> Convolution result
 */
export async function convolution1D_webnn(
  signal: Float32Array,
  kernel: Float32Array,
  result?: Float32Array,
  stride = 1,
  padding: 'valid' | 'same' = 'valid'
): Promise<Float32Array> {
  const context = await getWebNNContext();
  
  // Calculate output dimensions
  const signalLength = signal.length;
  const kernelLength = kernel.length;
  
  let outputLength: number;
  let padLeft = 0;
  let padRight = 0;
  
  if (padding === 'same') {
    outputLength = Math.ceil(signalLength / stride);
    const totalPad = Math.max(0, (outputLength - 1) * stride + kernelLength - signalLength);
    padLeft = Math.floor(totalPad / 2);
    padRight = totalPad - padLeft;
  } else {
    outputLength = Math.floor((signalLength - kernelLength) / stride) + 1;
  }

  // Prepare result buffer
  if (!result || result.length !== outputLength) {
    result = new Float32Array(outputLength);
  }

  // WebNN expects NCHW format for conv1d: [batch, channels, width]
  const inputShape = [1, 1, signalLength];  // batch=1, channels=1, width=signalLength
  const kernelShape = [1, 1, kernelLength]; // out_channels=1, in_channels=1, kernel_width
  
  const cacheKey = getCacheKey('conv1d', inputShape, kernelShape, { stride, padLeft, padRight });
  
  let graph = graphCache.get(cacheKey);
  
  if (!graph) {
    // Build new graph
    const builder = new (globalThis as any).MLGraphBuilder(context);
    
    // Input tensor
    const inputDesc = { type: 'float32', dimensions: inputShape };
    const input = builder.input('input', inputDesc);
    
    // Kernel tensor (as constant)
    const kernelDesc = { type: 'float32', dimensions: kernelShape };
    const kernelData = new Float32Array(kernelLength);
    kernelData.set(kernel);
    const kernelTensor = builder.constant(kernelDesc, kernelData);
    
    // Conv1D operation
    const convOptions: any = {
      padding: [padLeft, padRight],
      strides: [stride],
      inputLayout: 'nchw',
      filterLayout: 'oihw'
    };
    
    const output = builder.conv2d(input, kernelTensor, convOptions);
    
    // Build and cache the graph
    const builtGraph = await builder.build({ output });
    if (!builtGraph) {
      throw new Error('Failed to build WebNN graph for 1D convolution');
    }
    graph = builtGraph;
    graphCache.set(cacheKey, builtGraph);
  }

  if (!graph) {
    throw new Error('Failed to get or build WebNN graph');
  }

  // Prepare input data in NCHW format
  const inputData = new Float32Array(signalLength);
  inputData.set(signal);
  
  // Execute the graph
  const outputData = new Float32Array(outputLength);
  await graph.compute(
    { input: inputData },
    { output: outputData }
  );
  
  // Copy result
  result.set(outputData);
  return result;
}

/**
 * High-performance 2D convolution using WebNN.
 * Optimized for image processing and feature detection.
 * 
 * @param image Input image data (row-major order)
 * @param kernel Convolution kernel (row-major order)
 * @param result Output buffer
 * @param imgWidth Image width
 * @param imgHeight Image height  
 * @param kernelSize Kernel size (assumed square)
 * @param stride Convolution stride (default: 1)
 * @param padding Padding mode: 'valid' or 'same' (default: 'valid')
 * @returns Promise<Float32Array> Convolution result
 */
export async function convolution2D_webnn(
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
  stride = 1,
  padding: 'valid' | 'same' = 'valid'
): Promise<Float32Array> {
  const context = await getWebNNContext();
  
  // Calculate output dimensions
  let outputWidth: number;
  let outputHeight: number;
  let padTop = 0;
  let padBottom = 0;
  let padLeft = 0;
  let padRight = 0;
  
  if (padding === 'same') {
    outputWidth = Math.ceil(imgWidth / stride);
    outputHeight = Math.ceil(imgHeight / stride);
    
    const totalPadWidth = Math.max(0, (outputWidth - 1) * stride + kernelSize - imgWidth);
    const totalPadHeight = Math.max(0, (outputHeight - 1) * stride + kernelSize - imgHeight);
    
    padLeft = Math.floor(totalPadWidth / 2);
    padRight = totalPadWidth - padLeft;
    padTop = Math.floor(totalPadHeight / 2);
    padBottom = totalPadHeight - padTop;
  } else {
    outputWidth = Math.floor((imgWidth - kernelSize) / stride) + 1;
    outputHeight = Math.floor((imgHeight - kernelSize) / stride) + 1;
  }

  // WebNN expects NCHW format: [batch, channels, height, width]
  const inputShape = [1, 1, imgHeight, imgWidth];
  const kernelShape = [1, 1, kernelSize, kernelSize];
  
  const cacheKey = getCacheKey('conv2d', inputShape, kernelShape, {
    stride, padTop, padBottom, padLeft, padRight
  });
  
  let graph = graphCache.get(cacheKey);
  
  if (!graph) {
    // Build new graph
    const builder = new (globalThis as any).MLGraphBuilder(context);
    
    // Input tensor
    const inputDesc = { type: 'float32', dimensions: inputShape };
    const input = builder.input('input', inputDesc);
    
    // Kernel tensor (as constant)
    const kernelDesc = { type: 'float32', dimensions: kernelShape };
    const kernelData = new Float32Array(kernelSize * kernelSize);
    kernelData.set(kernel);
    const kernelTensor = builder.constant(kernelDesc, kernelData);
    
    // Conv2D operation
    const convOptions: any = {
      padding: [padTop, padBottom, padLeft, padRight],
      strides: [stride, stride],
      inputLayout: 'nchw',
      filterLayout: 'oihw'
    };
    
    const output = builder.conv2d(input, kernelTensor, convOptions);
    
    // Build and cache the graph
    const builtGraph = await builder.build({ output });
    if (!builtGraph) {
      throw new Error('Failed to build WebNN graph for 2D convolution');
    }
    graph = builtGraph;
    graphCache.set(cacheKey, builtGraph);
  }

  if (!graph) {
    throw new Error('Failed to get or build WebNN graph');
  }

  // Prepare input data in NCHW format
  const inputData = new Float32Array(imgWidth * imgHeight);
  inputData.set(image);
  
  // Execute the graph
  const outputData = new Float32Array(outputWidth * outputHeight);
  await graph.compute(
    { input: inputData },
    { output: outputData }
  );
  
  // Copy result
  if (result.length < outputData.length) {
    throw new Error(`Result buffer too small: expected ${outputData.length}, got ${result.length}`);
  }
  result.set(outputData);
  return result;
}

/**
 * Convenience wrapper for 2D convolution (legacy compatibility).
 */
export const convolution_2d = convolution2D_webnn;

/**
 * Batch 1D convolution for multiple signals with the same kernel.
 * Highly optimized for processing multiple signals efficiently.
 * 
 * @param signals Array of input signals
 * @param kernel Shared convolution kernel
 * @param stride Convolution stride
 * @param padding Padding mode
 * @returns Promise<Float32Array[]> Array of convolution results
 */
export async function batchConvolution1D_webnn(
  signals: Float32Array[],
  kernel: Float32Array,
  stride = 1,
  padding: 'valid' | 'same' = 'valid'
): Promise<Float32Array[]> {
  if (signals.length === 0) return [];

  const context = await getWebNNContext();
  const batchSize = signals.length;
  const signalLength = signals[0].length;
  const kernelLength = kernel.length;
  
  // Validate all signals have the same length
  if (!signals.every(signal => signal.length === signalLength)) {
    throw new Error('All signals must have the same length for batch processing');
  }

  // Calculate output dimensions
  let outputLength: number;
  let padLeft = 0;
  let padRight = 0;
  
  if (padding === 'same') {
    outputLength = Math.ceil(signalLength / stride);
    const totalPad = Math.max(0, (outputLength - 1) * stride + kernelLength - signalLength);
    padLeft = Math.floor(totalPad / 2);
    padRight = totalPad - padLeft;
  } else {
    outputLength = Math.floor((signalLength - kernelLength) / stride) + 1;
  }

  // WebNN format: [batch, channels, width]
  const inputShape = [batchSize, 1, signalLength];
  const kernelShape = [1, 1, kernelLength];
  
  const cacheKey = getCacheKey('batch_conv1d', inputShape, kernelShape, { stride, padLeft, padRight });
  
  let graph = graphCache.get(cacheKey);
  
  if (!graph) {
    // Build new graph for batch processing
    const builder = new (globalThis as any).MLGraphBuilder(context);
    
    // Input tensor
    const inputDesc = { type: 'float32', dimensions: inputShape };
    const input = builder.input('input', inputDesc);
    
    // Kernel tensor
    const kernelDesc = { type: 'float32', dimensions: kernelShape };
    const kernelData = new Float32Array(kernelLength);
    kernelData.set(kernel);
    const kernelTensor = builder.constant(kernelDesc, kernelData);
    
    // Conv1D operation
    const convOptions: any = {
      padding: [padLeft, padRight],
      strides: [stride],
      inputLayout: 'nchw',
      filterLayout: 'oihw'
    };
    
    const output = builder.conv2d(input, kernelTensor, convOptions);
    
    // Build and cache the graph
    const builtGraph = await builder.build({ output });
    if (!builtGraph) {
      throw new Error('Failed to build WebNN graph for batch convolution');
    }
    graph = builtGraph;
    graphCache.set(cacheKey, builtGraph);
  }

  if (!graph) {
    throw new Error('Failed to get or build WebNN graph');
  }

  // Prepare batched input data
  const inputData = new Float32Array(batchSize * signalLength);
  for (let i = 0; i < batchSize; i++) {
    const offset = i * signalLength;
    inputData.set(signals[i], offset);
  }
  
  // Execute the graph
  const outputData = new Float32Array(batchSize * outputLength);
  await graph.compute(
    { input: inputData },
    { output: outputData }
  );
  
  // Split batched output into individual results
  const results: Float32Array[] = [];
  for (let i = 0; i < batchSize; i++) {
    const result = new Float32Array(outputLength);
    const offset = i * outputLength;
    result.set(outputData.subarray(offset, offset + outputLength));
    results.push(result);
  }
  
  return results;
}

/**
 * Clear WebNN graph cache to free memory.
 * Call this periodically or when memory usage becomes a concern.
 */
export function clearWebNNCache(): void {
  graphCache.clear();
}

/**
 * Get WebNN performance statistics.
 * @returns Object containing cache statistics and availability info
 */
export function getWebNNStats() {
  return {
    isSupported: isWebNNSupported,
    hasContext: webnnContext !== null,
    cachedGraphs: graphCache.size,
    cacheKeys: Array.from(graphCache.keys()),
  };
}
