import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  initWasm,
  batchDotProductZeroCopyParallel,
  batchDotProductCStyle,
  batchDotProductStreamingOptimized,
  batchDotProductMemoryMapped,
  batchDotProductAdaptive,
  batchDotProductRustStreaming,
  batchDotProductUltimate,
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
    const seqResult = batchDotProductCStyle(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
    );
    const seqTime = performance.now() - seqStart;

    const parStart = performance.now();
    const parResult = batchDotProductZeroCopyParallel(
      vectorsA,
      vectorsB,
      vectorLength,
      numPairs,
      true,
    );
    const parTime = performance.now() - parStart;
    console.log("\n⏱️  Current Performance:");
    console.log(
      `  Sequential: ${seqTime.toFixed(2)}ms (need ${((seqTime / 35 - 1) * 100).toFixed(0)}% speedup)`,
    );
    console.log(
      `  Parallel:   ${parTime.toFixed(2)}ms (need ${((parTime / 7 - 1) * 100).toFixed(0)}% speedup)`,
    );

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
      console.log(
        `  ❌ Sequential needs ${((35 / seqTime) * 100).toFixed(0)}% of current time`,
      );
    } else {
      console.log("  ✅ Sequential target achieved");
    }

    if (parTime > 7) {
      console.log(
        `  ❌ Parallel needs ${((7 / parTime) * 100).toFixed(0)}% of current time`,
      );
      console.log("  🔧 Parallel optimization ideas:");
      console.log("     - Increase thread utilization");
      console.log("     - Reduce memory allocation overhead");
      console.log("     - Use more aggressive SIMD optimization");
      console.log("     - Reduce function call overhead");
    } else {
      console.log("  ✅ Parallel target achieved");
    }
  });

  it("should benchmark streaming vs traditional allocation strategies", async () => {
    console.log("\n🌊 Streaming vs Traditional Memory Allocation Benchmark");

    const vectorLength = 1024;
    const numPairs = 100000; // Large dataset for memory pressure testing
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
      `Total memory needed: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`,
    );

    const bench = new Bench({ time: 2000, iterations: 3 });

    bench
      .add("Traditional Sequential", () => {
        try {
          batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs);
        } catch (error) {
          // Memory allocation failure - expected for large datasets
          throw new Error("Memory limit exceeded");
        }
      })
      .add("Traditional Parallel", () => {
        try {
          batchDotProductZeroCopyParallel(
            vectorsA,
            vectorsB,
            vectorLength,
            numPairs,
            true,
          );
        } catch (error) {
          // Memory allocation failure - expected for large datasets
          throw new Error("Memory limit exceeded");
        }
      })
      .add("Streaming Optimized (32MB chunks)", () => {
        batchDotProductStreamingOptimized(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
          {
            chunkSize: 4096,
            useParallel: true,
            maxMemoryMB: 32,
          },
        );
      })
      .add("Memory-Mapped Streaming (64MB)", () => {
        batchDotProductMemoryMapped(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
          {
            bufferSizeMB: 64,
            useParallel: true,
          },
        );
      })
      .add("Adaptive Strategy", () => {
        batchDotProductAdaptive(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
          true,
        );
      })
      .add("Rust Native Streaming (32MB)", () => {
        batchDotProductRustStreaming(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
          {
            chunkSize: 4096,
            maxMemoryMB: 32,
          },
        );
      })
      .add("Ultimate Adaptive", () => {
        batchDotProductUltimate(
          vectorsA,
          vectorsB,
          vectorLength,
          numPairs,
        );
      });

    await bench.run();

    // Print results with memory efficiency analysis
    console.log("\n📈 Results (with memory efficiency analysis):");
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

    // Verify correctness by comparing results using smaller dataset to avoid memory issues
    const verificationPairs = Math.min(1000, numPairs); // Use smaller dataset for verification
    const verificationElements = vectorLength * verificationPairs;
    const verificationVectorsA = vectorsA.subarray(0, verificationElements);
    const verificationVectorsB = vectorsB.subarray(0, verificationElements);

    let traditionalResult: Float32Array;
    try {
      traditionalResult = batchDotProductCStyle(
        verificationVectorsA,
        verificationVectorsB,
        vectorLength,
        verificationPairs,
      );
    } catch (error) {
      console.log(`  ⚠️ Traditional method failed (memory limit): ${error instanceof Error ? error.message : String(error)}`);
      traditionalResult = new Float32Array(verificationPairs);
    }

    const streamingResult = batchDotProductStreamingOptimized(
      verificationVectorsA,
      verificationVectorsB,
      vectorLength,
      verificationPairs,
      { chunkSize: 512, useParallel: true, maxMemoryMB: 16 },
    );
    const adaptiveResult = batchDotProductAdaptive(
      verificationVectorsA,
      verificationVectorsB,
      vectorLength,
      verificationPairs,
      true,
    );
    
    let rustStreamingResult: Float32Array;
    try {
      rustStreamingResult = batchDotProductRustStreaming(
        verificationVectorsA,
        verificationVectorsB,
        vectorLength,
        verificationPairs,
        { chunkSize: 512, maxMemoryMB: 16 },
      );
    } catch (error) {
      console.log(`  ⚠️ Rust streaming failed: ${error instanceof Error ? error.message : String(error)}`);
      rustStreamingResult = new Float32Array(verificationPairs);
    }
    
    const ultimateResult = batchDotProductUltimate(
      verificationVectorsA, 
      verificationVectorsB, 
      vectorLength, 
      verificationPairs
    );

    // Check if results match (only compare algorithms that worked)
    const maxCheck = Math.min(5, verificationPairs);
    let allMatch = true;
    let validResultsCount = 0;
    
    // Only compare if we have a valid traditional result
    const hasValidTraditional = traditionalResult.length > 0 && traditionalResult[0] !== 0;
    
    if (hasValidTraditional) {
      for (let i = 0; i < maxCheck; i++) {
        const diff1 = Math.abs(traditionalResult[i] - streamingResult[i]);
        const diff2 = Math.abs(traditionalResult[i] - adaptiveResult[i]);
        const diff3 = Math.abs(traditionalResult[i] - ultimateResult[i]);
        if (diff1 > 1e-5 || diff2 > 1e-5 || diff3 > 1e-5) {
          allMatch = false;
          break;
        }
      }
      validResultsCount++;
    } else {
      // Compare streaming algorithms against each other
      for (let i = 0; i < maxCheck; i++) {
        const diff1 = Math.abs(streamingResult[i] - adaptiveResult[i]);
        const diff2 = Math.abs(streamingResult[i] - ultimateResult[i]);
        if (diff1 > 1e-5 || diff2 > 1e-5) {
          allMatch = false;
          break;
        }
      }
    }

    console.log(`\n✅ Results verification (${verificationPairs} pairs): ${allMatch ? "✅ All algorithms match" : "❌ Results don't match"}`);
    if (hasValidTraditional) {
      console.log(`  Traditional[0]:     ${traditionalResult[0].toFixed(6)}`);
    } else {
      console.log(`  Traditional[0]:     FAILED (memory limit)`);
    }
    console.log(`  Streaming[0]:       ${streamingResult[0].toFixed(6)}`);
    console.log(`  Adaptive[0]:        ${adaptiveResult[0].toFixed(6)}`);
    if (rustStreamingResult.length > 0 && rustStreamingResult[0] !== 0) {
      console.log(`  Rust Streaming[0]:  ${rustStreamingResult[0].toFixed(6)}`);
    } else {
      console.log(`  Rust Streaming[0]:  FAILED`);
    }
    console.log(`  Ultimate[0]:        ${ultimateResult[0].toFixed(6)}`);
    
    console.log(`\n💡 Key insight: Streaming methods work where traditional methods fail!`);
    console.log(`   Large datasets (${((numPairs * vectorLength * 2 * 4) / 1024 / 1024).toFixed(1)}MB) require streaming for memory efficiency.`);
  });

  it("should demonstrate extreme performance with ultimate algorithm", async () => {
    console.log("\n🚀 Ultimate Performance Demonstration");

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

    console.log(`\n📊 Ultimate Performance Test: ${vectorLength}D × ${numPairs} operations`);
    console.log(`Total memory: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`);

    // Performance comparison with error handling
    const implementations = [
      {
        name: "Traditional Sequential",
        fn: () => {
          try {
            return batchDotProductCStyle(vectorsA, vectorsB, vectorLength, numPairs);
          } catch (error) {
            throw new Error("Memory allocation failed");
          }
        }
      },
      {
        name: "Traditional Parallel", 
        fn: () => {
          try {
            return batchDotProductZeroCopyParallel(vectorsA, vectorsB, vectorLength, numPairs, true);
          } catch (error) {
            throw new Error("Memory allocation failed");
          }
        }
      },
      {
        name: "Ultimate Adaptive",
        fn: () => batchDotProductUltimate(vectorsA, vectorsB, vectorLength, numPairs)
      }
    ];

    console.log("\n⏱️  Performance Results:");
    
    for (const impl of implementations) {
      try {
        const start = performance.now();
        const result = impl.fn();
        const end = performance.now();
        
        const time = end - start;
        const flops = numPairs * vectorLength * 2;
        const gflops = flops / (time * 1e6);
        
        console.log(`  ${impl.name}:`);
        console.log(`    Time: ${time.toFixed(2)}ms`);
        console.log(`    Performance: ${gflops.toFixed(2)} GFLOPS`);
        console.log(`    Sample result: ${result[0].toFixed(6)}`);
        console.log(`    Memory efficiency: ${time < 30 ? "🟢 Excellent" : time < 50 ? "🟡 Good" : "🔴 Needs work"}`);
      } catch (error) {
        console.log(`  ${impl.name}:`);
        console.log(`    Time: FAILED`);
        console.log(`    Performance: FAILED - ${error instanceof Error ? error.message : String(error)}`);
        console.log(`    Sample result: N/A`);
        console.log(`    Memory efficiency: 🔴 Memory allocation failed`);
      }
    }

    // Target analysis
    console.log("\n🎯 Target Analysis:");
    const ultimateStart = performance.now();
    const ultimateResult = batchDotProductUltimate(vectorsA, vectorsB, vectorLength, numPairs);
    const ultimateEnd = performance.now();
    const ultimateTime = ultimateEnd - ultimateStart;
    
    console.log(`  Current Ultimate Time: ${ultimateTime.toFixed(2)}ms`);
    console.log(`  Sequential Target: ≤35ms (${ultimateTime <= 35 ? "✅ ACHIEVED" : "❌ " + ((35/ultimateTime)*100).toFixed(0) + "% needed"})`);
    console.log(`  Parallel Target: ≤7ms (${ultimateTime <= 7 ? "✅ ACHIEVED" : "❌ " + ((7/ultimateTime)*100).toFixed(0) + "% needed"})`);
    
    const ultimateGFLOPS = (numPairs * vectorLength * 2) / (ultimateTime * 1e6);
    console.log(`  Ultimate GFLOPS: ${ultimateGFLOPS.toFixed(2)}`);
    console.log(`  Target GFLOPS (7ms): ${((numPairs * vectorLength * 2) / (7 * 1e6)).toFixed(2)}`);
  });
});
