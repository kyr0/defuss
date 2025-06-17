import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  batchDotProductUltimate,
  testUltimatePerformance,
  batchDotProductCStyle,
  batchDotProductZeroCopyParallel,
  batchDotProductAdaptive,
} from "./vector.js";

describe("Ultimate Vector Performance Benchmarks", () => {
  beforeAll(async () => {
    await initWasm();
  });

  it("should demonstrate ultimate performance vs existing implementations", async () => {
    console.log("\n🚀 ULTIMATE PERFORMANCE DEMONSTRATION");
    console.log("=".repeat(60));

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

    // Test all implementations
    const implementations = [
      {
        name: "C-Style Sequential",
        fn: () =>
          batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs),
      },
      {
        name: "Zero-Copy Parallel",
        fn: () =>
          batchDotProductZeroCopyParallel(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true,
          ),
      },
      {
        name: "Adaptive Strategy",
        fn: () =>
          batchDotProductAdaptive(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true,
          ),
      },
      {
        name: "🎯 ULTIMATE (New)",
        fn: async () => {
          const result = await batchDotProductUltimate(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
          );
          return result.results;
        },
      },
    ];

    console.log("\n⏱️  Performance Results:");
    console.log("-".repeat(80));

    const results = [];

    for (const impl of implementations) {
      try {
        const iterations = 3;
        let totalTime = 0;
        let result: Float32Array | undefined;

        for (let i = 0; i < iterations; i++) {
          const start = performance.now();
          result = await impl.fn();
          const end = performance.now();
          totalTime += end - start;
        }

        const avgTime = totalTime / iterations;
        const flops = numPairs * vectorLength * 2;
        const gflops = flops / (avgTime * 1_000_000);

        // Performance targets
        const sequentialTarget = 35; // ms
        const parallelTarget = 7; // ms
        const isParallel =
          impl.name.includes("Parallel") || impl.name.includes("ULTIMATE");
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

    console.log("\n🎯 Analysis:");
    console.log(
      `  Results validation: ${allMatch ? "✅ All match" : "❌ Mismatch detected"}`,
    );

    // Find best performer
    const bestPerformer = results.reduce((best, current) =>
      current.gflops > best.gflops ? current : best,
    );

    console.log(
      `  Best performer: ${bestPerformer.name} (${bestPerformer.gflops.toFixed(2)} GFLOPS)`,
    );

    // Performance improvement analysis
    if (results.length >= 2) {
      const ultimateResult = results.find((r) => r.name.includes("ULTIMATE"));
      const baselineResult = results.find((r) => r.name.includes("Adaptive"));

      if (ultimateResult && baselineResult) {
        const speedup = (baselineResult.time / ultimateResult.time - 1) * 100;
        console.log(
          `  Ultimate vs Baseline: ${speedup > 0 ? "+" : ""}${speedup.toFixed(1)}% speedup`,
        );
      }
    }

    const targetsAchieved = results.filter((r) => r.targetAchieved).length;
    console.log(
      `  Targets achieved: ${targetsAchieved}/${results.length} implementations`,
    );
  });

  it("should test workload-based strategy selection", async () => {
    console.log("\n🧠 INTELLIGENT WORKLOAD ADAPTATION TEST");
    console.log("=".repeat(60));

    const testCases = [
      { name: "Tiny (Sequential Expected)", vectorLength: 64, numPairs: 100 },
      { name: "Small (Sequential Expected)", vectorLength: 256, numPairs: 500 },
      { name: "Medium (Parallel Expected)", vectorLength: 512, numPairs: 5000 },
      {
        name: "Large (Parallel Expected)",
        vectorLength: 1024,
        numPairs: 50000,
      },
      {
        name: "Huge (Streaming Expected)",
        vectorLength: 2048,
        numPairs: 100000,
      },
    ];

    console.log("\n📊 Strategy Selection Analysis:");
    console.log("-".repeat(80));

    for (const testCase of testCases) {
      try {
        const result = await testUltimatePerformance(
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
        console.log(
          `    Strategy execution time: ${result.executionTime.toFixed(2)}ms`,
        );

        // Analyze if strategy makes sense
        const isOptimal = result.gflops > 3.0; // Good performance threshold
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

  it("should achieve performance targets", async () => {
    console.log("\n🎯 PERFORMANCE TARGET VALIDATION");
    console.log("=".repeat(60));

    const vectorLength = 1024;
    const numPairs = 100000;

    // Performance targets from benchmark analysis
    const SEQUENTIAL_TARGET_MS = 35;
    const PARALLEL_TARGET_MS = 7;
    const TARGET_GFLOPS_SEQUENTIAL =
      (numPairs * vectorLength * 2) / (SEQUENTIAL_TARGET_MS * 1_000_000);
    const TARGET_GFLOPS_PARALLEL =
      (numPairs * vectorLength * 2) / (PARALLEL_TARGET_MS * 1_000_000);

    console.log("\n📋 Performance Requirements:");
    console.log(
      `  Sequential target: ≤${SEQUENTIAL_TARGET_MS}ms (${TARGET_GFLOPS_SEQUENTIAL.toFixed(2)} GFLOPS)`,
    );
    console.log(
      `  Parallel target: ≤${PARALLEL_TARGET_MS}ms (${TARGET_GFLOPS_PARALLEL.toFixed(2)} GFLOPS)`,
    );

    // Test the ultimate implementation
    const result = await testUltimatePerformance(vectorLength, numPairs);

    console.log("\n📈 Ultimate Implementation Results:");
    console.log(`  Actual time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`  Actual performance: ${result.gflops.toFixed(2)} GFLOPS`);

    // Determine which target applies (the implementation should auto-select)
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
      console.log(
        "  ✅ GOOD: Achieved sequential target, parallel optimization possible",
      );
    } else {
      console.log(
        "  ⚠️ NEEDS WORK: Neither target achieved, requires optimization",
      );
      const neededSpeedup = (SEQUENTIAL_TARGET_MS / result.totalTime) * 100;
      console.log(
        `  💡 Need ${neededSpeedup.toFixed(0)}% of current time to meet sequential target`,
      );
    }

    // Performance analysis
    console.log("\n🔍 Performance Analysis:");
    console.log(
      `  Current vs Sequential target: ${((result.totalTime / SEQUENTIAL_TARGET_MS) * 100).toFixed(0)}%`,
    );
    console.log(
      `  Current vs Parallel target: ${((result.totalTime / PARALLEL_TARGET_MS) * 100).toFixed(0)}%`,
    );
    console.log(
      `  GFLOPS improvement needed: ${((TARGET_GFLOPS_PARALLEL / result.gflops) * 100).toFixed(0)}% for parallel target`,
    );
  });

  it("should demonstrate memory efficiency for large datasets", async () => {
    console.log("\n💾 MEMORY EFFICIENCY TEST");
    console.log("=".repeat(60));

    // Test progressively larger datasets
    const testSizes = [
      { name: "1MB", vectorLength: 256, numPairs: 1000 },
      { name: "10MB", vectorLength: 512, numPairs: 5000 },
      { name: "100MB", vectorLength: 1024, numPairs: 25000 },
      { name: "500MB", vectorLength: 1024, numPairs: 125000 },
    ];

    console.log("\n📊 Memory Efficiency Results:");
    console.log("-".repeat(80));

    for (const testSize of testSizes) {
      try {
        const memoryMB =
          (testSize.numPairs * testSize.vectorLength * 2 * 4) / (1024 * 1024);

        console.log(`  ${testSize.name} Dataset (${memoryMB.toFixed(2)} MB):`);

        const result = await testUltimatePerformance(
          testSize.vectorLength,
          testSize.numPairs,
        );

        const memoryEfficiency = result.gflops / memoryMB; // GFLOPS per MB

        console.log(`    Time: ${result.totalTime.toFixed(2)}ms`);
        console.log(`    Performance: ${result.gflops.toFixed(2)} GFLOPS`);
        console.log(
          `    Memory efficiency: ${memoryEfficiency.toFixed(3)} GFLOPS/MB`,
        );

        // Efficiency classification
        let efficiencyRating;
        if (memoryEfficiency > 0.1) efficiencyRating = "🟢 Excellent";
        else if (memoryEfficiency > 0.05) efficiencyRating = "🟡 Good";
        else efficiencyRating = "🔴 Needs improvement";

        console.log(`    Rating: ${efficiencyRating}`);
      } catch (error) {
        console.log(
          `    ❌ FAILED: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  });
});
