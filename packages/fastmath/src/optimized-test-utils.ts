import { BufferUtils, convolution } from "./index.js";

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

// Pre-allocated buffers for common test sizes
const TEST_BUFFER_CACHE = new Map<string, Float32Array>();

// Cache key for buffer identification
const getCacheKey = (size: number, seed: number, type: string): string =>
  `${type}_${size}_${seed}`;

// Zero-allocation test data generation (reuses cached buffers)
export const createTestDataOptimized = {
  // 1D data generation with caching
  signal: (size: number, seed = 42): Float32Array => {
    const key = getCacheKey(size, seed, "signal");
    let buffer = TEST_BUFFER_CACHE.get(key);

    if (!buffer) {
      const rng = new SeededRandom(seed);
      buffer = new Float32Array(size);
      for (let i = 0; i < size; i++) {
        buffer[i] = rng.range(-1, 1);
      }
      TEST_BUFFER_CACHE.set(key, buffer);
    }

    return buffer;
  },

  kernel1D: (size: number, seed = 123): Float32Array => {
    const key = getCacheKey(size, seed, "kernel1d");
    let buffer = TEST_BUFFER_CACHE.get(key);

    if (!buffer) {
      const rng = new SeededRandom(seed);
      buffer = new Float32Array(size);
      let sum = 0;

      for (let i = 0; i < size; i++) {
        buffer[i] = rng.range(-0.5, 0.5);
        sum += Math.abs(buffer[i]);
      }

      // Normalize kernel
      for (let i = 0; i < size; i++) {
        buffer[i] /= sum;
      }

      TEST_BUFFER_CACHE.set(key, buffer);
    }

    return buffer;
  },

  // 2D data generation with caching
  image2D: (size: number, seed = 84): Float32Array => {
    const key = getCacheKey(size * size, seed, "image2d");
    let buffer = TEST_BUFFER_CACHE.get(key);

    if (!buffer) {
      const rng = new SeededRandom(seed);
      buffer = new Float32Array(size * size);
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = rng.range(0, 1);
      }
      TEST_BUFFER_CACHE.set(key, buffer);
    }

    return buffer;
  },

  kernel2D: (size: number, seed = 246): Float32Array => {
    const key = getCacheKey(size * size, seed, "kernel2d");
    let buffer = TEST_BUFFER_CACHE.get(key);

    if (!buffer) {
      const rng = new SeededRandom(seed);
      buffer = new Float32Array(size * size);
      let sum = 0;

      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = rng.range(-0.1, 0.1);
        sum += Math.abs(buffer[i]);
      }

      // Normalize kernel
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] /= sum;
      }

      TEST_BUFFER_CACHE.set(key, buffer);
    }

    return buffer;
  },

  // Clear test data cache
  clearCache: (): void => {
    TEST_BUFFER_CACHE.clear();
  },

  // Get cache statistics
  getCacheStats: () => ({
    entryCount: TEST_BUFFER_CACHE.size,
    totalMemory: Array.from(TEST_BUFFER_CACHE.values()).reduce(
      (sum, buffer) => sum + buffer.byteLength,
      0,
    ),
    entries: Array.from(TEST_BUFFER_CACHE.keys()),
  }),
};

// Benchmark utilities with minimal allocations
export const BenchmarkUtils = {
  // Pre-allocate benchmark buffers for known test sizes
  preAllocateBenchmarkBuffers: (
    sizes1D: number[] = [16, 32, 64, 128, 256, 512],
    sizes2D: number[] = [8, 16, 32, 64, 128],
  ): void => {
    console.log("Pre-allocating benchmark buffers...");

    // Pre-warm buffer pools
    const resultSizes: number[] = [];

    // Calculate 1D result sizes
    for (const size of sizes1D) {
      const kernelSize = Math.max(3, Math.floor(size / 16));
      resultSizes.push(size + kernelSize - 1);
    }

    // Calculate 2D result sizes
    for (const size of sizes2D) {
      resultSizes.push(size * size);
    }

    // Pre-warm with 5 buffers per size
    for (const size of [...new Set(resultSizes)]) {
      for (let i = 0; i < 5; i++) {
        const buffer = new Float32Array(size);
        BufferUtils.releaseBuffer(buffer);
      }
    }

    console.log(
      `Pre-allocated buffers for sizes: ${[...new Set(resultSizes)].join(", ")}`,
    );
  },

  // Run benchmark with memory tracking
  withMemoryTracking: <T>(name: string, fn: () => T): T => {
    const before = BufferUtils.getStats();
    BufferUtils.resetStack();

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    const after = BufferUtils.getStats();

    console.log(`${name}:`, {
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      stackUsage: after.stack.usage,
      poolGrowth: after.pools.sizes.length - before.pools.sizes.length,
    });

    return result;
  },

  // Memory pressure test - actually performs convolutions to test memory allocation
  memoryPressureTest: (iterations = 1000): void => {
    console.log(`Running memory pressure test (${iterations} iterations)...`);

    const startStats = BufferUtils.getStats();
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const signal = createTestDataOptimized.signal(128);
      const kernel = createTestDataOptimized.kernel1D(8);

      // Actually perform convolution to test our optimized allocation
      const result = convolution(signal, kernel);

      // Use the result to prevent dead code elimination
      if (result.length === 0) {
        throw new Error("Invalid result");
      }

      // Release buffer to test pool management
      BufferUtils.releaseBuffer(result);

      if (i % 100 === 0) {
        BufferUtils.resetStack();
      }
    }

    const endTime = performance.now();
    const endStats = BufferUtils.getStats();

    console.log("Memory pressure test results:", {
      duration: `${(endTime - startTime).toFixed(2)}ms`,
      avgPerIteration: `${((endTime - startTime) / iterations).toFixed(4)}ms`,
      stackUsage: endStats.stack.usage,
      poolGrowth: endStats.pools.sizes.length - startStats.pools.sizes.length,
    });
  },
};
