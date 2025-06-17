import init, {
  initThreadPool,
  batch_dot_product_hyper_optimized,
  batch_dot_product_hyper_optimized_parallel,
  batch_dot_product_zero_copy_parallel,
  batch_dot_product_rayon_chunked,
  batch_dot_product_ultra_simple,
  batch_dot_product_ultra_optimized,
  batch_dot_product_parallel_ultra_optimized,
  batch_dot_product_c_style,
  batch_dot_product_streaming,
  batch_dot_product_memory_limited,
  batch_dot_product_adaptive_streaming,
} from "../pkg/defuss_fastmath.js";

// Global WASM instance state
let wasmInitialized = false;
let wasmInstance: any;

/**
 * Initialize WASM module (call once before using vector functions)
 */
export async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    wasmInstance = await init();
    try {
      // Initialize thread pool if supported
      await initThreadPool(navigator.hardwareConcurrency || 8);
      console.log(
        "✅ WASM thread pool initialized with concurrency:",
        navigator.hardwareConcurrency || 8,
      );
    } catch (e) {
      console.warn(
        "⚠️ Thread pool initialization failed (expected in some environments)",
      );
    }
    wasmInitialized = true;
  }
  return wasmInstance;
}

/**
 * Ultra-fast zero-copy batch dot product using hyper-optimized SIMD implementation
 * Simple, direct memory management for maximum performance - inspired by 35ms/100k optimization
 *
 * @param vectorsA Flat Float32Array containing all 'a' vectors concatenated
 * @param vectorsB Flat Float32Array containing all 'b' vectors concatenated
 * @param vectorLength Length of each individual vector
 * @param numPairs Number of vector pairs to process
 * @param useParallel Whether to use parallel processing (recommended for >1000 pairs)
 * @returns Float32Array with dot product results
 */
export function batchDotProductZeroCopyParallel(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  useParallel = false,
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  // Validate input
  const expectedLength = numPairs * vectorLength;
  if (
    vectorsA.length !== expectedLength ||
    vectorsB.length !== expectedLength
  ) {
    throw new Error(
      `Expected ${expectedLength} elements, got A:${vectorsA.length}, B:${vectorsB.length}`,
    );
  }

  // Use direct malloc/free approach for reliability - same as C-style
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const vectorsASize = vectorsA.length * 4;
  const vectorsBSize = vectorsB.length * 4;
  const resultsSize = numPairs * 4;

  const aPtr = malloc(vectorsASize, 4);
  const bPtr = malloc(vectorsBSize, 4);
  const resultsPtr = malloc(resultsSize, 4);

  // Create views and copy data
  const aView = new Float32Array(memory.buffer, aPtr, vectorsA.length);
  const bView = new Float32Array(memory.buffer, bPtr, vectorsB.length);
  const resultsView = new Float32Array(memory.buffer, resultsPtr, numPairs);

  aView.set(vectorsA);
  bView.set(vectorsB);

  try {
    // Choose implementation based on workload size and useParallel flag
    if (useParallel && numPairs >= 500) {
      // Use ultra-optimized parallel implementation for medium to large workloads
      batch_dot_product_parallel_ultra_optimized(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
      );
    } else {
      // Use ultra-optimized sequential implementation for smaller workloads
      batch_dot_product_c_style(aPtr, bPtr, resultsPtr, vectorLength, numPairs);
    }

    // Copy results before freeing
    const results = new Float32Array(resultsView);

    return results;
  } finally {
    // Always free memory
    free(aPtr, vectorsASize, 4);
    free(bPtr, vectorsBSize, 4);
    free(resultsPtr, resultsSize, 4);
  }
}

/**
 * Streaming batch processor for truly massive datasets
 * Processes data in chunks to avoid memory allocation overhead
 */
