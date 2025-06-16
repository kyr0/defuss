/**
 * @fileoverview Benchmarks for functional vector operations
 * Tests performance of the new functional vector implementation
 */

import { beforeAll, describe, it, expect } from "vitest";
import { Bench } from "tinybench";
import {
  initWasm,
  batchDotProductZeroCopy,
  batchDotProductStreaming,
} from "./vector.js";
import { generateBatchData } from "./vector-test-data.js";

describe("Functional Vector Operations Benchmarks", () => {
  beforeAll(async () => {
    await initWasm();

    // Warmup for JIT optimization with 1024D vectors
    console.log("🔥 Warming up WASM and JIT with 1024D vectors...");
    const warmupData = generateBatchData(12345, 1024, 1000);

    // Warmup both sequential and parallel paths
    for (let i = 0; i < 5; i++) {
      batchDotProductZeroCopy(
        warmupData.flatVectorsA,
        warmupData.flatVectorsB,
        1024,
        1000,
        false, // Sequential
      );
      batchDotProductZeroCopy(
        warmupData.flatVectorsA,
        warmupData.flatVectorsB,
        1024,
        1000,
        true, // Parallel
      );
    }
    console.log("✅ Warmup complete");
  });

  it("should benchmark batchDotProductZeroCopy", async () => {
    console.log("🚀 Starting functional vector benchmarks...");

    const allResults: Array<{
      name: string;
      vectorLength: number;
      numPairs: number;
      ops: number;
      time: number;
      wallTime: number;
      type: string;
    }> = [];

    // Test configurations focused on 1024D vectors with varying operation counts
    const testConfigs = [
      { vectorLength: 1024, numPairs: 10000, name: "1024D × 10k ops" },
      { vectorLength: 1024, numPairs: 20000, name: "1024D × 20k ops" },
      { vectorLength: 1024, numPairs: 50000, name: "1024D × 50k ops" },
      { vectorLength: 1024, numPairs: 100000, name: "1024D × 100k ops" },
    ];

    console.log("\n📊 Running Zero-Copy Batch Dot Product benchmarks...");

    for (const config of testConfigs) {
      console.log(
        `  Testing ${config.name} - ${config.vectorLength}D x ${config.numPairs} pairs...`,
      );

      // Generate flat test data for zero-copy processing
      const batchData = generateBatchData(
        31337,
        config.vectorLength,
        config.numPairs,
      );

      // Verify memory alignment for optimal SIMD performance
      const aAlignment = batchData.flatVectorsA.byteOffset % 16 === 0;
      const bAlignment = batchData.flatVectorsB.byteOffset % 16 === 0;
      if (!aAlignment || !bAlignment) {
        console.warn(
          `    ⚠️  Data not 16-byte aligned (A: ${aAlignment}, B: ${bAlignment}) - SIMD may be slower`,
        );
      } else {
        console.log("    ✅ Data is 16-byte aligned - optimal for SIMD");
      }

      // Adjust benchmark timing based on operation count
      const benchTime =
        config.numPairs >= 50000
          ? 3000
          : config.numPairs >= 20000
            ? 2000
            : 1000;
      const iterations = config.numPairs >= 50000 ? 3 : 5;

      console.log(
        `    Using ${benchTime}ms benchmark time with ${iterations} iterations`,
      );

      const bench = new Bench({ time: benchTime, iterations });

      // Add wall time tracking functions
      let sequentialWallTime = 0;
      let parallelWallTime = 0;

      bench
        .add(
          `Zero-Copy Sequential ${config.vectorLength}D x${config.numPairs}`,
          () => {
            const start = performance.now();
            batchDotProductZeroCopy(
              batchData.flatVectorsA,
              batchData.flatVectorsB,
              config.vectorLength,
              config.numPairs,
              false,
            );
            const end = performance.now();
            sequentialWallTime = Math.max(sequentialWallTime, end - start);
          },
        )
        .add(
          `Zero-Copy Parallel ${config.vectorLength}D x${config.numPairs}`,
          () => {
            const start = performance.now();
            batchDotProductZeroCopy(
              batchData.flatVectorsA,
              batchData.flatVectorsB,
              config.vectorLength,
              config.numPairs,
              true,
            );
            const end = performance.now();
            parallelWallTime = Math.max(parallelWallTime, end - start);
          },
        );

      await bench.run();

      // Collect results with wall time
      bench.tasks.forEach((task) => {
        if (task.result) {
          const wallTime = task.name.includes("Sequential")
            ? sequentialWallTime
            : parallelWallTime;
          allResults.push({
            name: task.name,
            vectorLength: config.vectorLength,
            numPairs: config.numPairs,
            ops: task.result.hz,
            time: task.result.mean,
            wallTime: wallTime,
            type: "BatchDotProduct",
          });
        }
      });

      // Print immediate results with GFLOPS calculation
      bench.tasks.forEach((task) => {
        if (task.result?.hz && task.result?.mean) {
          // Calculate GFLOPS: each dot product = 2 * vectorLength FLOPs (multiply + add)
          // Total FLOPs per benchmark call = numPairs * vectorLength * 2
          const flopsPerCall = config.numPairs * config.vectorLength * 2;
          const gflops = (task.result.hz * flopsPerCall) / 1e9;

          console.log(
            `    ${task.name}: ${task.result.hz.toFixed(2)} ops/sec (${(task.result.mean * 1000).toFixed(3)}ms) - ${gflops.toFixed(2)} GFLOPS`,
          );
        }
      });
    }

    console.log("\n📊 Running Streaming Batch Dot Product benchmarks...");

    // Test streaming with the largest datasets (50k and 100k ops)
    const streamingConfigs = [
      {
        vectorLength: 1024,
        numVectors: 50000,
        chunkSize: 5000,
        name: "1024D × 50k ops (streaming)",
      },
      {
        vectorLength: 1024,
        numVectors: 100000,
        chunkSize: 10000,
        name: "1024D × 100k ops (streaming)",
      },
    ];

    for (const config of streamingConfigs) {
      console.log(
        `  Testing streaming ${config.name} - ${config.vectorLength}D x ${config.numVectors} vectors...`,
      );

      // Generate flat test data for streaming processing
      const batchData = generateBatchData(
        31337,
        config.vectorLength,
        config.numVectors,
      );

      const bench = new Bench({ time: 2000, iterations: 3 });

      bench.add(
        `Streaming ${config.vectorLength}D x${config.numVectors} (chunk: ${config.chunkSize})`,
        async () => {
          await batchDotProductStreaming(
            batchData.flatVectorsA,
            batchData.flatVectorsB,
            config.vectorLength,
            config.numVectors,
            config.chunkSize,
          );
        },
      );

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            vectorLength: config.vectorLength,
            numPairs: config.numVectors,
            ops: task.result.hz,
            time: task.result.mean,
            wallTime: task.result.mean * 1000, // Convert to ms for streaming
            type: "StreamingBatchDotProduct",
          });
        }
      });

      // Print immediate results with wall time
      bench.tasks.forEach((task) => {
        if (task.result?.hz && task.result?.mean) {
          // Find the corresponding result to get wall time
          const result = allResults.find((r) => r.name === task.name);
          const wallTimeDisplay = result
            ? `${result.wallTime.toFixed(2)}ms max wall time`
            : "wall time N/A";
          console.log(
            `    ${task.name}: ${task.result.hz.toFixed(2)} ops/sec (${(task.result.mean * 1000).toFixed(3)}ms avg, ${wallTimeDisplay})`,
          );
        }
      });
    }

    console.log("\n🎯 Summary of Results:");
    console.log("=".repeat(80));
    console.table(
      allResults.map((result) => {
        // Calculate GFLOPS for table
        const flopsPerCall = result.numPairs * result.vectorLength * 2;
        const gflops = result.ops ? (result.ops * flopsPerCall) / 1e9 : 0;

        return {
          Name: result.name,
          "Vector Length": result.vectorLength,
          "Num Pairs": result.numPairs.toLocaleString(),
          "Ops/sec": result.ops?.toFixed(2) || "N/A",
          "Avg Time (ms)": result.time
            ? (result.time * 1000).toFixed(3)
            : "N/A",
          "Max Wall Time (ms)": result.wallTime.toFixed(2),
          GFLOPS: gflops.toFixed(2),
          Type: result.type,
        };
      }),
    );

    // Performance insights
    console.log("\n💡 Performance Insights:");

    const sequentialResults = allResults.filter((r) =>
      r.name.includes("Sequential"),
    );
    const parallelResults = allResults.filter((r) =>
      r.name.includes("Parallel"),
    );

    if (sequentialResults.length > 0 && parallelResults.length > 0) {
      const avgSequential =
        sequentialResults.reduce((sum, r) => sum + (r.ops || 0), 0) /
        sequentialResults.length;
      const avgParallel =
        parallelResults.reduce((sum, r) => sum + (r.ops || 0), 0) /
        parallelResults.length;
      const parallelSpeedup = (avgParallel / avgSequential - 1) * 100;

      console.log(
        `   • Parallel processing is ${parallelSpeedup.toFixed(1)}% ${parallelSpeedup > 0 ? "faster" : "slower"} on average`,
      );
    }

    const streamingResults = allResults.filter(
      (r) => r.type === "StreamingBatchDotProduct",
    );
    if (streamingResults.length > 0) {
      const totalVectorsProcessed = streamingResults.reduce(
        (sum, r) => sum + r.numPairs,
        0,
      );
      const avgStreamingOps =
        streamingResults.reduce((sum, r) => sum + (r.ops || 0), 0) /
        streamingResults.length;
      console.log(
        `   • Streaming processed ${totalVectorsProcessed.toLocaleString()} total vectors`,
      );
      console.log(
        `   • Average streaming performance: ${avgStreamingOps.toFixed(2)} ops/sec`,
      );
    }

    // High-volume performance analysis
    console.log("\n🔥 High-Volume Performance Analysis (1024D):");

    const batchResults = allResults.filter((r) => r.type === "BatchDotProduct");
    if (batchResults.length > 0) {
      console.log("=".repeat(80));

      batchResults.forEach((result) => {
        const flopsPerCall = result.numPairs * result.vectorLength * 2;
        const gflops = result.ops ? (result.ops * flopsPerCall) / 1e9 : 0;
        const totalOperations = result.numPairs;
        const timePerOp = result.time
          ? (result.time * 1000000) / totalOperations
          : 0; // microseconds per operation

        console.log(`${result.name}:`);
        console.log(
          `  • Total Operations: ${totalOperations.toLocaleString()}`,
        );
        console.log(`  • Performance: ${gflops.toFixed(2)} GFLOPS`);
        console.log(`  • Time per dot product: ${timePerOp.toFixed(3)} μs`);
        console.log(
          `  • Throughput: ${(result.ops || 0).toFixed(0)} batch ops/sec`,
        );
        console.log(`  • Max Wall Time: ${result.wallTime.toFixed(2)}ms`);
        console.log("");
      });

      // Find best performing configurations
      const sequential = batchResults.filter((r) =>
        r.name.includes("Sequential"),
      );
      const parallel = batchResults.filter((r) => r.name.includes("Parallel"));

      if (sequential.length > 0) {
        const bestSequential = sequential.reduce((a, b) =>
          (a.ops || 0) > (b.ops || 0) ? a : b,
        );
        const bestSeqGFLOPS =
          ((bestSequential.ops || 0) *
            bestSequential.numPairs *
            bestSequential.vectorLength *
            2) /
          1e9;
        console.log(
          `🏆 Best Sequential: ${bestSequential.name} - ${bestSeqGFLOPS.toFixed(2)} GFLOPS`,
        );
      }

      if (parallel.length > 0) {
        const bestParallel = parallel.reduce((a, b) =>
          (a.ops || 0) > (b.ops || 0) ? a : b,
        );
        const bestParGFLOPS =
          ((bestParallel.ops || 0) *
            bestParallel.numPairs *
            bestParallel.vectorLength *
            2) /
          1e9;
        console.log(
          `🏆 Best Parallel: ${bestParallel.name} - ${bestParGFLOPS.toFixed(2)} GFLOPS`,
        );
      }
    }

    expect(allResults.length).toBeGreaterThan(0);
  });
});
