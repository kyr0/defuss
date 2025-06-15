import {
  convolution_2d as convolution_2d_wasm,
  convolution as convolution_wasm,
} from "../pkg/defuss_fastmath.js";
import { convolution as convolution_js } from "./convolution.js";
import {
  convolution1D_webnn,
  convolution2D_webnn,
  isWebNNAvailable,
  getWebNNStats,
} from "./convolution_webnn.js";

// Enhanced buffer pool with aggressive reuse and memory pressure awareness
class BufferPool {
  private pools = new Map<number, Float32Array[]>();
  private readonly maxPoolSize = 15; // Increased pool size
  private totalPooledBuffers = 0;
  private readonly maxTotalBuffers = 100; // Prevent memory bloat
  private hits = 0;
  private misses = 0;

  getBuffer(size: number): Float32Array {
    // First try exact size match
    const pool = this.pools.get(size);
    if (pool && pool.length > 0) {
      this.hits++;
      return pool.pop()!;
    }

    // Try to find a larger buffer we can slice
    for (const [poolSize, poolArray] of this.pools.entries()) {
      if (poolSize >= size && poolSize <= size * 1.5 && poolArray.length > 0) {
        this.hits++;
        const buffer = poolArray.pop()!;
        this.totalPooledBuffers--;

        // If it's significantly larger, create a new appropriately sized buffer
        if (poolSize > size * 1.2) {
          this.releaseBuffer(buffer); // Put it back
          break; // Fall through to create new buffer
        }

        return buffer.subarray(0, size) as Float32Array;
      }
    }

    this.misses++;
    return new Float32Array(size);
  }

  releaseBuffer(buffer: Float32Array): void {
    if (this.totalPooledBuffers >= this.maxTotalBuffers) {
      return; // Memory pressure - don't pool more
    }

    const size = buffer.length;
    let pool = this.pools.get(size);
    if (!pool) {
      pool = [];
      this.pools.set(size, pool);
    }

    if (pool.length < this.maxPoolSize) {
      // Clear the buffer before reusing
      buffer.fill(0);
      pool.push(buffer);
      this.totalPooledBuffers++;
    }
  }

  // Warm up pools with common sizes for better cache hit rate
  preWarm(sizes: number[], count = 3): void {
    for (const size of sizes) {
      for (let i = 0; i < count; i++) {
        const buffer = new Float32Array(size);
        this.releaseBuffer(buffer);
      }
    }
  }

  getStats() {
    const hitRate =
      this.hits + this.misses > 0
        ? (this.hits / (this.hits + this.misses)) * 100
        : 0;
    return {
      totalPooled: this.totalPooledBuffers,
      hitRate: hitRate.toFixed(1),
      pools: this.pools.size,
    };
  }

  clear(): void {
    this.pools.clear();
    this.totalPooledBuffers = 0;
    this.hits = 0;
    this.misses = 0;
  }
}

// Global buffer pool instance with intelligent pre-warming
const bufferPool = new BufferPool();

// Pre-warm common sizes on first use
let isPoolWarmed = false;
const warmPool = () => {
  if (!isPoolWarmed) {
    // Common convolution result sizes
    const commonSizes = [16, 32, 64, 128, 256, 512, 1024, 2048];
    bufferPool.preWarm(commonSizes, 2);
    isPoolWarmed = true;
  }
};

// Automatic buffer lifecycle management
const BufferLifecycle = (() => {
  const activeBuffers = new WeakSet<Float32Array>();
  let allocationCount = 0;
  const cleanupThreshold = 100;

  return {
    trackBuffer(buffer: Float32Array): void {
      activeBuffers.add(buffer);
      allocationCount++;

      // Periodic cleanup
      if (allocationCount % cleanupThreshold === 0) {
        this.performMaintenance();
      }
    },

    performMaintenance(): void {
      // Reset stack if it's getting full
      if (Workspace.getStackUsage() > 24000) {
        // 75% of 32KB
        Workspace.resetStack(true);
      }

      // Trigger garbage collection hint (if available)
      if (
        typeof window !== "undefined" &&
        "gc" in window &&
        typeof (window as any).gc === "function"
      ) {
        (window as any).gc();
      }
    },

    getStats() {
      return {
        allocationCount,
        cleanupThreshold,
      };
    },
  };
})();