export async function batchDotProductStreaming(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numVectors: number,
  chunkSize = 10000,
): Promise<Float32Array> {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const results = new Float32Array(numVectors);
  let processedVectors = 0;

  while (processedVectors < numVectors) {
    const remainingVectors = numVectors - processedVectors;
    const currentChunkSize = Math.min(chunkSize, remainingVectors);

    const startIdx = processedVectors * vectorLength;
    const endIdx = startIdx + currentChunkSize * vectorLength;

    // Create views (no copying!)
    const chunkA = vectorsA.subarray(startIdx, endIdx);
    const chunkB = vectorsB.subarray(startIdx, endIdx);

    // Process chunk
    const chunkResults = batchDotProductZeroCopyParallel(
      chunkA,
      chunkB,
      vectorLength,
      currentChunkSize,
      false, // Keep sequential for memory safety
    );

    // Copy results into final array
    results.set(chunkResults, processedVectors);

    processedVectors += currentChunkSize;

    // Allow event loop to breathe for very large datasets
    if (processedVectors % 50000 === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * C-style direct implementation matching the reference code
 * Uses malloc/free per call for maximum simplicity and performance
 */
export function batchDotProductCStyle(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  // Validate input
  const expectedLength = numPairs * vectorLength;
  if (
    vectorsA.length !== expectedLength ||
    vectorsB.length !== expectedLength
  ) {
    throw new Error(
      `Expected ${expectedLength} elements, got A:${vectorsA.length}, B:${vectorsB.length}`,
    );
  }

  // Direct malloc like the C code
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const vectorsASize = vectorsA.length * 4;
  const vectorsBSize = vectorsB.length * 4;
  const resultsSize = numPairs * 4;

  const aPtrValue = malloc(vectorsASize, 4);
  const bPtrValue = malloc(vectorsBSize, 4);
  const resultsPtrValue = malloc(resultsSize, 4);

  // Direct memory copy
  const aView = new Float32Array(memory.buffer, aPtrValue, vectorsA.length);
  const bView = new Float32Array(memory.buffer, bPtrValue, vectorsB.length);
  const resultsView = new Float32Array(
    memory.buffer,
    resultsPtrValue,
    numPairs,
  );

  aView.set(vectorsA);
  bView.set(vectorsB);

  // Call the C-style implementation
  batch_dot_product_c_style(
    aPtrValue,
    bPtrValue,
    resultsPtrValue,
    vectorLength,
    numPairs,
  );

  // Copy results and free immediately
  const results = new Float32Array(resultsView);

  free(aPtrValue, vectorsASize, 4);
  free(bPtrValue, vectorsBSize, 4);
  free(resultsPtrValue, resultsSize, 4);

  return results;
}

/**
 * Ultra-optimized streaming batch dot product with minimal memory allocation
 * Uses fixed-size buffers and processes data in optimal chunks for maximum throughput
 *
 * @param vectorsA Source array A
 * @param vectorsB Source array B
 * @param vectorLength Length of each vector
 * @param numPairs Total number of vector pairs
 * @param options Streaming configuration options
 */
export function batchDotProductStreamingOptimized(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  options: {
    chunkSize?: number;
    useParallel?: boolean;
    maxMemoryMB?: number;
  } = {},
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const {
    chunkSize = Math.min(8192, numPairs), // Default to 8k chunks
    useParallel = true,
    maxMemoryMB = 64, // Limit to 64MB chunks
  } = options;

  // Calculate optimal chunk size based on memory constraints
  const bytesPerPair = vectorLength * 2 * 4; // 2 vectors * 4 bytes per float
  const maxPairsPerChunk = Math.floor((maxMemoryMB * 1024 * 1024) / bytesPerPair);
  const finalChunkSize = Math.min(chunkSize, maxPairsPerChunk, numPairs);

  const results = new Float32Array(numPairs);

  // Pre-allocate WASM memory buffers once for reuse
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const chunkBytes = finalChunkSize * vectorLength * 4;
  const resultsBytes = finalChunkSize * 4;

  const aPtr = malloc(chunkBytes, 4);
  const bPtr = malloc(chunkBytes, 4);
  const resultsPtr = malloc(resultsBytes, 4);

  try {
    const aView = new Float32Array(memory.buffer, aPtr, finalChunkSize * vectorLength);
    const bView = new Float32Array(memory.buffer, bPtr, finalChunkSize * vectorLength);
    const resultsView = new Float32Array(memory.buffer, resultsPtr, finalChunkSize);

    let processedPairs = 0;

    while (processedPairs < numPairs) {
      const remainingPairs = numPairs - processedPairs;
      const currentChunkSize = Math.min(finalChunkSize, remainingPairs);

      const startIdx = processedPairs * vectorLength;
      const endIdx = startIdx + currentChunkSize * vectorLength;

      // Zero-copy views into source data
      const sourceA = vectorsA.subarray(startIdx, endIdx);
      const sourceB = vectorsB.subarray(startIdx, endIdx);

      // Copy data to WASM memory (unavoidable but minimized)
      aView.set(sourceA);
      bView.set(sourceB);

      // Process chunk with optimal implementation
      if (useParallel && currentChunkSize >= 500) {
        batch_dot_product_parallel_ultra_optimized(
          aPtr,
          bPtr,
          resultsPtr,
          vectorLength,
          currentChunkSize,
        );
      } else {
        batch_dot_product_c_style(
          aPtr,
          bPtr,
          resultsPtr,
          vectorLength,
          currentChunkSize,
        );
      }

      // Copy results back
      const chunkResults = new Float32Array(
        memory.buffer,
        resultsPtr,
        currentChunkSize,
      );
      results.set(chunkResults, processedPairs);

      processedPairs += currentChunkSize;
    }

    return results;
  } finally {
    free(aPtr, chunkBytes, 4);
    free(bPtr, chunkBytes, 4);
    free(resultsPtr, resultsBytes, 4);
  }
}

/**
 * Memory-mapped streaming processor using persistent WASM buffers
 * Processes data with zero JavaScript memory allocation overhead
 */
export function batchDotProductMemoryMapped(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  options: {
    bufferSizeMB?: number;
    useParallel?: boolean;
  } = {},
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const { bufferSizeMB = 32, useParallel = true } = options;

  // Calculate buffer size in pairs
  const bytesPerPair = vectorLength * 2 * 4;
  const bufferSizePairs = Math.floor((bufferSizeMB * 1024 * 1024) / bytesPerPair);
  const chunkSize = Math.min(bufferSizePairs, numPairs);

  const results = new Float32Array(numPairs);

  // Allocate persistent buffers
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const bufferBytes = chunkSize * vectorLength * 4;
  const resultsBytes = chunkSize * 4;

  const aPtr = malloc(bufferBytes, 4);
  const bPtr = malloc(bufferBytes, 4);
  const resultsPtr = malloc(resultsBytes, 4);

  try {
    let processedPairs = 0;

    while (processedPairs < numPairs) {
      const remainingPairs = numPairs - processedPairs;
      const currentChunkSize = Math.min(chunkSize, remainingPairs);

      const startIdx = processedPairs * vectorLength;
      const chunkElements = currentChunkSize * vectorLength;

      // Direct memory mapping - copy data once to WASM linear memory
      const sourceABytes = vectorsA.buffer.slice(
        vectorsA.byteOffset + startIdx * 4,
        vectorsA.byteOffset + (startIdx + chunkElements) * 4,
      );
      const sourceBBytes = vectorsB.buffer.slice(
        vectorsB.byteOffset + startIdx * 4,
        vectorsB.byteOffset + (startIdx + chunkElements) * 4,
      );

      // Copy binary data directly
      new Uint8Array(memory.buffer, aPtr, chunkElements * 4).set(
        new Uint8Array(sourceABytes),
      );
      new Uint8Array(memory.buffer, bPtr, chunkElements * 4).set(
        new Uint8Array(sourceBBytes),
      );

      // Process with optimal algorithm
      if (useParallel && currentChunkSize >= 500) {
        batch_dot_product_parallel_ultra_optimized(
          aPtr,
          bPtr,
          resultsPtr,
          vectorLength,
          currentChunkSize,
        );
      } else {
        batch_dot_product_c_style(
          aPtr,
          bPtr,
          resultsPtr,
          vectorLength,
          currentChunkSize,
        );
      }

      // Copy results
      const chunkResults = new Float32Array(
        memory.buffer,
        resultsPtr,
        currentChunkSize,
      );
      results.set(chunkResults, processedPairs);

      processedPairs += currentChunkSize;
    }

    return results;
  } finally {
    free(aPtr, bufferBytes, 4);
    free(bPtr, bufferBytes, 4);
    free(resultsPtr, resultsBytes, 4);
  }
}

/**
 * Adaptive streaming processor that automatically selects the best strategy
 * based on dataset size and available memory
 */
export function batchDotProductAdaptive(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  useParallel = true,
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const totalMemoryMB = (numPairs * vectorLength * 2 * 4) / (1024 * 1024);

  // Small datasets: use direct processing
  if (totalMemoryMB < 16) {
    return batchDotProductZeroCopyParallel(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      useParallel && numPairs >= 500,
    );
  }

  // Medium datasets: use optimized streaming
  if (totalMemoryMB < 128) {
    return batchDotProductStreamingOptimized(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      {
        chunkSize: 4096,
        useParallel,
        maxMemoryMB: 32,
      },
    );
  }

  // Large datasets: use memory-mapped streaming
  return batchDotProductMemoryMapped(
    vectorsA,
    vectorsB,
    vectorLength,
    numPairs,
    {
      bufferSizeMB: 64,
      useParallel,
    },
  );
}

/**
 * Ultra-high performance streaming processor using Rust-native streaming
 * Minimizes JavaScript overhead by doing all chunk management in Rust
 */
export function batchDotProductRustStreaming(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  options: {
    chunkSize?: number;
    maxMemoryMB?: number;
  } = {}
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const { chunkSize = 4096, maxMemoryMB = 64 } = options;

  // Validate input
  const expectedLength = numPairs * vectorLength;
  if (vectorsA.length !== expectedLength || vectorsB.length !== expectedLength) {
    throw new Error(
      `Expected ${expectedLength} elements, got A:${vectorsA.length}, B:${vectorsB.length}`,
    );
  }

  // Allocate memory once for entire operation
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const vectorsASize = vectorsA.length * 4;
  const vectorsBSize = vectorsB.length * 4;
  const resultsSize = numPairs * 4;

  const aPtr = malloc(vectorsASize, 4);
  const bPtr = malloc(vectorsBSize, 4);
  const resultsPtr = malloc(resultsSize, 4);

  try {
    // Copy data to WASM memory
    const aView = new Float32Array(memory.buffer, aPtr, vectorsA.length);
    const bView = new Float32Array(memory.buffer, bPtr, vectorsB.length);
    const resultsView = new Float32Array(memory.buffer, resultsPtr, numPairs);

    aView.set(vectorsA);
    bView.set(vectorsB);

    // Use Rust-native streaming processor
    if (maxMemoryMB) {
      batch_dot_product_memory_limited(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
        maxMemoryMB
      );
    } else {
      batch_dot_product_streaming(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
        chunkSize
      );
    }

    return new Float32Array(resultsView);
  } finally {
    free(aPtr, vectorsASize, 4);
    free(bPtr, vectorsBSize, 4);
    free(resultsPtr, resultsSize, 4);
  }
}

/**
 * Intelligent adaptive processor that selects optimal strategy
 * Uses all available optimization techniques automatically
 */
export function batchDotProductUltimate(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
): Float32Array {
  if (!wasmInitialized) {
    throw new Error("WASM not initialized. Call initWasm() first.");
  }

  const totalMemoryMB = (numPairs * vectorLength * 2 * 4) / (1024 * 1024);

  // Micro datasets: Direct WASM call
  if (totalMemoryMB < 4) {
    return batchDotProductZeroCopyParallel(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      numPairs >= 500
    );
  }

  // Small datasets: TypeScript streaming
  if (totalMemoryMB < 32) {
    return batchDotProductStreamingOptimized(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      {
        chunkSize: 2048,
        useParallel: true,
        maxMemoryMB: 16
      }
    );
  }

  // Medium datasets: Rust streaming
  if (totalMemoryMB < 128) {
    return batchDotProductRustStreaming(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      {
        chunkSize: 4096,
        maxMemoryMB: 32
      }
    );
  }

  // Large datasets: Adaptive Rust streaming
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  const vectorsASize = vectorsA.length * 4;
  const vectorsBSize = vectorsB.length * 4;
  const resultsSize = numPairs * 4;

  const aPtr = malloc(vectorsASize, 4);
  const bPtr = malloc(vectorsBSize, 4);
  const resultsPtr = malloc(resultsSize, 4);

  try {
    const aView = new Float32Array(memory.buffer, aPtr, vectorsA.length);
    const bView = new Float32Array(memory.buffer, bPtr, vectorsB.length);
    const resultsView = new Float32Array(memory.buffer, resultsPtr, numPairs);

    aView.set(vectorsA);
    bView.set(vectorsB);

    // Use adaptive Rust streaming for maximum performance
    batch_dot_product_adaptive_streaming(
      aPtr,
      bPtr,
      resultsPtr,
      vectorLength,
      numPairs
    );

    return new Float32Array(resultsView);
  } finally {
    free(aPtr, vectorsASize, 4);
    free(bPtr, vectorsBSize, 4);
    free(resultsPtr, resultsSize, 4);
  }
}
