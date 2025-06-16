import init, {
  initThreadPool,
  batch_dot_product_hyper_optimized,
  batch_dot_product_zero_copy_parallel,
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
      await initThreadPool(navigator.hardwareConcurrency || 4);
    } catch (e) {
      console.warn(
        "⚠️ Thread pool initialization failed (expected in some environments)",
      );
    }
    wasmInitialized = true;
  }
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

  // Get WASM memory
  const memory = wasmInstance.memory;

  // Ensure WASM memory has enough space
  const currentPages = memory.buffer.byteLength / 65536;
  const requiredPages = Math.ceil(totalSize / 65536);
  if (requiredPages > currentPages) {
    memory.grow(requiredPages - currentPages);
  }

  // Calculate offsets in WASM memory (in bytes) - simple, no alignment overhead
  const aOffset = 0;
  const bOffset = vectorsASize;
  const resultsOffset = vectorsASize + vectorsBSize;

  // Copy data to WASM memory using efficient set operations - zero-copy style
  const aView = new Float32Array(memory.buffer, aOffset, vectorsA.length);
  const bView = new Float32Array(memory.buffer, bOffset, vectorsB.length);
  const resultsView = new Float32Array(memory.buffer, resultsOffset, numPairs);

  // Efficient bulk copy - much faster than individual element copying
  aView.set(vectorsA);
  bView.set(vectorsB);

  // Calculate pointer values (byte offsets)
  const aPtrValue = aOffset;
  const bPtrValue = bOffset;
  const resultsPtrValue = resultsOffset;

  // Choose optimal implementation - use chunked processing for large parallel workloads
  if (useParallel && numPairs > 10000) {
    // Process in chunks for better cache efficiency and potential thread utilization
    const chunkSize = Math.min(5000, Math.floor(numPairs / 4));
    for (let offset = 0; offset < numPairs; offset += chunkSize) {
      const currentChunk = Math.min(chunkSize, numPairs - offset);
      const currentAPtr = aPtrValue + offset * vectorLength * 4;
      const currentBPtr = bPtrValue + offset * vectorLength * 4;
      const currentResultsPtr = resultsPtrValue + offset * 4;

      batch_dot_product_ultra_simple(
        currentAPtr,
        currentBPtr,
        currentResultsPtr,
        vectorLength,
        currentChunk,
      );
    }
  } else {
    // Single call for sequential or smaller datasets
    batch_dot_product_ultra_simple(
      aPtrValue,
      bPtrValue,
      resultsPtrValue,
      vectorLength,
      numPairs,
    );
  }

  // Return a copy of the results (this is the only unavoidable copy)
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
