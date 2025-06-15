/**
 * @fileoverview Comprehensive test utilities for convolution testing and benchmarking
 *
 * This module provides:
 * - Reproducible test data generation with seeded randomness
 * - Memory-optimized data generation with caching
 * - Benchmarking utilities with memory tracking
 * - Memory pressure testing utilities
 */

import { BufferUtils, convolution } from "./index.js";

// ============================================================================
// RANDOM NUMBER GENERATION
// ============================================================================

/**
 * Pseudo-random number generator for reproducible test results.
 * Uses a simple linear congruential generator for consistent cross-platform results.
 */
export class SeededRandom {
  private seed: number;

  /**
   * Create a new seeded random number generator.
   * @param seed Initial seed value (default: 42)
   */
  constructor(seed = 42) {
    this.seed = seed;
  }

  /**
   * Generate next random number in range [0, 1).
   * @returns Random number between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  /**
   * Generate random number in specified range.
   * @param min Minimum value (inclusive)
   * @param max Maximum value (exclusive)
   * @returns Random number in [min, max)
   */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

// ============================================================================
// BASIC DATA GENERATION
// ============================================================================

/**
 * Basic test data generation utilities.
 * Creates new arrays on each call - suitable for simple tests where memory optimization isn't critical.
 */
export const TestData = {
  /**
   * Generate a complete 1D convolution test case.
   * @param signalSize Size of the input signal
   * @param kernelSize Size of the convolution kernel
   * @returns Object containing signal and kernel arrays
   */
  convolution1D: (signalSize: number, kernelSize: number) => ({
    signal: TestData.signal(signalSize),
    kernel: TestData.kernel1D(kernelSize),
  }),

  /**
   * Generate a complete 2D convolution test case.
   * @param imageSize Width/height of the square input image
   * @param kernelSize Width/height of the square convolution kernel
   * @returns Object containing image, kernel, and size information
   */
  convolution2D: (imageSize: number, kernelSize: number) => ({
    image: TestData.image2D(imageSize),
    kernel: TestData.kernel2D(kernelSize),
    imageSize,
    kernelSize,
  }),

  /**
   * Generate a 1D signal with random values.
   * @param size Length of the signal
   * @param seed Random seed for reproducible results (default: 42)
   * @returns Float32Array containing signal data in range [-1, 1]
   */
  signal: (size: number, seed = 42): Float32Array => {
    const rng = new SeededRandom(seed);
    const result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      result[i] = rng.range(-1, 1);
    }
    return result;
  },

  /**
   * Generate a normalized 1D convolution kernel.
   * @param size Length of the kernel
   * @param seed Random seed for reproducible results (default: 123)
   * @returns Float32Array containing normalized kernel data
   */
  kernel1D: (size: number, seed = 123): Float32Array => {
    const rng = new SeededRandom(seed);
    const kernel = new Float32Array(size);
    let sum = 0;

    // Generate random values
    for (let i = 0; i < size; i++) {
      kernel[i] = rng.range(-0.5, 0.5);
      sum += Math.abs(kernel[i]);
    }

    // Normalize so sum of absolute values equals 1
    for (let i = 0; i < size; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  },

  /**
   * Generate a 2D image with random values.
   * @param size Width/height of the square image
   * @param seed Random seed for reproducible results (default: 84)
   * @returns Float32Array containing image data in range [0, 1]
   */
  image2D: (size: number, seed = 84): Float32Array => {
    const rng = new SeededRandom(seed);
    const result = new Float32Array(size * size);
    for (let i = 0; i < result.length; i++) {
      result[i] = rng.range(0, 1);
    }
    return result;
  },

  /**
   * Generate a normalized 2D convolution kernel.
   * @param size Width/height of the square kernel
   * @param seed Random seed for reproducible results (default: 246)
   * @returns Float32Array containing normalized kernel data
   */
  kernel2D: (size: number, seed = 246): Float32Array => {
    const rng = new SeededRandom(seed);
    const kernel = new Float32Array(size * size);
    let sum = 0;

    // Generate random values
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] = rng.range(-0.1, 0.1);
      sum += Math.abs(kernel[i]);
    }

    // Normalize so sum of absolute values equals 1
    for (let i = 0; i < kernel.length; i++) {
      kernel[i] /= sum;
    }

