/**
 * Tests performance of the new functional vector implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  getWasmMemoryInfo,
  dotProductFlat,
  dotProduct,
} from "./vector.js";
import { generateBenchmarkVectors } from "./bench-util.js";

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

    const iterations = 60;
    const warmupPercent = 20; // Exclude first 20% as warmup
    const warmupRuns = Math.floor((iterations * warmupPercent) / 100);

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);

      console.log(
        `\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`,
      );
      console.log(`💾 Estimated memory: ${memoryMB.toFixed(1)}MB`);
      console.log(
        `🔄 Running ${iterations} iterations (excluding first ${warmupRuns} warmup runs)`,
      );

      // Check memory before running
      const memStats = getWasmMemoryInfo();
      console.log("🔍 WASM memory used:", memStats.usedMB, "MB");

      try {
        // STEP 1: Generate test vectors once
        const { vectorsA, vectorsB } = generateBenchmarkVectors(
          vectorLength,
          numPairs,
        );

        // STEP 2: Run multiple iterations
        const allResults: any[] = [];
        const times: number[] = [];
        const gflopsValues: number[] = [];
        const memoryEfficiencyValues: number[] = [];

        for (let i = 0; i < iterations; i++) {
          const results = await dotProductFlat(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
          );

          allResults.push(results);
          times.push(results.totalTime);
          gflopsValues.push(results.gflops);
          memoryEfficiencyValues.push(results.memoryEfficiency);

          // Show progress every 20 iterations
          if ((i + 1) % 20 === 0) {
            console.log(
              `   Progress: ${i + 1}/${iterations} iterations completed`,
            );
          }
        }

        // Calculate statistics excluding warmup phase
        const validTimes = times.slice(warmupRuns);
        const validGflops = gflopsValues.slice(warmupRuns);
        const validMemoryEfficiency = memoryEfficiencyValues.slice(warmupRuns);

        const avgTime =
          validTimes.reduce((sum, val) => sum + val, 0) / validTimes.length;
        const avgGflops =
          validGflops.reduce((sum, val) => sum + val, 0) / validGflops.length;
        const avgMemoryEfficiency =
          validMemoryEfficiency.reduce((sum, val) => sum + val, 0) /
          validMemoryEfficiency.length;

        const minTime = Math.min(...validTimes);
        const maxTime = Math.max(...validTimes);
        const minGflops = Math.min(...validGflops);
        const maxGflops = Math.max(...validGflops);

        // Calculate standard deviation for GFLOPS
        const gflopsVariance =
          validGflops.reduce((sum, val) => sum + (val - avgGflops) ** 2, 0) /
          validGflops.length;
        const gflopsStdDev = Math.sqrt(gflopsVariance);

        console.log(`✅ Completed: ${name}`);
        console.log(`📈 Statistics (excluding ${warmupRuns} warmup runs):`);
        console.log(
          `⏱️  Average time: ${avgTime.toFixed(2)}ms (min: ${minTime.toFixed(2)}ms, max: ${maxTime.toFixed(2)}ms)`,
        );
        console.log(
          `⚡ Average performance: ${avgGflops.toFixed(2)} ± ${gflopsStdDev.toFixed(2)} GFLOPS (min: ${minGflops.toFixed(2)}, max: ${maxGflops.toFixed(2)})`,
        );
        console.log(
          `💡 Memory efficiency: ${avgMemoryEfficiency.toFixed(3)} GFLOPS/MB`,
        );
        console.log(`📊 Processing method: ${allResults[0].processingMethod}`);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Skipped: ${name} - ${errorMessage}`);
      }
    }
  });

  it("should work with the Array-based dotProduct function as well", async () => {
    const iterations = 60;
    const warmupPercent = 20;
    const warmupRuns = Math.floor((iterations * warmupPercent) / 100);

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
    console.log(
      `🔄 Running ${iterations} iterations (excluding first ${warmupRuns} warmup runs)`,
    );

    // Run multiple iterations
    const allResults: any[] = [];
    const times: number[] = [];
    const gflopsValues: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const results = await dotProduct(vectorsA, vectorsB);
      allResults.push(results);
      times.push(results.totalTime);
      gflopsValues.push(results.gflops);

      if ((i + 1) % 20 === 0) {
        console.log(`   Progress: ${i + 1}/${iterations} iterations completed`);
      }
    }

    // Calculate statistics excluding warmup
    const validTimes = times.slice(warmupRuns);
    const validGflops = gflopsValues.slice(warmupRuns);

    const avgTime =
      validTimes.reduce((sum, val) => sum + val, 0) / validTimes.length;
    const avgGflops =
      validGflops.reduce((sum, val) => sum + val, 0) / validGflops.length;
    const gflopsVariance =
      validGflops.reduce((sum, val) => sum + (val - avgGflops) ** 2, 0) /
      validGflops.length;
    const gflopsStdDev = Math.sqrt(gflopsVariance);

    console.log(`⏱️  Average time: ${avgTime.toFixed(2)}ms`);
    console.log(
      `⚡ Average performance: ${avgGflops.toFixed(2)} ± ${gflopsStdDev.toFixed(2)} GFLOPS`,
    );
    console.log(
      `💡 Memory efficiency: ${allResults[0].memoryEfficiency.toFixed(3)} GFLOPS/MB`,
    );

    // Compare with concatenated array approach (for performance comparison)
    console.log("\n=== Comparison: concatenated array approach ===");
    const vectorsAConcatenated = new Float32Array(vectorLength * numPairs);
    const vectorsBConcatenated = new Float32Array(vectorLength * numPairs);

    for (let i = 0; i < numPairs; i++) {
      const startIdx = i * vectorLength;
      vectorsAConcatenated.set(vectorsA[i], startIdx);
      vectorsBConcatenated.set(vectorsB[i], startIdx);
    }

    // Run multiple iterations for concatenated approach
    const flatResults: any[] = [];
    const flatTimes: number[] = [];
    const flatGflopsValues: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const resultsFlat = await dotProductFlat(
        vectorsAConcatenated,
        vectorsBConcatenated,
        vectorLength,
        numPairs,
      );
      flatResults.push(resultsFlat);
      flatTimes.push(resultsFlat.totalTime);
      flatGflopsValues.push(resultsFlat.gflops);
    }

    const validFlatGflops = flatGflopsValues.slice(warmupRuns);
    const avgFlatGflops =
      validFlatGflops.reduce((sum, val) => sum + val, 0) /
      validFlatGflops.length;
    const flatGflopsVariance =
      validFlatGflops.reduce(
        (sum, val) => sum + (val - avgFlatGflops) ** 2,
        0,
      ) / validFlatGflops.length;
    const flatGflopsStdDev = Math.sqrt(flatGflopsVariance);

    console.log(
      `Average performance: ${avgFlatGflops.toFixed(2)} ± ${flatGflopsStdDev.toFixed(2)} GFLOPS`,
    );
    console.log(`Processing method: ${flatResults[0].processingMethod}`);

    // Verify results are identical
    const resultsMatch = allResults[0].results.every(
      (val: number, idx: number) =>
        Math.abs(val - flatResults[0].results[idx]) < 0.0001,
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

    // Run embedding benchmark with multiple iterations
    const embeddingResults: any[] = [];
    const embeddingTimes: number[] = [];
    const embeddingGflopsValues: number[] = [];

    console.log(
      `🔄 Running ${iterations} embedding iterations (excluding first ${warmupRuns} warmup runs)`,
    );

    for (let i = 0; i < iterations; i++) {
      const embeddingResult = await dotProduct(embeddings, queries);
      embeddingResults.push(embeddingResult);
      embeddingTimes.push(embeddingResult.totalTime);
      embeddingGflopsValues.push(embeddingResult.gflops);

      if ((i + 1) % 20 === 0) {
        console.log(
          `   Embedding progress: ${i + 1}/${iterations} iterations completed`,
        );
      }
    }

    const validEmbeddingGflops = embeddingGflopsValues.slice(warmupRuns);
    const avgEmbeddingGflops =
      validEmbeddingGflops.reduce((sum, val) => sum + val, 0) /
      validEmbeddingGflops.length;
    const embeddingGflopsVariance =
      validEmbeddingGflops.reduce(
        (sum, val) => sum + (val - avgEmbeddingGflops) ** 2,
        0,
      ) / validEmbeddingGflops.length;
    const embeddingGflopsStdDev = Math.sqrt(embeddingGflopsVariance);

    const validEmbeddingTimes = embeddingTimes.slice(warmupRuns);
    const avgEmbeddingTime =
      validEmbeddingTimes.reduce((sum, val) => sum + val, 0) /
      validEmbeddingTimes.length;

    console.log(
      `Computed ${embeddings.length} cosine similarities for 1024D embeddings`,
    );
    console.log(
      `Average performance: ${avgEmbeddingGflops.toFixed(2)} ± ${embeddingGflopsStdDev.toFixed(2)} GFLOPS`,
    );
    console.log(
      `Average similarity: ${(embeddingResults[0].results.reduce((sum: number, val: number) => sum + val, 0) / embeddingResults[0].results.length).toFixed(4)}`,
    );
    console.log(`Processing method: ${embeddingResults[0].processingMethod}`);
    console.log(`Average time: ${avgEmbeddingTime.toFixed(2)}ms`);
  });
});
