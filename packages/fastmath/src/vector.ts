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
    if (useParallel && numPairs >= 2000) {
      // Use parallel implementation for large workloads
      batch_dot_product_parallel_ultra_optimized(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
      );
    } else {
      // Use sequential implementation for smaller workloads or when parallel is disabled
      batch_dot_product_hyper_optimized(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
      );
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
