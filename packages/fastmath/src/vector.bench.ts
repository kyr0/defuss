import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  initWasm,
  batchDotProductZeroCopyParallel,
  batchDotProductCStyle,
} from "./vector.js";

describe("Vector Dot Product Benchmarks", () => {
  beforeAll(async () => {
    await initWasm();
  });

  it("should benchmark parallel vs sequential using TypeScript API", async () => {
    console.log("🚀 SIMD + Rayon Performance Benchmark (TypeScript API)");

    const vectorLength = 1024;
    const testSizes = [1000, 5000, 10000, 50000, 100000];

    for (const numPairs of testSizes) {
      console.log(`\n📊 Testing ${vectorLength}D × ${numPairs} operations`);

      // Generate test data using proper API
      const totalElements = vectorLength * numPairs;
      const vectorsA = new Float32Array(totalElements);
      const vectorsB = new Float32Array(totalElements);

      // Fill with random data
      for (let i = 0; i < totalElements; i++) {
        vectorsA[i] = Math.random();
        vectorsB[i] = Math.random();
      }

      console.log(
        `Memory needed: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`,
      );

      const bench = new Bench({ time: 1000, iterations: 3 });

      bench
        .add(`Sequential ${numPairs}`, () => {
          batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs);
        })
        .add(`Parallel ${numPairs}`, () => {
          batchDotProductZeroCopyParallel(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true, // useParallel = true
          );
        });

      await bench.run();

      // Print performance results
      console.log("Results:");
      bench.tasks.forEach((task) => {
        if (task.result?.hz) {
          const flopsPerCall = numPairs * vectorLength * 2; // multiply + add per element
          const gflops = (task.result.hz * flopsPerCall) / 1e9;
          const msPerOp = 1000 / task.result.hz;

          console.log(
            `  ${task.name}: ${gflops.toFixed(2)} GFLOPS (${msPerOp.toFixed(1)}ms per batch)`,
          );
        } else {
          console.log(`  ${task.name}: FAILED - no result`);
        }
      });

      // Verify correctness by comparing results
      const seqResult = batchDotProductCStyle(
        vectorsA,
        vectorsB,
        vectorLength,
        numPairs,
      );

      const parResult = batchDotProductZeroCopyParallel(
        vectorsA,
        vectorsB,
        vectorLength,
        numPairs,
        true,
      );

      // Check if first few results match (should be identical)
      const maxCheck = Math.min(5, numPairs);
      let allMatch = true;
      for (let i = 0; i < maxCheck; i++) {
        if (Math.abs(seqResult[i] - parResult[i]) > 1e-5) {
          allMatch = false;
          break;
        }
      }

      console.log(
        `  Results match: ${allMatch} (seq[0]: ${seqResult[0].toFixed(6)}, par[0]: ${parResult[0].toFixed(6)})`,
      );

      if (!allMatch) {
        console.log(
          "❌ Results don't match! Sequential vs Parallel discrepancy detected.",
        );
        for (let i = 0; i < maxCheck; i++) {
          console.log(
            `    [${i}]: seq=${seqResult[i].toFixed(6)}, par=${parResult[i].toFixed(6)}, diff=${Math.abs(seqResult[i] - parResult[i]).toFixed(8)}`,
          );
        }
      } else {
        console.log("✅ Sequential and Parallel results match perfectly.");
      }
    }
  });

  it("should measure end-to-end time for 100k operations", async () => {
    console.log("\n⏱️  End-to-End 100k Operations Timing Test");

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
      `Memory needed: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`,
    );

    // Test Sequential
    console.log("\n🔄 Sequential Implementation:");
    const seqStart = performance.now();
    const seqResult = batchDotProductCStyle(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
    );
    const seqEnd = performance.now();
    const seqTime = seqEnd - seqStart;

    const seqFlops = numPairs * vectorLength * 2; // multiply + add per element
    const seqGflops = seqFlops / (seqTime * 1e6);

    console.log(`  Time: ${seqTime.toFixed(2)}ms`);
    console.log(`  Performance: ${seqGflops.toFixed(2)} GFLOPS`);
    console.log(`  Sample result: ${seqResult[0].toFixed(6)}`);

    // Test Parallel
    console.log("\n⚡ Parallel Implementation:");
    const parStart = performance.now();
    const parResult = batchDotProductZeroCopyParallel(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      true,
    );
    const parEnd = performance.now();
    const parTime = parEnd - parStart;

    const parFlops = numPairs * vectorLength * 2;
    const parGflops = parFlops / (parTime * 1e6);

    console.log(`  Time: ${parTime.toFixed(2)}ms`);
    console.log(`  Performance: ${parGflops.toFixed(2)} GFLOPS`);
    console.log(`  Sample result: ${parResult[0].toFixed(6)}`);

    // Summary
    const speedup = (seqTime / parTime - 1) * 100;
    console.log("\n📈 Summary:");
    console.log(
      `  Sequential: ${seqTime.toFixed(2)}ms (${seqGflops.toFixed(2)} GFLOPS)`,
    );
    console.log(
      `  Parallel:   ${parTime.toFixed(2)}ms (${parGflops.toFixed(2)} GFLOPS)`,
    );
    console.log(
      `  Speedup:    ${speedup > 0 ? "+" : ""}${speedup.toFixed(1)}%`,
    );
    console.log(
      `  Results match: ${Math.abs(seqResult[0] - parResult[0]) < 1e-5 ? "✅" : "❌"}`,
    );
  });

  it("should analyze performance bottlenecks for optimization", async () => {
    console.log("\n🔍 Performance Analysis for Optimization");

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

    console.log("\n📊 Current Performance vs Targets:");
    console.log("  Target Sequential: ≤35ms");
    console.log("  Target Parallel:   ≤7ms");

    // Test current implementations
    const seqStart = performance.now();
    const seqResult = batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs);
    const seqTime = performance.now() - seqStart;

    const parStart = performance.now();
    const parResult = batchDotProductZeroCopyParallel(vectorsA, vectorsB, vectorLength, numPairs, true);
    const parTime = performance.now() - parStart;    console.log("\n⏱️  Current Performance:");
    console.log(`  Sequential: ${seqTime.toFixed(2)}ms (need ${((seqTime/35-1)*100).toFixed(0)}% speedup)`);
    console.log(`  Parallel:   ${parTime.toFixed(2)}ms (need ${((parTime/7-1)*100).toFixed(0)}% speedup)`);
    
    // Performance requirements analysis
    const seqGFLOPS = (numPairs * vectorLength * 2) / (seqTime * 1e6);
    const parGFLOPS = (numPairs * vectorLength * 2) / (parTime * 1e6);
    const targetSeqGFLOPS = (numPairs * vectorLength * 2) / (35 * 1e6);
    const targetParGFLOPS = (numPairs * vectorLength * 2) / (7 * 1e6);
    
    console.log("\n🚀 GFLOPS Analysis:");
    console.log(`  Current Sequential: ${seqGFLOPS.toFixed(2)} GFLOPS`);
    console.log(`  Target Sequential:  ${targetSeqGFLOPS.toFixed(2)} GFLOPS`);
    console.log(`  Current Parallel:   ${parGFLOPS.toFixed(2)} GFLOPS`);
    console.log(`  Target Parallel:    ${targetParGFLOPS.toFixed(2)} GFLOPS`);
    
    console.log("\n💡 Optimization Recommendations:");
    if (seqTime > 35) {
      console.log(`  ❌ Sequential needs ${((35/seqTime)*100).toFixed(0)}% of current time`);
    } else {
      console.log("  ✅ Sequential target achieved");
    }
    
    if (parTime > 7) {
      console.log(`  ❌ Parallel needs ${((7/parTime)*100).toFixed(0)}% of current time`);
      console.log("  🔧 Parallel optimization ideas:");
      console.log("     - Increase thread utilization");
      console.log("     - Reduce memory allocation overhead");
      console.log("     - Use more aggressive SIMD optimization");
      console.log("     - Reduce function call overhead");
    } else {
      console.log("  ✅ Parallel target achieved");
    }
  });
});