    return kernel;
  },

  /**
   * Generate 3D data for potential future use.
   * @param size Width/height/depth of the cube
   * @param seed Random seed for reproducible results (default: 168)
   * @returns Float32Array containing 3D data in range [-1, 1]
   */
  data3D: (size: number, seed = 168): Float32Array => {
    const rng = new SeededRandom(seed);
    const result = new Float32Array(size * size * size);
    for (let i = 0; i < result.length; i++) {
      result[i] = rng.range(-1, 1);
    }
    return result;
  },
};

// ============================================================================
// MEMORY-OPTIMIZED DATA GENERATION
// ============================================================================

/**
 * Cache for pre-generated test data to avoid repeated allocations.
 * Maps cache keys to Float32Array buffers.
 */
const DATA_CACHE = new Map<string, Float32Array>();

/**
 * Generate a unique cache key for test data.
 * @param size Size of the data
 * @param seed Random seed used
 * @param type Type of data (e.g., 'signal', 'kernel1d')
 * @returns Unique cache key string
 */
const getCacheKey = (size: number, seed: number, type: string): string =>
  `${type}_${size}_${seed}`;

/**
 * Memory-optimized test data generation with caching.
 * Reuses previously generated arrays to minimize allocations during benchmarking.
 */
export const OptimizedTestData = {
  /**
   * Generate or retrieve cached 1D signal data.
   * @param size Length of the signal
   * @param seed Random seed for reproducible results (default: 42)
   * @returns Cached Float32Array containing signal data
   */
  signal: (size: number, seed = 42): Float32Array => {
    const key = getCacheKey(size, seed, "signal");
    let buffer = DATA_CACHE.get(key);

    if (!buffer) {
      buffer = TestData.signal(size, seed);
      DATA_CACHE.set(key, buffer);
    }

    return buffer;
  },

  /**
   * Generate or retrieve cached 1D kernel data.
   * @param size Length of the kernel
   * @param seed Random seed for reproducible results (default: 123)
   * @returns Cached Float32Array containing normalized kernel data
   */
  kernel1D: (size: number, seed = 123): Float32Array => {
    const key = getCacheKey(size, seed, "kernel1d");
    let buffer = DATA_CACHE.get(key);

    if (!buffer) {
      buffer = TestData.kernel1D(size, seed);
      DATA_CACHE.set(key, buffer);
    }

    return buffer;
  },

  /**
   * Generate or retrieve cached 2D image data.
   * @param size Width/height of the square image
   * @param seed Random seed for reproducible results (default: 84)
   * @returns Cached Float32Array containing image data
   */
  image2D: (size: number, seed = 84): Float32Array => {
    const key = getCacheKey(size * size, seed, "image2d");
    let buffer = DATA_CACHE.get(key);

    if (!buffer) {
      buffer = TestData.image2D(size, seed);
      DATA_CACHE.set(key, buffer);
    }

    return buffer;
  },

  /**
   * Generate or retrieve cached 2D kernel data.
   * @param size Width/height of the square kernel
   * @param seed Random seed for reproducible results (default: 246)
   * @returns Cached Float32Array containing normalized kernel data
   */
  kernel2D: (size: number, seed = 246): Float32Array => {
    const key = getCacheKey(size * size, seed, "kernel2d");
    let buffer = DATA_CACHE.get(key);

    if (!buffer) {
      buffer = TestData.kernel2D(size, seed);
      DATA_CACHE.set(key, buffer);
    }

    return buffer;
  },

  /**
   * Clear all cached test data.
   */
  clearCache: (): void => {
    DATA_CACHE.clear();
  },

  /**
   * Get statistics about the current cache state.
   * @returns Object containing cache metrics
   */
  getCacheStats: () => ({
    entryCount: DATA_CACHE.size,
    totalMemory: Array.from(DATA_CACHE.values()).reduce(
      (sum, buffer) => sum + buffer.byteLength,
      0,
    ),
    entries: Array.from(DATA_CACHE.keys()),
  }),
};

// ============================================================================
// BUFFER POOL MANAGEMENT
// ============================================================================

/**
 * Buffer pool management utilities for benchmarking.
 */
