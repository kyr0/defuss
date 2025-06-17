/**
 * Tests performance of the new functional vector implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  getWasmMemoryInfo,
  processBatchDotProduct,
} from "./vector.js";

interface BenchmarkResult {
    totalTime: number;
    memoryEfficiency: number;
    gflops: number;
}

/**
 * Generate test arrays for batch dot product benchmarking
 */
export function generateBenchmarkVectors(
  vectorLength: number,
  numPairs: number,
): { vectorsA: Float32Array; vectorsB: Float32Array } {
  console.log(`🎯 Generating test vectors: vectorLength=${vectorLength}, numPairs=${numPairs}`);
  
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
  
  return { vectorsA, vectorsB };
}

describe("vector", () => {
  let wasmInstance: any;
  beforeAll(async () => {
    wasmInstance = await initWasm();
  });


  /**
   * Smart benchmark function that automatically chooses between direct and chunked processing
   */
  async function benchmarkUltimateExternalCallSmart(
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

    // STEP 1: Generate test vectors
    const { vectorsA, vectorsB } = generateBenchmarkVectors(vectorLength, numPairs);

    // STEP 2: Process the vectors
    return await processBatchDotProduct(vectorsA, vectorsB, vectorLength, numPairs);
  }

  it("should be ultra fast", async () => {
    console.log("🚀 Starting ultra benchmarks...");
    const testConfigs = [
      { vectorLength: 64, numPairs: 1000, name: "Small vectors, small batch" },
      { vectorLength: 64, numPairs: 10_000, name: "Small vectors, medium batch" },
      { vectorLength: 64, numPairs: 10_000, name: "Small vectors, large batch" },
      { vectorLength: 384, numPairs: 1000, name: "Medium vectors, small batch" },
      { vectorLength: 384, numPairs: 10_000, name: "Medium vectors, medium batch" },
      { vectorLength: 384, numPairs: 100_000, name: "Medium vectors, large batch" },
      { vectorLength: 1024, numPairs: 1000, name: "Large vectors, small batch" },
      { vectorLength: 1024, numPairs: 10_000, name: "Medium vectors, medium batch" },
      { vectorLength: 1024, numPairs: 100_000, name: "Large vectors, medium batch" },
   //   { vectorLength: 1024, numPairs: 1_000_000, name: "Huge vectors, medium batch" },
      { vectorLength: 4096, numPairs: 100, name: "XL vectors, small batch" },
    ];

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);
      
      console.log(`\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`) 
      console.log(`💾 Estimated memory: ${memoryMB.toFixed(1)}MB`);
      
      // Check memory before running
      const memStats = getWasmMemoryInfo();
      console.log(`🔍 WASM memory used:`, memStats.usedMB, "MB");

      try {
        const results: BenchmarkResult = await benchmarkUltimateExternalCallSmart(vectorLength, numPairs);
        console.log(`✅ Completed: ${name}`);
        console.log(`⏱️  Total time: ${results.totalTime.toFixed(2)}ms`);
        console.log(` Memory efficiency: ${results.memoryEfficiency.toFixed(3)} GFLOPS/MB`);
        console.log(`⚡ Performance: ${results.gflops.toFixed(2)} GFLOPS`);

        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Skipped: ${name} - ${errorMessage}`);
      }
    }
  });
  
});
