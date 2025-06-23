/**
 * Tests performance of the hybrid search engine implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  getWasmMemoryInfo,
  dotProductFlat,
  dotProduct,
} from "./search.js";

/**
 * Generate test arrays for batch dot product benchmarking
 */
function generateBenchmarkVectors(
  vectorLength: number,
  numPairs: number,
): { vectorsA: Float32Array; vectorsB: Float32Array } {
  console.log(
    `🎯 Generating test vectors: vectorLength=${vectorLength}, numPairs=${numPairs}`,
  );

  const totalElements = vectorLength * numPairs;
  const estimatedMemoryMB = (totalElements * 2 * 4) / (1024 * 1024); // 2 arrays, 4 bytes per float

  // Check if workload exceeds practical JavaScript memory limits (~2GB ArrayBuffer limit)
  const maxJSMemoryMB = 2000; // Conservative limit for ArrayBuffer allocation
  if (estimatedMemoryMB > maxJSMemoryMB) {
    throw new Error(
      `Workload too large for JavaScript: ${estimatedMemoryMB.toFixed(1)}MB exceeds JS ArrayBuffer limit (~${maxJSMemoryMB}MB). Consider reducing vector size or pair count.`,
    );
  }

  let vectorsA: Float32Array;
  let vectorsB: Float32Array;

  try {
    vectorsA = new Float32Array(totalElements);
    vectorsB = new Float32Array(totalElements);
  } catch (error) {
    throw new Error(
      `JavaScript memory allocation failed for ${estimatedMemoryMB.toFixed(1)}MB workload: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
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
  beforeAll(async () => {
    await initWasm();
  });

  it("should be ultra fast", async () => {
    console.log("🚀 Starting ultra benchmarks...");
    const testConfigs = [
      { vectorLength: 64, numPairs: 1000, name: "Small vectors, small batch" },
      {
        vectorLength: 64,
        numPairs: 10_000,
        name: "Small vectors, medium batch",
      },
      {
        vectorLength: 64,
        numPairs: 10_000,
        name: "Small vectors, large batch",
      },
      {
        vectorLength: 384,
        numPairs: 1000,
        name: "Medium vectors, small batch",
      },
      {
        vectorLength: 384,
        numPairs: 10_000,
        name: "Medium vectors, medium batch",
      },
      {
        vectorLength: 384,
        numPairs: 100_000,
        name: "Medium vectors, large batch",
      },
      {
        vectorLength: 1024,
        numPairs: 1000,
        name: "Large vectors, small batch",
      },
      {
        vectorLength: 1024,
        numPairs: 10_000,
        name: "Medium vectors, medium batch",
      },
      {
        vectorLength: 1024,
        numPairs: 100_000,
        name: "Large vectors, medium batch",
      },
      //   { vectorLength: 1024, numPairs: 1_000_000, name: "Huge vectors, medium batch" },
      { vectorLength: 4096, numPairs: 100, name: "XL vectors, small batch" },
    ];

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);

      console.log(
        `\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`,
      );
      console.log(`💾 Estimated memory: ${memoryMB.toFixed(1)}MB`);

      // Check memory before running
      const memStats = getWasmMemoryInfo();
      console.log("🔍 WASM memory used:", memStats.usedMB, "MB");

      try {
        // STEP 1: Generate test vectors
        const { vectorsA, vectorsB } = generateBenchmarkVectors(
          vectorLength,
          numPairs,
        );

        // STEP 2: Process the vectors
        const results = await dotProductFlat(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
        );

        console.log(`✅ Completed: ${name}`);
        console.log(`⏱️  Total time: ${results.totalTime.toFixed(2)}ms`);
        console.log(
          ` Memory efficiency: ${results.memoryEfficiency.toFixed(3)} GFLOPS/MB`,
        );
        console.log(`⚡ Performance: ${results.gflops.toFixed(2)} GFLOPS`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Skipped: ${name} - ${errorMessage}`);
      }
    }
  });

  it("should work with the Array-based dotProduct function as well", async () => {
    // Example: Create some test data as individual vectors
    const vectorLength = 1024;
    const numPairs = 100_000;

    // Create arrays of individual vectors (cleaner approach)
    const vectorsA: Float32Array[] = [];
    const vectorsB: Float32Array[] = [];

    for (let i = 0; i < numPairs; i++) {
      const vecA = new Float32Array(vectorLength);
      const vecB = new Float32Array(vectorLength);

      // Fill with test data
      for (let j = 0; j < vectorLength; j++) {
        vecA[j] = Math.random();
        vecB[j] = Math.random();
      }

      vectorsA.push(vecA);
      vectorsB.push(vecB);
    }

    console.log("=== dotProduct with arrays of vectors ===");
    const results = await dotProduct(vectorsA, vectorsB);

    console.log(`⏱️  Total time: ${results.totalTime.toFixed(2)}ms`);
    console.log(
      ` Memory efficiency: ${results.memoryEfficiency.toFixed(3)} GFLOPS/MB`,
    );
    console.log(`⚡ Performance: ${results.gflops.toFixed(2)} GFLOPS`);

    // Compare with concatenated array approach (for performance comparison)
    console.log("\n=== Comparison: concatenated array approach ===");
    const vectorsAConcatenated = new Float32Array(vectorLength * numPairs);
    const vectorsBConcatenated = new Float32Array(vectorLength * numPairs);

    for (let i = 0; i < numPairs; i++) {
      const startIdx = i * vectorLength;
      vectorsAConcatenated.set(vectorsA[i], startIdx);
      vectorsBConcatenated.set(vectorsB[i], startIdx);
    }

    const resultsFlat = await dotProductFlat(
      vectorsAConcatenated,
      vectorsBConcatenated,
      vectorLength,
      numPairs,
    );
    console.log(`Performance: ${resultsFlat.gflops.toFixed(2)} GFLOPS`);
    console.log(`Processing method: ${resultsFlat.processingMethod}`);

    // Verify results are identical
    const resultsMatch = results.results.every(
      (val, idx) => Math.abs(val - resultsFlat.results[idx]) < 0.0001,
    );
    console.log(`Results match: ${resultsMatch ? "✅" : "❌"}`);

    console.log("\n=== Example with embedding vectors ===");

    // Create example embeddings (like BERT)
    const embeddings: Float32Array[] = [];
    const queries: Float32Array[] = [];

    for (let i = 0; i < numPairs; i++) {
      const embedding = new Float32Array(1024); // BERT-like dimensions
      const query = new Float32Array(1024);

      // Fill with normalized random vectors
      let normA = 0;
      let normB = 0;
      for (let j = 0; j < 1024; j++) {
        embedding[j] = Math.random() - 0.5;
        query[j] = Math.random() - 0.5;
        normA += embedding[j] * embedding[j];
        normB += query[j] * query[j];
      }

      // Normalize vectors
      normA = Math.sqrt(normA);
      normB = Math.sqrt(normB);
      for (let j = 0; j < 1024; j++) {
        embedding[j] /= normA;
        query[j] /= normB;
      }

      embeddings.push(embedding);
      queries.push(query);
    }

    const embeddingResult = await dotProduct(embeddings, queries);
    console.log(
      `Computed ${embeddings.length} cosine similarities for 1024D embeddings`,
    );
    console.log(`Performance: ${embeddingResult.gflops.toFixed(2)} GFLOPS`);
    console.log(
      `Average similarity: ${(embeddingResult.results.reduce((sum, val) => sum + val, 0) / embeddingResult.results.length).toFixed(4)}`,
    );
    console.log(`Processing method: ${embeddingResult.processingMethod}`);
    console.log(`Total time: ${embeddingResult.totalTime.toFixed(2)}ms`);
  });
});
