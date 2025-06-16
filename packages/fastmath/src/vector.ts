import init, {
  initThreadPool,
  batch_dot_product_hyper_optimized,
  batch_dot_product_hyper_optimized_parallel,
  batch_dot_product_zero_copy_parallel,
  batch_dot_product_rayon_chunked,
  batch_dot_product_ultra_simple,
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

  // Get WASM memory and malloc function
  const memory = wasmInstance.memory;
  const malloc = wasmInstance.__wbindgen_malloc;
  const free = wasmInstance.__wbindgen_free;

  // Allocate properly aligned memory from WASM heap
  const aPtrValue = malloc(vectorsASize, 4); // 4-byte alignment for f32
  const bPtrValue = malloc(vectorsBSize, 4);
  const resultsPtrValue = malloc(resultsSize, 4);

  // Create views into the allocated memory
  const aView = new Float32Array(memory.buffer, aPtrValue, vectorsA.length);
  const bView = new Float32Array(memory.buffer, bPtrValue, vectorsB.length);
  const resultsView = new Float32Array(memory.buffer, resultsPtrValue, numPairs);

  // Copy data to WASM memory using efficient set operations
  aView.set(vectorsA);
  bView.set(vectorsB);

  try {
    // Choose optimal implementation - use chunked parallel for medium workloads only
    // WASM threading has issues with very large workloads, so be conservative
    if (useParallel && numPairs >= 1000 && numPairs <= 4000) {
      // Use Rayon chunked parallel implementation (SIMD + threading)
      batch_dot_product_rayon_chunked(
        aPtrValue,
        bPtrValue,
        resultsPtrValue,
        vectorLength,
        numPairs,
      );
    } else {
      // Use sequential hyper-optimized implementation (SIMD only)
      batch_dot_product_hyper_optimized(
        aPtrValue,
        bPtrValue,
        resultsPtrValue,
        vectorLength,
        numPairs,
      );
    }

    // Copy results before freeing memory
    const results = new Float32Array(resultsView);
    
    // Clean up allocated memory
    free(aPtrValue, vectorsASize, 4);
    free(bPtrValue, vectorsBSize, 4);
    free(resultsPtrValue, resultsSize, 4);

    return results;
  } catch (error) {
    // Clean up memory on error
    free(aPtrValue, vectorsASize, 4);
    free(bPtrValue, vectorsBSize, 4);
    free(resultsPtrValue, resultsSize, 4);
    throw error;
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