// Enhanced workspace for aggressive stack-like allocation
const Workspace = (() => {
  const STACK_SIZE = 32768; // 32KB for more allocations
  const stack = new Float32Array(STACK_SIZE);
  let stackOffset = 0;
  let peakUsage = 0;

  return {
    allocateStack(size: number): Float32Array | null {
      // Increased threshold for stack allocation (4x larger)
      if (size <= 256 && stackOffset + size <= STACK_SIZE) {
        const buffer = stack.subarray(stackOffset, stackOffset + size);
        stackOffset += size;
        peakUsage = Math.max(peakUsage, stackOffset);
        return buffer;
      }
      return null;
    },

    // Smart reset that preserves frequently used lower memory
    resetStack(force = false): void {
      if (force || stackOffset > STACK_SIZE * 0.75) {
        stackOffset = 0;
      } else {
        // Partial reset to maintain hot allocations
        stackOffset = Math.max(0, stackOffset - Math.floor(stackOffset * 0.5));
      }
    },

    getStackUsage(): number {
      return stackOffset;
    },

    getPeakUsage(): number {
      return peakUsage;
    },

    getEfficiency(): number {
      return STACK_SIZE > 0 ? (peakUsage / STACK_SIZE) * 100 : 0;
    },
  };
})();

// WebNN availability check (cached)
let webnnAvailableCache: boolean | null = null;
let webnnCheckPromise: Promise<boolean> | null = null;

const checkWebNNAvailability = async (): Promise<boolean> => {
  if (webnnAvailableCache !== null) {
    return webnnAvailableCache;
  }
  
  if (webnnCheckPromise) {
    return webnnCheckPromise;
  }
  
  webnnCheckPromise = isWebNNAvailable().then(available => {
    webnnAvailableCache = available;
    return available;
  });
  
  return webnnCheckPromise;
};

// Memory-optimized convolution with aggressive allocation strategy
export const convolution = (
  signal: Float32Array,
  kernel: Float32Array,
  result?: Float32Array, // Make result optional for convenience API
): Float32Array => {
  const signalLen = signal.length;
  const kernelLen = kernel.length;
  const resultLen = signalLen + kernelLen - 1;

  // Use provided result buffer or allocate/reuse one with memory-efficient strategy
  let output: Float32Array;
  let isStackAllocated = false;
  let isPoolAllocated = false;

  if (result && result.length >= resultLen) {
    // Use provided buffer (may be larger, that's OK)
    output =
      result.length === resultLen
        ? result
        : (result.subarray(0, resultLen) as Float32Array);
  } else {
    // Aggressive stack allocation for small to medium results
    const stackBuffer = Workspace.allocateStack(resultLen);
    if (stackBuffer) {
      output = stackBuffer;
      isStackAllocated = true;
    } else {
      // Use enhanced buffer pool for larger allocations
      output = bufferPool.getBuffer(resultLen);
      isPoolAllocated = true;
    }
  }

  // Enhanced decision tree prioritizing memory efficiency
  let useWasm = false;

  if (signalLen <= 64) {
    // Small: JS is faster and stack-allocated
    useWasm = false;
  } else if (signalLen >= 512 && kernelLen >= 32) {
    // Large: JS is often better, but depends on kernel size
    useWasm = kernelLen >= 64; // WASM better for very large kernels
  } else {
    // Medium: WASM generally wins
    useWasm = true;
  }

  // Execute the convolution
  if (useWasm) {
    convolution_wasm(signal, kernel, output);
  } else {
    convolution_js(signal, kernel, output);
  }

  // Track buffer allocation for lifecycle management
  if (isPoolAllocated) {
    BufferLifecycle.trackBuffer(output);
  }

  // For automatic memory management: clean up stack periodically
  if (isStackAllocated && Math.random() < 0.1) {
    Workspace.resetStack(); // 10% chance to reset stack
  }

  return output;
};

// Smart managed API that handles its own memory lifecycle
export const convolutionManaged = (
  signal: Float32Array,
  kernel: Float32Array,
): Float32Array => {
  warmPool(); // Ensure pool is warmed up

  const result = convolution(signal, kernel);

  // For managed API, we want to automatically release buffers when appropriate
  // Set up delayed release for better performance in batched operations
  setTimeout(() => {
    BufferUtils.releaseBuffer(result);
  }, 0); // Release on next tick

  return result;
};

