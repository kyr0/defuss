import init, {
  initThreadPool,
  batch_dot_product_zero_copy,
  alloc_f32_array,
  dealloc_f32_array,
  get_memory
} from "../pkg/defuss_fastmath.js";

// Global WASM instance state
let wasmInitialized = false;
let wasmInstance: any;

export interface ChunkedResult {
  results: Float32Array;
  totalTime: number;
  executionTime: number;
  chunksProcessed?: number;
}

export interface DotProductResult extends ChunkedResult {
  gflops: number;
  memoryEfficiency: number;
  processingMethod: "direct" | "chunked";
}

/**
 * Initialize WASM module for ultimate performance operations
 * Must be called before using any ultimate performance functions
 */
export async function initWasm(): Promise<any> {
  if (!wasmInitialized) {
    wasmInstance = await init();
    await initThreadPool(navigator.hardwareConcurrency || 8); // Use available cores or default to 4
    wasmInitialized = true;
  }
  return wasmInstance;
}

/**
 * Get memory usage information from WASM
 */
export function getWasmMemoryInfo(): { usedMB: number; totalMB: number } {
  if (!wasmInstance) {
    return { usedMB: 0, totalMB: 0 };
  }

  const totalBytes = wasmInstance.memory.buffer.byteLength;
  const totalMB = totalBytes / (1024 * 1024);

  return {
    usedMB: totalMB, // For WASM, allocated = used
    totalMB,
  };
}

/**
 * Native JavaScript dot product for verification purposes
 */
function nativeDotProduct(a: Float32Array, b: Float32Array): number {
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result += a[i] * b[i];
  }
  return result;
}

/**
 * Memory-aware configuration for intelligent workload management
 */
const MEMORY_CONFIG = {
  MAX_SAFE_ELEMENTS: 8_000_000, // 32MB for a+b data (conservative WASM limit)
  OPTIMAL_CHUNK_ELEMENTS: 2_000_000, // 8MB optimal chunk size
  MIN_CHUNK_PAIRS: 100, // Don't split below this threshold
} as const;

/**
 * Check if workload can fit in memory without splitting
 */
function canFitInMemory(vectorLength: number, numPairs: number): boolean {
  const totalElements = vectorLength * numPairs * 2; // Both a and b vectors
  return totalElements <= MEMORY_CONFIG.MAX_SAFE_ELEMENTS;
}

/**
 * Calculate optimal chunk size for large workloads
 */
function calculateOptimalChunkSize(
  vectorLength: number,
  numPairs: number,
): number {
  const elementsPerPair = vectorLength * 2;
  const maxPairsPerChunk = Math.floor(
    MEMORY_CONFIG.OPTIMAL_CHUNK_ELEMENTS / elementsPerPair,
  );
  return Math.max(
    MEMORY_CONFIG.MIN_CHUNK_PAIRS,
    Math.min(numPairs, maxPairsPerChunk),
  );
}

/**
 * Zero-copy processing function that works entirely in WASM heap
 */
function processChunkZeroCopy(
  chunkA: Float32Array,
  chunkB: Float32Array,
  vectorLength: number,
  numPairs: number,
): { results: Float32Array; executionTime: number } {
  const totalElements = vectorLength * numPairs;

  // Allocate WASM heap memory
  const aPtr = alloc_f32_array(totalElements);
  const bPtr = alloc_f32_array(totalElements);
  const resultsPtr = alloc_f32_array(numPairs);

  try {
    // Get WASM memory and create views
    const memory = get_memory();
    const memoryBuffer = new Float32Array(memory.buffer);

    // Calculate byte offsets (f32 = 4 bytes)
    const aPtrOffset = aPtr / 4;
    const bPtrOffset = bPtr / 4;
    const resultsPtrOffset = resultsPtr / 4;

    // Create views directly into WASM memory
    const aView = memoryBuffer.subarray(aPtrOffset, aPtrOffset + totalElements);
    const bView = memoryBuffer.subarray(bPtrOffset, bPtrOffset + totalElements);
    const resultsView = memoryBuffer.subarray(
      resultsPtrOffset,
      resultsPtrOffset + numPairs,
    );    // Copy data directly into WASM heap
    aView.set(chunkA);
    bView.set(chunkB);
    
    // Perform computation in WASM heap with timing
    const startTime = performance.now();
    batch_dot_product_zero_copy(aPtr, bPtr, resultsPtr, vectorLength, numPairs);
    const endTime = performance.now();
    
    // Return copy of results and timing info
    return {
      results: new Float32Array(resultsView),
      executionTime: endTime - startTime
    };
  } finally {
    // Always deallocate WASM memory
    dealloc_f32_array(aPtr, totalElements);
    dealloc_f32_array(bPtr, totalElements);
    dealloc_f32_array(resultsPtr, numPairs);
  }
}

/**
 * Intelligent workload splitting with zero-copy chunk processing
 */
