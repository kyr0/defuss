import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import { initWasm, batchDotProductZeroCopy, batchDotProductCStyle } from "./vector.js";

describe("Ultra-Optimized Performance Test", () => {
  beforeAll(async () => {
    await initWasm();
  });

  it("should test multiple sizes to find optimal performance", async () => {
    console.log("🚀 Performance Analysis Across Batch Sizes");

    const vectorLength = 1024;
    const testSizes = [1000, 5000, 10000, 25000]; // Reduced sizes to avoid hanging
    
    for (const numPairs of testSizes) {
      console.log(`\n📊 Testing ${vectorLength}D × ${numPairs} operations`);
      
      // Generate test data
      const totalElements = vectorLength * numPairs;
      const vectorsA = new Float32Array(totalElements);
      const vectorsB = new Float32Array(totalElements);
      
      // Fill with random data
      for (let i = 0; i < totalElements; i++) {
        vectorsA[i] = Math.random();
        vectorsB[i] = Math.random();
      }

      const bench = new Bench({ time: 500, iterations: 2 }); // Reduced time to avoid hanging

      bench.add(`${numPairs}`, () => {
        batchDotProductZeroCopy(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
          false
        );
      });

      await bench.run();

      // Print performance results
      bench.tasks.forEach((task) => {
        if (task.result?.hz) {
          const flopsPerCall = numPairs * vectorLength * 2;
          const gflops = (task.result.hz * flopsPerCall) / 1e9;
          const msPerOp = (1000 / task.result.hz);
          
          console.log(`  ${gflops.toFixed(2)} GFLOPS (${msPerOp.toFixed(1)}ms)`);
          
          if (msPerOp <= 35) {
            console.log(`  🎯 TARGET ACHIEVED! (${msPerOp.toFixed(1)}ms ≤ 35ms)`);
          } else {
            const speedupNeeded = ((msPerOp / 35 - 1) * 100).toFixed(0);
            console.log(`  📈 Need ${speedupNeeded}% speedup for 35ms target`);
          }
        } else {
          console.log(`  ❌ FAILED or TIMEOUT`);
        }
      });
    }
    
    // Test 100K separately with very short time to see if it works at all
    console.log(`\n📊 Testing 100K pairs (quick test)`);
    try {
      const totalElements = vectorLength * 100000;
      const vectorsA = new Float32Array(totalElements);
      const vectorsB = new Float32Array(totalElements);
      
      for (let i = 0; i < totalElements; i++) {
        vectorsA[i] = Math.random();
        vectorsB[i] = Math.random();
      }
      
      const start = performance.now();
      const result = batchDotProductZeroCopy(vectorsA, vectorsB, vectorLength, 100000, false);
      const elapsed = performance.now() - start;
      
      const gflops = (100000 * vectorLength * 2) / (elapsed * 1e6);
      console.log(`  Single run: ${gflops.toFixed(2)} GFLOPS (${elapsed.toFixed(1)}ms)`);
      
      if (elapsed <= 35) {
        console.log(`  🎯 TARGET ACHIEVED! (${elapsed.toFixed(1)}ms ≤ 35ms)`);
      } else {
        const speedupNeeded = ((elapsed / 35 - 1) * 100).toFixed(0);
        console.log(`  📈 Need ${speedupNeeded}% speedup for 35ms target`);
      }
      
      console.log(`  ✅ Result sample: ${result[0].toFixed(6)}`);
    } catch (error) {
      console.log(`  ❌ 100K test failed: ${error}`);
    }
  });
});