// Zero-allocation API (requires pre-allocated result)
export const convolutionInPlace = (
  signal: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
): void => {
  convolution(signal, kernel, result);
};

export const convolution_2d = (
  image: Float32Array,
  kernel: Float32Array,
  result?: Float32Array,
  imgWidth?: number,
  imgHeight?: number,
  kernelSize?: number,
): Float32Array => {
  warmPool(); // Ensure pool is ready

  // Infer dimensions if not provided
  const width = imgWidth ?? Math.sqrt(image.length);
  const height = imgHeight ?? width;
  const kSize = kernelSize ?? Math.sqrt(kernel.length);
  const resultSize = width * height;

  // Enhanced memory allocation strategy for 2D
  let output: Float32Array;
  let isStackAllocated = false;
  let isPoolAllocated = false;

  if (result && result.length >= resultSize) {
    output =
      result.length === resultSize
        ? result
        : (result.subarray(0, resultSize) as Float32Array);
  } else {
    // Stack allocation for smaller 2D operations
    const stackBuffer = Workspace.allocateStack(resultSize);
    if (stackBuffer) {
      output = stackBuffer;
      isStackAllocated = true;
    } else {
      // Enhanced buffer pool for larger allocations
      output = bufferPool.getBuffer(resultSize);
      isPoolAllocated = true;
    }
  }

  // 2D convolution uses WASM for optimal performance
  convolution_2d_wasm(image, kernel, output, width, height, kSize);

  // Track allocation for lifecycle management
  if (isPoolAllocated) {
    BufferLifecycle.trackBuffer(output);
  }

  return output;
};

// Zero-allocation 2D API (requires pre-allocated result)
export const convolution2DInPlace = (
  image: Float32Array,
  kernel: Float32Array,
  result: Float32Array,
  imgWidth: number,
  imgHeight: number,
  kernelSize: number,
): void => {
  convolution_2d_wasm(image, kernel, result, imgWidth, imgHeight, kernelSize);
};

// Async convolution with WebNN support for maximum performance
export const convolutionAsync = async (
  signal: Float32Array,
  kernel: Float32Array,
  result?: Float32Array,
): Promise<Float32Array> => {
  const signalLen = signal.length;
  const kernelLen = kernel.length;
  const resultLen = signalLen + kernelLen - 1;

  // Use provided result buffer or allocate/reuse one with memory-efficient strategy
  let output: Float32Array;
  let isStackAllocated = false;
  let isPoolAllocated = false;

  if (result && result.length >= resultLen) {
    // Use provided buffer (may be larger, that's OK)
    output =
      result.length === resultLen
        ? result
        : (result.subarray(0, resultLen) as Float32Array);
  } else {
    // Aggressive stack allocation for small to medium results
    const stackBuffer = Workspace.allocateStack(resultLen);
    if (stackBuffer) {
      output = stackBuffer;
      isStackAllocated = true;
    } else {
      // Use enhanced buffer pool for larger allocations
      output = bufferPool.getBuffer(resultLen);
      isPoolAllocated = true;
    }
  }

  // Enhanced decision tree with WebNN as the fastest option
  const webnnAvailable = await checkWebNNAvailability();
  
  let useWebNN = false;
  let useWasm = false;

  if (webnnAvailable && signalLen >= 128) {
    // WebNN excels with larger data sizes (GPU/NPU acceleration)
    if (signalLen >= 1024) {
      // Very large: WebNN should be fastest
      useWebNN = true;
    } else if (signalLen >= 512 && kernelLen >= 16) {
      // Large with significant kernel: WebNN preferred
      useWebNN = true;
    } else if (signalLen >= 256 && kernelLen >= 32) {
      // Medium-large with large kernel: WebNN wins
      useWebNN = true;
    }
  }

  if (!useWebNN) {
    // Fallback to existing WASM/JS logic
    if (signalLen <= 64) {
      // Small: JS is faster and stack-allocated
      useWasm = false;
    } else if (signalLen >= 512 && kernelLen >= 32) {
      // Large: JS is often better, but depends on kernel size
      useWasm = kernelLen >= 64; // WASM better for very large kernels
    } else {
      // Medium: WASM generally wins
      useWasm = true;
    }
  }

  // Execute the convolution
  if (useWebNN) {
    try {
      await convolution1D_webnn(signal, kernel, output);
    } catch (error) {
      console.warn('WebNN convolution failed, falling back to WASM:', error);
      convolution_wasm(signal, kernel, output);
    }
  } else if (useWasm) {
    convolution_wasm(signal, kernel, output);
  } else {
    convolution_js(signal, kernel, output);
  }

  // Track buffer allocation for lifecycle management
  if (isPoolAllocated) {
    BufferLifecycle.trackBuffer(output);
  }

  // For automatic memory management: clean up stack periodically
  if (isStackAllocated && Math.random() < 0.1) {
    Workspace.resetStack(); // 10% chance to reset stack
  }

  return output;
};