async function processWorkloadInChunks(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  processingFunction: (
    a: Float32Array,
    b: Float32Array,
    vlen: number,
    npairs: number,
  ) => { results: Float32Array; executionTime: number },
): Promise<ChunkedResult> {
  const chunkSize = calculateOptimalChunkSize(vectorLength, numPairs);
  const allResults = new Float32Array(numPairs);
  let totalTime = 0;
  let totalExecutionTime = 0;
  let chunksProcessed = 0;

  //console.log(`📊 Splitting workload: ${numPairs} pairs → ${Math.ceil(numPairs / chunkSize)} chunks of ≤${chunkSize} pairs`);

  for (let startPair = 0; startPair < numPairs; startPair += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, numPairs - startPair);
    const startIdx = startPair * vectorLength;
    const endIdx = startIdx + currentChunkSize * vectorLength;

    // Zero-copy chunk extraction using subarray
    const chunkA = vectorsA.subarray(startIdx, endIdx);
    const chunkB = vectorsB.subarray(startIdx, endIdx);

    //console.log(`🔄 Processing chunk ${chunksProcessed + 1}: pairs ${startPair}-${startPair + currentChunkSize - 1}`);

    // Process chunk using zero-copy function
    const chunkResult = processingFunction(
      chunkA,
      chunkB,
      vectorLength,
      currentChunkSize,
    );

    // Copy results to main array and accumulate timing
    allResults.set(chunkResult.results, startPair);
    totalExecutionTime += chunkResult.executionTime;
    totalTime += chunkResult.executionTime;

    chunksProcessed++;

    // Small delay to prevent blocking the event loop for very large workloads
    if (chunksProcessed % 10 === 0) {
      //await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return {
    results: allResults,
    totalTime,
    executionTime: totalExecutionTime,
    chunksProcessed,
  };
}

/**
 * Process batch dot product with automatic method selection (direct vs chunked)
 * If vectorLength is not provided, structure will be inferred automatically
 * If numPairs is not provided, it will be calculated from the array length and vectorLength
 */
export async function dotProductFlat(
  vectorsAConcatenated: Float32Array,
  vectorsBConcatenated: Float32Array,
  vectorLength: number,
  numPairs: number,
): Promise<DotProductResult> {
  if (!wasmInstance) {
    throw new Error("WASM not initialized");
  }

  console.log(
    `🎯 Processing batch dot product: vectorLength=${vectorLength}, numPairs=${numPairs}`,
  );

  // Validate input arrays
  const totalElements = vectorLength * numPairs;
  if (
    vectorsAConcatenated.length !== totalElements ||
    vectorsBConcatenated.length !== totalElements
  ) {
    throw new Error(
      `Input array size mismatch: expected ${totalElements} elements, got A=${vectorsAConcatenated.length}, B=${vectorsBConcatenated.length}`,
    );
  }

  // Choose processing method based on memory constraints
  const canFitDirectly = canFitInMemory(vectorLength, numPairs);
  let results: Float32Array;
  let totalTime: number;
  let executionTime: number;
  let processingMethod: "direct" | "chunked";
  let chunksProcessed: number | undefined;

  if (canFitDirectly) {
    console.log("💾 Using direct processing (fits in memory)");
    processingMethod = "direct";

    // Allocate memory directly in WASM heap - zero copy approach
    const totalElements = vectorLength * numPairs;

    // Allocate WASM heap memory
    const aPtr = alloc_f32_array(totalElements);
    const bPtr = alloc_f32_array(totalElements);
    const resultsPtr = alloc_f32_array(numPairs);

    try {
      // Get WASM memory and create views
      const memory = get_memory();
      const memoryBuffer = new Float32Array(memory.buffer);

      // Calculate byte offsets (f32 = 4 bytes)
      const aPtrOffset = aPtr / 4;
      const bPtrOffset = bPtr / 4;
      const resultsPtrOffset = resultsPtr / 4;

      // Create views directly into WASM memory
      const aView = memoryBuffer.subarray(
        aPtrOffset,
        aPtrOffset + totalElements,
      );
      const bView = memoryBuffer.subarray(
        bPtrOffset,
        bPtrOffset + totalElements,
      );
      const resultsView = memoryBuffer.subarray(
        resultsPtrOffset,
        resultsPtrOffset + numPairs,
      );      // Copy data directly into WASM heap (single copy operation)
      aView.set(vectorsAConcatenated);
      bView.set(vectorsBConcatenated);

      // Perform computation entirely in WASM heap - zero copy!
      const startTime = performance.now();
      batch_dot_product_zero_copy(
        aPtr,
        bPtr,
        resultsPtr,
        vectorLength,
        numPairs,
      );
      const endTime = performance.now();

      // Read results directly from WASM heap memory
      results = new Float32Array(resultsView);
      
      // Calculate timing
      totalTime = endTime - startTime;
      executionTime = totalTime; // For zero-copy, execution time = total time
    } finally {
      // Always deallocate WASM memory to prevent leaks
      dealloc_f32_array(aPtr, totalElements);
      dealloc_f32_array(bPtr, totalElements);
      dealloc_f32_array(resultsPtr, numPairs);
    }
  } else {
    console.log(
      "🔄 Using chunked processing (too large for direct processing)",
    );
    processingMethod = "chunked";

    const chunkResult = await processWorkloadInChunks(
      vectorsAConcatenated,
      vectorsBConcatenated,
      vectorLength,
      numPairs,
      processChunkZeroCopy,
    );

    results = chunkResult.results;
    totalTime = chunkResult.totalTime;
    executionTime = chunkResult.executionTime;
    chunksProcessed = chunkResult.chunksProcessed;
  }

  console.log(`✅ ${processingMethod.toUpperCase()} processing completed!`);

  // STEP 3: Verify results against native JS (same verification logic)
  const firstVectorA = vectorsAConcatenated.subarray(0, vectorLength);
  const firstVectorB = vectorsBConcatenated.subarray(0, vectorLength);
  const lastStart = (numPairs - 1) * vectorLength;
  const lastVectorA = vectorsAConcatenated.subarray(
    lastStart,
    lastStart + vectorLength,
  );
  const lastVectorB = vectorsBConcatenated.subarray(
    lastStart,
    lastStart + vectorLength,
  );

  const firstExpected = nativeDotProduct(firstVectorA, firstVectorB);
  const lastExpected = nativeDotProduct(lastVectorA, lastVectorB);

  const firstActual = results[0];
  const lastActual = results[numPairs - 1];

  console.log(
    `🔍 Verification - First: ${Math.abs(firstActual - firstExpected) < 0.001 ? "✅" : "❌"} (${firstActual.toFixed(3)} vs ${firstExpected.toFixed(3)})`,
  );
  console.log(
    `🔍 Verification - Last: ${Math.abs(lastActual - lastExpected) < 0.001 ? "✅" : "❌"} (${lastActual.toFixed(3)} vs ${lastExpected.toFixed(3)})`,
  );  // STEP 4: Calculate performance metrics using real timing data
  const totalFlops = numPairs * vectorLength * 2;
  const memoryMB = (totalElements * 2 * 4) / (1024 * 1024);
  
  // Calculate GFLOPS from actual timing
  const gflops = totalTime > 0 ? totalFlops / (totalTime * 1_000_000) : 0;
  const memoryEfficiency = memoryMB > 0 ? gflops / memoryMB : 0;

  console.log(`⚡ Performance: ${gflops.toFixed(2)} GFLOPS`);
  console.log(`📊 Memory efficiency: ${memoryEfficiency.toFixed(3)} GFLOPS/MB`);
  console.log(`⏱️ Total time: ${totalTime.toFixed(2)}ms`);
  if (chunksProcessed) {
    console.log(`🔄 Chunks processed: ${chunksProcessed}`);
  }

  return {
    totalTime,
    executionTime,
    gflops,
    memoryEfficiency,
    results,
    processingMethod,
    chunksProcessed,
  };
}

