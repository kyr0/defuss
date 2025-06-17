import init, { initThreadPool, batch_dot_product_ultimate_external  } from "../pkg/defuss_fastmath.js";

// Global WASM instance state
let wasmInitialized = false;
let wasmInstance: any;

/**
 * Initialize WASM module for ultimate performance operations
 * Must be called before using any ultimate performance functions
 */
export async function initWasm(): Promise<void> {
  if (!wasmInitialized) {
    wasmInstance = await init();
    await initThreadPool(navigator.hardwareConcurrency || 8); // Use available cores or default to 4
    wasmInitialized = true;
  }
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
    totalMB
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
  MAX_SAFE_ELEMENTS: 8_000_000,      // 32MB for a+b data (conservative WASM limit)
  OPTIMAL_CHUNK_ELEMENTS: 2_000_000,  // 8MB optimal chunk size
  MIN_CHUNK_PAIRS: 100,               // Don't split below this threshold
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
function calculateOptimalChunkSize(vectorLength: number, numPairs: number): number {
  const elementsPerPair = vectorLength * 2;
  const maxPairsPerChunk = Math.floor(MEMORY_CONFIG.OPTIMAL_CHUNK_ELEMENTS / elementsPerPair);
  return Math.max(MEMORY_CONFIG.MIN_CHUNK_PAIRS, Math.min(numPairs, maxPairsPerChunk));
}

/**
 * Intelligent workload splitting with zero-copy chunk processing
 */
async function processWorkloadInChunks(
  vectorsA: Float32Array,
  vectorsB: Float32Array,
  vectorLength: number,
  numPairs: number,
  processingFunction: (a: Float32Array, b: Float32Array, vlen: number, npairs: number) => any
): Promise<{
  results: Float32Array;
  totalTime: number;
  executionTime: number;
  chunksProcessed: number;
}> {
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
    
    // Process chunk
    const chunkResult = processingFunction(chunkA, chunkB, vectorLength, currentChunkSize);
    
    // Extract timing and results
    if (chunkResult.length >= 2 + currentChunkSize) {
      totalTime += chunkResult[0] as number;
      totalExecutionTime += chunkResult[1] as number;
      
      // Copy results to main array
      for (let i = 0; i < currentChunkSize; i++) {
        allResults[startPair + i] = chunkResult[2 + i] as number;
      }
    } else {
      throw new Error(`Chunk processing failed: expected ${2 + currentChunkSize} results, got ${chunkResult.length}`);
    }
    
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
    chunksProcessed
  };
}

/**
 * Smart benchmark function that automatically chooses between direct and chunked processing
 */
export async function benchmarkUltimateExternalCallSmart(
  vectorLength: number,
  numPairs: number,
): Promise<{
  totalTime: number;
  executionTime: number;
  gflops: number;
  memoryEfficiency: number;
  results: Float32Array;
  processingMethod: 'direct' | 'chunked';
  chunksProcessed?: number;
}> {
  if (!wasmInstance) {
    throw new Error("WASM not initialized");
  }

  console.log(`🎯 Smart processing: vectorLength=${vectorLength}, numPairs=${numPairs}`);
  
  // STEP 1: Generate workload in JavaScript with memory allocation check
  const totalElements = vectorLength * numPairs;
  const estimatedMemoryMB = (totalElements * 2 * 4) / (1024 * 1024); // 2 arrays, 4 bytes per float
  
  // Check if workload exceeds practical JavaScript memory limits (~2GB ArrayBuffer limit)
  const maxJSMemoryMB = 2000; // Conservative limit for ArrayBuffer allocation
  if (estimatedMemoryMB > maxJSMemoryMB) {
    throw new Error(`Workload too large for JavaScript: ${estimatedMemoryMB.toFixed(1)}MB exceeds JS ArrayBuffer limit (~${maxJSMemoryMB}MB). Consider reducing vector size or pair count.`);
  }
  
  let vectorsA: Float32Array;
  let vectorsB: Float32Array;
  
  try {
    vectorsA = new Float32Array(totalElements);
    vectorsB = new Float32Array(totalElements);
  } catch (error) {
    throw new Error(`JavaScript memory allocation failed for ${estimatedMemoryMB.toFixed(1)}MB workload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  // Generate test data with patterns that create verifiable results
  for (let i = 0; i < totalElements; i++) {
    vectorsA[i] = (i % vectorLength) + 1;
    vectorsB[i] = 2.0;
  }

  console.log(`📤 Generated JS workload: ${totalElements} elements`);

  // STEP 2: Choose processing method based on memory constraints
  const canFitDirectly = canFitInMemory(vectorLength, numPairs);
  let results: Float32Array;
  let totalTime: number;
  let executionTime: number;
  let processingMethod: 'direct' | 'chunked';
  let chunksProcessed: number | undefined;

  if (canFitDirectly) {
    console.log(`💾 Using direct processing (fits in memory)`);
    processingMethod = 'direct';
    
    const result = batch_dot_product_ultimate_external(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
    );

    if (result.length < 2 + numPairs) {
      throw new Error(`Unexpected result length: ${result.length}, expected at least ${2 + numPairs}`);
    }

    totalTime = result[0] as number;
    executionTime = result[1] as number;
    results = new Float32Array(numPairs);
    for (let i = 0; i < numPairs; i++) {
      results[i] = result[2 + i] as number;
    }
  } else {
    console.log(`🔄 Using chunked processing (too large for direct processing)`);
    processingMethod = 'chunked';
    
    const chunkResult = await processWorkloadInChunks(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      batch_dot_product_ultimate_external
    );
    
    results = chunkResult.results;
    totalTime = chunkResult.totalTime;
    executionTime = chunkResult.executionTime;
    chunksProcessed = chunkResult.chunksProcessed;
  }

  console.log(`✅ ${processingMethod.toUpperCase()} processing completed! Total: ${totalTime.toFixed(4)}ms, Execution: ${executionTime.toFixed(4)}ms`);

  // STEP 3: Verify results against native JS (same verification logic)
  const firstVectorA = vectorsA.subarray(0, vectorLength);
  const firstVectorB = vectorsB.subarray(0, vectorLength);
  const lastStart = (numPairs - 1) * vectorLength;
  const lastVectorA = vectorsA.subarray(lastStart, lastStart + vectorLength);
  const lastVectorB = vectorsB.subarray(lastStart, lastStart + vectorLength);

  const firstExpected = nativeDotProduct(firstVectorA, firstVectorB);
  const lastExpected = nativeDotProduct(lastVectorA, lastVectorB);

  const firstActual = results[0];
  const lastActual = results[numPairs - 1];

  console.log(`🔍 Verification - First: ${Math.abs(firstActual - firstExpected) < 0.001 ? '✅' : '❌'} (${firstActual.toFixed(3)} vs ${firstExpected.toFixed(3)})`);
  console.log(`🔍 Verification - Last: ${Math.abs(lastActual - lastExpected) < 0.001 ? '✅' : '❌'} (${lastActual.toFixed(3)} vs ${lastExpected.toFixed(3)})`);

  // STEP 4: Calculate performance metrics
  const totalFlops = numPairs * vectorLength * 2;
  const gflops = totalFlops / (totalTime * 1_000_000);
  const memoryMB = (totalElements * 2 * 4) / (1024 * 1024);
  const memoryEfficiency = gflops / memoryMB;

  console.log(`⚡ Performance: ${gflops.toFixed(2)} GFLOPS`);
  console.log(`📊 Memory efficiency: ${memoryEfficiency.toFixed(3)} GFLOPS/MB`);
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

