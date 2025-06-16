import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import { initWasm, batchDotProductZeroCopy } from "./vector.js";

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

      console.log(`Memory needed: ${(totalElements * 2 * 4 / 1024 / 1024).toFixed(2)} MB`);

      const bench = new Bench({ time: 1000, iterations: 3 });

      bench
        .add(`Sequential ${numPairs}`, () => {
          batchDotProductZeroCopy(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            false // useParallel = false
          );
        })
        .add(`Parallel ${numPairs}`, () => {
          batchDotProductZeroCopy(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true // useParallel = true
          );
        });

      await bench.run();

      // Print performance results
      console.log("Results:");
      bench.tasks.forEach((task) => {
        if (task.result?.hz) {
          const flopsPerCall = numPairs * vectorLength * 2; // multiply + add per element
          const gflops = (task.result.hz * flopsPerCall) / 1e9;
          const msPerOp = (1000 / task.result.hz);
          
          console.log(`  ${task.name}: ${gflops.toFixed(2)} GFLOPS (${msPerOp.toFixed(1)}ms per batch)`);
        } else {
          console.log(`  ${task.name}: FAILED - no result`);
        }
      });

      // Verify correctness by comparing results
      const seqResult = batchDotProductZeroCopy(vectorsA, vectorsB, vectorLength, numPairs, false);
      const parResult = batchDotProductZeroCopy(vectorsA, vectorsB, vectorLength, numPairs, true);
      
      // Check if first few results match (should be identical)
      const maxCheck = Math.min(5, numPairs);
      let allMatch = true;
      for (let i = 0; i < maxCheck; i++) {
        if (Math.abs(seqResult[i] - parResult[i]) > 1e-5) {
          allMatch = false;
          break;
        }
      }
      
      console.log(`  Results match: ${allMatch} (seq[0]: ${seqResult[0].toFixed(6)}, par[0]: ${parResult[0].toFixed(6)})`);
      
      if (!allMatch) {
        console.log("❌ Results don't match! Sequential vs Parallel discrepancy detected.");
        for (let i = 0; i < maxCheck; i++) {
          console.log(`    [${i}]: seq=${seqResult[i].toFixed(6)}, par=${parResult[i].toFixed(6)}, diff=${Math.abs(seqResult[i] - parResult[i]).toFixed(8)}`);
        }
      } else {
        console.log("✅ Sequential and Parallel results match perfectly.");
      }
    }
  });
});