/**
 * Process dot products for arrays of vectors (cleaner API)
 * This function automatically determines vectorLength and numPairs from the input arrays
 */
export async function dotProduct(
  vectorsA: Array<Float32Array>,
  vectorsB: Array<Float32Array>,
): Promise<DotProductResult> {
  // Validate input arrays
  if (vectorsA.length !== vectorsB.length) {
    throw new Error(
      `Array length mismatch: vectorsA has ${vectorsA.length} vectors, vectorsB has ${vectorsB.length} vectors`,
    );
  }

  if (vectorsA.length === 0) {
    throw new Error("Cannot process empty vector arrays");
  }

  // Determine structure from the arrays
  const numPairs = vectorsA.length;
  const vectorLength = vectorsA[0].length;

  // Validate all vectors have the same length
  for (let i = 0; i < vectorsA.length; i++) {
    if (vectorsA[i].length !== vectorLength) {
      throw new Error(
        `Vector length mismatch in vectorsA[${i}]: expected ${vectorLength}, got ${vectorsA[i].length}`,
      );
    }
    if (vectorsB[i].length !== vectorLength) {
      throw new Error(
        `Vector length mismatch in vectorsB[${i}]: expected ${vectorLength}, got ${vectorsB[i].length}`,
      );
    }
  }

  console.log(
    `🎯 Processing dot products: ${numPairs} pairs of ${vectorLength}-dimensional vectors`,
  );

  // Convert arrays of vectors to concatenated arrays
  const vectorsAConcatenated = new Float32Array(numPairs * vectorLength);
  const vectorsBConcatenated = new Float32Array(numPairs * vectorLength);

  for (let i = 0; i < numPairs; i++) {
    const startIdx = i * vectorLength;
    vectorsAConcatenated.set(vectorsA[i], startIdx);
    vectorsBConcatenated.set(vectorsB[i], startIdx);
  }

  // Call the existing implementation
  const result = await dotProductFlat(
    vectorsAConcatenated,
    vectorsBConcatenated,
    vectorLength,
    numPairs,
  );

  // Return result without inferredStructure (since we explicitly know the structure)
  return {
    totalTime: result.totalTime,
    executionTime: result.executionTime,
    gflops: result.gflops,
    memoryEfficiency: result.memoryEfficiency,
    results: result.results,
    processingMethod: result.processingMethod,
    chunksProcessed: result.chunksProcessed,
  };
}