export const BufferPoolUtils = {
  /**
   * Pre-allocate buffers for common benchmark sizes.
   * This reduces allocation overhead during benchmarking.
   *
   * @param sizes1D Array of 1D signal sizes to pre-allocate for
   * @param sizes2D Array of 2D image sizes to pre-allocate for
   */
  preAllocate: (
    sizes1D: number[] = [16, 32, 64, 128, 256, 512],
    sizes2D: number[] = [8, 16, 32, 64, 128],
  ): void => {
    console.log("Pre-allocating benchmark buffers...");

    const resultSizes: number[] = [];

    // Calculate 1D convolution result sizes
    for (const size of sizes1D) {
      const kernelSize = Math.max(3, Math.floor(size / 16));
      resultSizes.push(size + kernelSize - 1);
    }

    // Calculate 2D convolution result sizes
    for (const size of sizes2D) {
      resultSizes.push(size * size);
    }

    // Pre-warm buffer pools with multiple buffers per size
    const uniqueSizes = [...new Set(resultSizes)];
    for (const size of uniqueSizes) {
      for (let i = 0; i < 5; i++) {
        const buffer = new Float32Array(size);
        BufferUtils.releaseBuffer(buffer);
      }
    }

    console.log(`Pre-allocated buffers for sizes: ${uniqueSizes.join(", ")}`);
  },

  /**
   * Reset buffer pools to clean state.
   */
  reset: (): void => {
    BufferUtils.resetStack();
  },

  /**
   * Get current buffer pool statistics.
   * @returns Buffer pool statistics
   */
  getStats: () => BufferUtils.getStats(),
};

// ============================================================================
// BENCHMARKING UTILITIES
// ============================================================================

/**
 * Benchmarking utilities with memory tracking.
 */
export const BenchmarkUtils = {
  /**
   * Run a function with memory tracking and timing.
   * Provides detailed statistics about memory usage and execution time.
   *
   * @param name Descriptive name for the benchmark
   * @param fn Function to benchmark
   * @returns Result of the function execution
   */
  withMemoryTracking: <T>(name: string, fn: () => T): T => {
    const beforeStats = BufferUtils.getStats();
    BufferUtils.resetStack();

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    const afterStats = BufferUtils.getStats();

    console.log(`${name}:`, {
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      stackUsage: afterStats.stack.usage,
      poolGrowth:
        afterStats.pools.sizes.length - beforeStats.pools.sizes.length,
    });

    return result;
  },

  /**
   * Run a memory pressure test to validate allocation efficiency.
   * Performs many convolution operations to test memory management.
   *
   * @param iterations Number of convolution operations to perform
   * @param signalSize Size of signal for each operation (default: 128)
   * @param kernelSize Size of kernel for each operation (default: 8)
   */
  memoryPressureTest: (
    iterations = 1000,
    signalSize = 128,
    kernelSize = 8,
  ): void => {
    console.log(`Running memory pressure test (${iterations} iterations)...`);

    const startStats = BufferUtils.getStats();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const signal = OptimizedTestData.signal(signalSize);
      const kernel = OptimizedTestData.kernel1D(kernelSize);

      // Perform actual convolution to test memory allocation
      const result = convolution(signal, kernel);

      // Validate result to prevent dead code elimination
      if (result.length === 0) {
        throw new Error("Invalid convolution result");
      }

      // Release buffer to test pool management
      BufferUtils.releaseBuffer(result);

      // Periodically reset stack to test allocation patterns
      if (i % 100 === 0) {
        BufferUtils.resetStack();
      }
    }

    const endTime = performance.now();
    const endStats = BufferUtils.getStats();

    console.log("Memory pressure test completed:", {
      totalDuration: `${(endTime - startTime).toFixed(2)}ms`,
      avgPerOperation: `${((endTime - startTime) / iterations).toFixed(4)}ms`,
      finalStackUsage: endStats.stack.usage,
      poolGrowth: endStats.pools.sizes.length - startStats.pools.sizes.length,
      operationsPerSecond: Math.round(
        iterations / ((endTime - startTime) / 1000),
      ),
    });
  },

  /**
   * Warm up the system before running benchmarks.
   * Performs a few operations to stabilize JIT compilation and buffer pools.
   *
   * @param warmupIterations Number of warmup operations (default: 10)
   */
  warmup: (warmupIterations = 10): void => {
    console.log(`Warming up system (${warmupIterations} iterations)...`);

    for (let i = 0; i < warmupIterations; i++) {
      const signal = OptimizedTestData.signal(64);
      const kernel = OptimizedTestData.kernel1D(8);
      const result = convolution(signal, kernel);
      BufferUtils.releaseBuffer(result);
    }

    BufferUtils.resetStack();
    console.log("Warmup completed");
  },

  /**
   * Run a timed benchmark without memory tracking.
   *
   * @param name Descriptive name for the benchmark
   * @param fn Function to benchmark
   * @returns Object containing result and timing information
   */
  time: <T>(name: string, fn: () => T): { result: T; duration: number } => {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`${name}: ${duration.toFixed(2)}ms`);

    return { result, duration };
  },
};