// Async 2D convolution with WebNN support
export const convolution2DAsync = async (
  image: Float32Array,
  kernel: Float32Array,
  result?: Float32Array,
  imgWidth?: number,
  imgHeight?: number,
  kernelSize?: number,
): Promise<Float32Array> => {
  warmPool(); // Ensure pool is ready

  // Infer dimensions if not provided
  const width = imgWidth ?? Math.sqrt(image.length);
  const height = imgHeight ?? width;
  const kSize = kernelSize ?? Math.sqrt(kernel.length);
  const resultSize = width * height;

  // Enhanced memory allocation strategy for 2D
  let output: Float32Array;
  let isStackAllocated = false;
  let isPoolAllocated = false;

  if (result && result.length >= resultSize) {
    output =
      result.length === resultSize
        ? result
        : (result.subarray(0, resultSize) as Float32Array);
  } else {
    // Stack allocation for smaller 2D operations
    const stackBuffer = Workspace.allocateStack(resultSize);
    if (stackBuffer) {
      output = stackBuffer;
      isStackAllocated = true;
    } else {
      // Enhanced buffer pool for larger allocations
      output = bufferPool.getBuffer(resultSize);
      isPoolAllocated = true;
    }
  }

  // Enhanced decision tree with WebNN for 2D convolution
  const webnnAvailable = await checkWebNNAvailability();
  
  let useWebNN = false;

  if (webnnAvailable) {
    // WebNN excels for 2D convolution with larger images
    if (width >= 64 && height >= 64) {
      // Large images: WebNN should be fastest
      useWebNN = true;
    } else if (width >= 32 && height >= 32 && kSize >= 5) {
      // Medium images with significant kernels: WebNN preferred
      useWebNN = true;
    }
  }

  // Execute the convolution
  if (useWebNN) {
    try {
      await convolution2D_webnn(image, kernel, output, width, height, kSize);
    } catch (error) {
      console.warn('WebNN 2D convolution failed, falling back to WASM:', error);
      convolution_2d_wasm(image, kernel, output, width, height, kSize);
    }
  } else {
    // 2D convolution uses WASM for optimal performance
    convolution_2d_wasm(image, kernel, output, width, height, kSize);
  }

  // Track allocation for lifecycle management
  if (isPoolAllocated) {
    BufferLifecycle.trackBuffer(output);
  }

  return output;
};

// Enhanced buffer management utilities with comprehensive memory control
export const BufferUtils = {
  // Manually release a buffer back to the pool
  releaseBuffer: (buffer: Float32Array): void => {
    bufferPool.releaseBuffer(buffer);
  },

  // Smart stack reset with usage-based strategy
  resetStack: (force = false): void => {
    Workspace.resetStack(force);
  },

  // Comprehensive memory usage statistics
  getStats: () => {
    const poolsMap = (bufferPool as any).pools as Map<number, Float32Array[]>;
    const poolStats = bufferPool.getStats();
    const lifecycleStats = BufferLifecycle.getStats();

    return {
      stack: {
        usage: Workspace.getStackUsage(),
        peak: Workspace.getPeakUsage(),
        efficiency: Workspace.getEfficiency(),
        capacity: 32768,
      },
      pools: {
        sizes: Array.from(poolsMap.entries()).map(([size, pool]) => ({
          bufferSize: size,
          pooledCount: pool.length,
        })),
        totalPooled: poolStats.totalPooled,
        hitRate: poolStats.hitRate,
        poolCount: poolStats.pools,
      },
      lifecycle: lifecycleStats,
    };
  },

  // Intelligent memory cleanup
  performMaintenance: (): void => {
    BufferLifecycle.performMaintenance();
  },

  // Clear all pooled buffers (for memory cleanup)
  clearPools: (): void => {
    bufferPool.clear();
  },

  // Memory pressure management
  handleMemoryPressure: (): void => {
    Workspace.resetStack(true);
    bufferPool.clear();
    BufferLifecycle.performMaintenance();
  },

  // Pre-warm pools for better performance
  preWarm: (sizes?: number[]): void => {
    const defaultSizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];
    bufferPool.preWarm(sizes || defaultSizes, 3);
  },
};

