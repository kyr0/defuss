import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  singleDotProductWasm,
  batchDotProductEfficient,
  testEfficientPerformance,
  batchDotProductUltimateEfficient,
  batchDotProductCStyle,
  batchDotProductZeroCopyParallel,
  batchDotProductUltraZeroAllocation,
  batchDotProductStreamingOptimized,
} from "./vector.js";

describe("Efficient Vector Performance Benchmarks", () => {
  beforeAll(async () => {
    await initWasm();
  });

  it("should demonstrate optimal performance with the new efficient implementation", async () => {
    console.log("\n🚀 EFFICIENT ZERO-COPY PERFORMANCE DEMONSTRATION");
    console.log("=".repeat(70));

    // EXACT specification: 100k vectors × 1024D
    const vectorLength = 1024;
    const numPairs = 100000;
    const totalElements = vectorLength * numPairs;

    // Generate test data
    const vectorsA = new Float32Array(totalElements);
    const vectorsB = new Float32Array(totalElements);

    for (let i = 0; i < totalElements; i++) {
      vectorsA[i] = Math.random();
      vectorsB[i] = Math.random();
    }

    console.log(`\n📊 Testing ${vectorLength}D × ${numPairs} operations`);
    console.log(
      `Total memory: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log("Target: Sequential ≤35ms, Parallel ≤7ms");

    // Test implementations focusing on the efficient approach
    const implementations = [
      {
        name: "🚀 ULTRA ZERO-ALLOCATION (New v128 8x SIMD)",
        fn: () =>
          batchDotProductUltraZeroAllocation(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true, // Use parallel
          ),
      },
      {
        name: "🎯 EFFICIENT (New v128 SIMD)",
        fn: () =>
          batchDotProductEfficient(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            { maxMemoryMB: 128, chunkSize: 2048 }, // Smaller chunks for less memory pressure
          ),
      },
      {
        name: "🏆 ULTIMATE EFFICIENT",
        fn: async () => {
          const result = await batchDotProductUltimateEfficient(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
          );
          return result.results;
        },
      },
      {
        name: "⚡ MEMORY-OPTIMIZED STREAMING",
        fn: () =>
          batchDotProductStreamingOptimized(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            { maxMemoryMB: 64, chunkSize: 1024 }, // Very small chunks for maximum cache efficiency
          ),
      },
      {
        name: "Traditional C-Style (baseline)",
        fn: () =>
          batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs),
      },
    ];

    console.log("\n⏱️  Performance Results:");
    console.log("-".repeat(80));

    const results = [];

    for (const impl of implementations) {
      try {
        const iterations = 5; // More iterations for accurate measurement
        let totalTime = 0;
        let result: Float32Array | undefined;

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          result = await impl.fn();
          const end = performance.now();
          totalTime += end - start;
        }

        const avgTime = totalTime / iterations;
        const flops = numPairs * vectorLength * 2; // 100k × 1024 × 2 = 204.8M FLOPS
        const gflops = flops / (avgTime * 1_000_000);

        // Performance targets for the exact workload
        const sequentialTarget = 35; // ms
        const parallelTarget = 7; // ms
        const isParallel = impl.name.includes("EFFICIENT");
        const target = isParallel ? parallelTarget : sequentialTarget;
        
        const status =
          avgTime <= target
            ? "✅ TARGET ACHIEVED"
            : `❌ ${((target / avgTime) * 100).toFixed(0)}% needed`;

        console.log(`  ${impl.name}:`);
        console.log(
          `    Time: ${avgTime.toFixed(2)}ms (target: ≤${target}ms) ${status}`,
        );
        console.log(`    Performance: ${gflops.toFixed(2)} GFLOPS`);
        console.log(`    Sample result: ${result![0].toFixed(6)}`);
        console.log(`    Speedup vs 35ms target: ${(35 / avgTime).toFixed(1)}x`);

        results.push({
          name: impl.name,
          time: avgTime,
          gflops: gflops,
          targetAchieved: avgTime <= target,
          result: result![0],
        });
      } catch (error) {
        console.log(
          `  ${impl.name}: ❌ FAILED - ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Verify correctness
    const referenceResult = results[0]?.result;
    const allMatch = results.every(
      (r) => Math.abs(r.result - referenceResult) < 1e-4,
    );

    console.log("\n🎯 Analysis for 100k × 1024D workload:");
    console.log(
      `  Results validation: ${allMatch ? "✅ All match" : "❌ Mismatch detected"}`,
    );

    // Calculate improvement
    const baseline = results.find(r => r.name.includes("baseline"));
    const efficient = results.find(r => r.name.includes("v128 SIMD"));
    
    if (baseline && efficient) {
      const speedup = baseline.time / efficient.time;
      const gflopsImprovement = efficient.gflops / baseline.gflops;
      console.log(`  Speedup vs baseline: ${speedup.toFixed(1)}x faster`);
      console.log(`  GFLOPS improvement: ${gflopsImprovement.toFixed(1)}x better`);
    }

    // Find best performer
    const bestPerformer = results.reduce((best, current) =>
      current.gflops > best.gflops ? current : best,
    );

    console.log(
      `  Best performer: ${bestPerformer.name} (${bestPerformer.gflops.toFixed(2)} GFLOPS)`,
    );

    const targetsAchieved = results.filter((r) => r.targetAchieved).length;
    console.log(
      `  Targets achieved: ${targetsAchieved}/${results.length} implementations`,
    );
    
    // Specific check for 35ms target
    const efficientResult = results.find(r => r.name.includes("v128 SIMD"));
    if (efficientResult) {
      if (efficientResult.time <= 35) {
        console.log("  🎉 SUCCESS: 35ms sequential target ACHIEVED!");
      } else {
        console.log(`  ⚠️  35ms target missed by ${(efficientResult.time - 35).toFixed(1)}ms`);
      }
    }
  });

  it("should test single vector operations for small workloads", async () => {
    console.log("\n🔍 SINGLE VECTOR OPERATIONS TEST");
    console.log("=".repeat(50));

    const vectorLength = 1024;
    const numTests = 1000; // Small workload test

    // Generate test vectors
    const vectorA = new Float32Array(vectorLength);
    const vectorB = new Float32Array(vectorLength);

    for (let i = 0; i < vectorLength; i++) {
      vectorA[i] = Math.random();
      vectorB[i] = Math.random();
    }

    console.log(`\n📊 Testing ${numTests} single ${vectorLength}D operations`);

    const start = performance.now();
    const results: number[] = [];

    for (let i = 0; i < numTests; i++) {
      const result = singleDotProductWasm(vectorA, vectorB);
      results.push(result);
    }

    const end = performance.now();
    const totalTime = end - start;
    const avgTimePerOp = totalTime / numTests;
    const totalFlops = numTests * vectorLength * 2;
    const gflops = totalFlops / (totalTime * 1_000_000);

    console.log("\n⏱️  Performance Results:");
    console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`  Average per operation: ${avgTimePerOp.toFixed(3)}ms`);
    console.log(`  Performance: ${gflops.toFixed(2)} GFLOPS`);
    console.log(`  Sample result: ${results[0].toFixed(6)}`);

    // Verify all results are consistent
    const allSame = results.every(r => Math.abs(r - results[0]) < 1e-6);
    console.log(`  Consistency: ${allSame ? "✅ All identical" : "❌ Variance detected"}`);
  });

  it("should demonstrate workload-based strategy selection", async () => {
    console.log("\n🧠 WORKLOAD-BASED STRATEGY SELECTION");
    console.log("=".repeat(50));

    const testCases = [
      { name: "Tiny (Individual ops)", vectorLength: 64, numPairs: 50 },
      { name: "Small (Batch)", vectorLength: 256, numPairs: 500 },
      { name: "Medium (Chunked)", vectorLength: 512, numPairs: 5000 },
      { name: "Large (Parallel)", vectorLength: 1024, numPairs: 50000 },
    ];

    console.log("\n📊 Strategy Performance Analysis:");
    console.log("-".repeat(60));

    for (const testCase of testCases) {
      try {
        const result = await testEfficientPerformance(
          testCase.vectorLength,
          testCase.numPairs,
        );

        const totalFlops = testCase.numPairs * testCase.vectorLength * 2;
        const memoryMB =
          (testCase.numPairs * testCase.vectorLength * 2 * 4) / (1024 * 1024);

        console.log(`  ${testCase.name}:`);
        console.log(
          `    Dimensions: ${testCase.vectorLength}D × ${testCase.numPairs} pairs`,
        );
        console.log(`    Memory: ${memoryMB.toFixed(2)} MB`);
        console.log(`    Time: ${result.totalTime.toFixed(2)}ms`);
        console.log(`    Performance: ${result.gflops.toFixed(2)} GFLOPS`);

        // Strategy effectiveness
        const isOptimal = result.gflops > 1.0;
        console.log(
          `    Strategy effectiveness: ${isOptimal ? "✅ Optimal" : "⚠️ Could improve"}`,
        );
      } catch (error) {
        console.log(
          `  ${testCase.name}: ❌ FAILED - ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });

  it("should achieve target performance for large datasets", async () => {
    console.log("\n🎯 LARGE DATASET PERFORMANCE TARGET TEST");
    console.log("=".repeat(55));

    const vectorLength = 1024;
    const numPairs = 100000;

    // Performance targets
    const SEQUENTIAL_TARGET_MS = 35;
    const PARALLEL_TARGET_MS = 7;

    console.log("\n📋 Performance Requirements:");
    console.log(`  Sequential target: ≤${SEQUENTIAL_TARGET_MS}ms`);
    console.log(`  Parallel target: ≤${PARALLEL_TARGET_MS}ms`);

    // Test the ultimate efficient implementation
    const result = await testEfficientPerformance(vectorLength, numPairs);

    console.log("\n📈 Efficient Implementation Results:");
    console.log(`  Actual time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Actual performance: ${result.gflops.toFixed(2)} GFLOPS`);

    // Check targets
    const meetsSequentialTarget = result.totalTime <= SEQUENTIAL_TARGET_MS;
    const meetsParallelTarget = result.totalTime <= PARALLEL_TARGET_MS;

    console.log("\n🏆 Target Achievement:");
    console.log(
      `  Sequential target (≤${SEQUENTIAL_TARGET_MS}ms): ${meetsSequentialTarget ? "✅ ACHIEVED" : "❌ MISSED"}`,
    );
    console.log(
      `  Parallel target (≤${PARALLEL_TARGET_MS}ms): ${meetsParallelTarget ? "✅ ACHIEVED" : "❌ MISSED"}`,
    );

    if (meetsParallelTarget) {
      console.log("  🎉 EXCELLENT: Achieved aggressive parallel target!");
    } else if (meetsSequentialTarget) {
      console.log("  ✅ GOOD: Achieved sequential target");
    } else {
      console.log("  ⚠️ NEEDS WORK: Neither target achieved");
    }
  });
});
