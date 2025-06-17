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
} from "../pkg/defuss_fastmath.js";

// Global WASM instance state
let wasmInitialized = false;
let wasmInstance: any;

// Memory pool to eliminate allocation overhead
let memoryPool: {
  aPtr: number;
  bPtr: number; 
  resultsPtr: number;
  maxSize: number;
} | null = null;

function ensureMemoryPool(totalSize: number): { aPtr: number; bPtr: number; resultsPtr: number } {
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;
  
  // If pool exists and is large enough, reuse it
  if (memoryPool && memoryPool.maxSize >= totalSize) {
    return {
      aPtr: memoryPool.aPtr,
      bPtr: memoryPool.bPtr,
      resultsPtr: memoryPool.resultsPtr
    };
  }
  
  // Free old pool if exists
  if (memoryPool) {
    free(memoryPool.aPtr, memoryPool.maxSize / 3, 4);
    free(memoryPool.bPtr, memoryPool.maxSize / 3, 4);
    free(memoryPool.resultsPtr, memoryPool.maxSize / 3, 4);
  }
  
  // Allocate new larger pool with 25% headroom
  const poolSize = Math.ceil(totalSize * 1.25);
  const vectorsSize = Math.ceil(poolSize * 0.4); // 40% each for A and B
  const resultsSize = Math.ceil(poolSize * 0.2);  // 20% for results
  
  const aPtr = malloc(vectorsSize, 16); // 16-byte alignment for optimal SIMD
  const bPtr = malloc(vectorsSize, 16);
  const resultsPtr = malloc(resultsSize, 16);
  
  memoryPool = {
    aPtr,
    bPtr,
    resultsPtr,
    maxSize: poolSize
  };
  
  return { aPtr, bPtr, resultsPtr };
}

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
export function batchDotProductZeroCopy(
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

  // Calculate memory requirements
  const vectorsASize = vectorsA.length * 4; // 4 bytes per f32
  const vectorsBSize = vectorsB.length * 4;
  const resultsSize = numPairs * 4;
  const totalSize = vectorsASize + vectorsBSize + resultsSize;

  // Get WASM memory and use memory pool for zero-allocation performance
  const memory = wasmInstance.memory;
  const { aPtr, bPtr, resultsPtr } = ensureMemoryPool(totalSize);

  // Create views into the pooled memory
  const aView = new Float32Array(memory.buffer, aPtr, vectorsA.length);
  const bView = new Float32Array(memory.buffer, bPtr, vectorsB.length);
  const resultsView = new Float32Array(memory.buffer, resultsPtr, numPairs);

  // Copy data to WASM memory using efficient set operations
  aView.set(vectorsA);
  bView.set(vectorsB);

  // Choose ultra-optimized implementation based on workload
  if (useParallel && numPairs >= 2000) {
    // Use the existing hyper-optimized parallel for now
    batch_dot_product_hyper_optimized_parallel(
      aPtr,
      bPtr,
      resultsPtr,
      vectorLength,
      numPairs,
    );
  } else {
    // Use the existing hyper-optimized sequential (known to work well)
    batch_dot_product_hyper_optimized(
      aPtr,
      bPtr,
      resultsPtr,
      vectorLength,
      numPairs,
    );
  }

  // Copy results (memory pool persists for reuse)
  return new Float32Array(resultsView);
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
    const chunkResults = batchDotProductZeroCopy(
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
  const resultsView = new Float32Array(memory.buffer, resultsPtrValue, numPairs);

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