// Enhanced performance-focused batch operations with aggressive memory optimization
export const BatchOperations = {
  // Process multiple convolutions with intelligent workspace management
  convolutionBatch: (
    pairs: Array<{ signal: Float32Array; kernel: Float32Array }>,
    options?: {
      reuseBuffers?: boolean;
      preAllocateResults?: boolean;
      useSharedWorkspace?: boolean;
    },
  ): Float32Array[] => {
    const {
      reuseBuffers = true,
      preAllocateResults = true,
      useSharedWorkspace = true,
    } = options || {};

    warmPool(); // Ensure optimal pool state

    const results: Float32Array[] = [];

    // Pre-allocate result buffers for better memory patterns
    if (preAllocateResults) {
      const resultSizes = pairs.map(
        ({ signal, kernel }) => signal.length + kernel.length - 1,
      );

      // Pre-warm pool with exact sizes needed
      bufferPool.preWarm(resultSizes, 1);
    }

    // Reset stack for batch operation if using shared workspace
    if (reuseBuffers && useSharedWorkspace) {
      Workspace.resetStack(true);
    }

    for (let i = 0; i < pairs.length; i++) {
      const { signal, kernel } = pairs[i];
      const result = convolution(signal, kernel);
      results.push(result);

      // Periodic maintenance during long batches
      if (i > 0 && i % 50 === 0) {
        BufferLifecycle.performMaintenance();
      }
    }

    return results;
  },

  // Enhanced memory-aware pre-warming
  preWarmPools: (sizes: number[], count = 5): void => {
    bufferPool.preWarm(sizes, count);
  },

  // Batch processing with automatic buffer lifecycle
  convolutionBatchManaged: (
    pairs: Array<{ signal: Float32Array; kernel: Float32Array }>,
  ): Float32Array[] => {
    const results = BatchOperations.convolutionBatch(pairs, {
      reuseBuffers: true,
      preAllocateResults: true,
      useSharedWorkspace: true,
    });

    // Set up delayed cleanup for managed batch processing
    setTimeout(() => {
      results.forEach((result) => BufferUtils.releaseBuffer(result));
    }, 100); // Longer delay for batch operations

    return results;
  },

  // Memory-efficient streaming convolution for very large datasets
  convolutionStream: function* (
    pairs: Array<{ signal: Float32Array; kernel: Float32Array }>,
    batchSize = 10,
  ): Generator<Float32Array[], void, unknown> {
    for (let i = 0; i < pairs.length; i += batchSize) {
      const batch = pairs.slice(i, i + batchSize);
      yield BatchOperations.convolutionBatch(batch, {
        reuseBuffers: true,
        preAllocateResults: true,
        useSharedWorkspace: true,
      });

      // Clean up between batches
      BufferLifecycle.performMaintenance();
    }
  },
};

// WebNN utilities for checking availability and getting stats
export const WebNNUtils = {
  /**
   * Check if WebNN is available in the current environment.
   * @returns Promise<boolean> True if WebNN is available
   */
  isAvailable: checkWebNNAvailability,

  /**
   * Get WebNN performance and cache statistics.
   * @returns Object with WebNN stats
   */
  getStats: getWebNNStats,

  /**
   * Get cached availability status (synchronous, may be null if not checked yet).
   * @returns boolean | null Cached availability status
   */
  getCachedAvailability: (): boolean | null => webnnAvailableCache,

  /**
   * Force re-check WebNN availability (clears cache).
   * @returns Promise<boolean> Updated availability status
   */
  recheckAvailability: async (): Promise<boolean> => {
    webnnAvailableCache = null;
    webnnCheckPromise = null;
    return checkWebNNAvailability();
  },
};
