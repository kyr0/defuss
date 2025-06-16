/**
 * Simple benchmark to test batch processing performance
 * Focus on comparing individual WASM calls vs batch processing
 */

import { Bench } from "tinybench";
import { generateSampleData } from "./vector-test-data.js";
import { vector_dot_product } from "./vector-operations.js";
import { ensureWasmInit } from "./bench-util.js";
import { WasmVectorBatch } from "./wasm-batch-processor.js";
import * as wasm from "../pkg/defuss_fastmath.js";

// Test configuration
const VECTOR_LENGTH = 256; // Reduced from 1024
const NUM_VECTORS = 100; // Reduced from 10000 for reasonable test time
const SEED = 42;

export async function runBatchBenchmark() {
  console.log("🚀 Starting batch processing benchmark");
  console.log(
    `Testing: ${NUM_VECTORS} vectors of ${VECTOR_LENGTH} dimensions\n`,
  );

  // Initialize WASM
  await ensureWasmInit();

  // Prepare test data
  console.log("Preparing test data...");
  const testData = generateSampleData(SEED, VECTOR_LENGTH, NUM_VECTORS);
  const { vectorsA: aVectors, vectorsB: bVectors } = testData;

  // Convert to flat arrays for batch processing
  const aFlat = new Float32Array(aVectors.flatMap((v) => Array.from(v)));
  const bFlat = new Float32Array(bVectors.flatMap((v) => Array.from(v)));

  // Pre-initialize batch processor
  const batchProcessor = new WasmVectorBatch();
  await batchProcessor.init(NUM_VECTORS, VECTOR_LENGTH);

  console.log("Running benchmarks...\n");

  const bench = new Bench({
    time: 1000, // Reduced from 3000ms
    iterations: 2, // Reduced from 5
    warmupTime: 500, // Reduced from 1000ms
  });

  // JS reference implementation
  bench.add("JS: Individual calls", () => {
    const results = new Float32Array(NUM_VECTORS);
    for (let i = 0; i < NUM_VECTORS; i++) {
      const a = aVectors[i];
      const b = bVectors[i];
      // Simple dot product calculation
      let sum = 0;
      for (let j = 0; j < VECTOR_LENGTH; j++) {
        sum += a[j] * b[j];
      }
      results[i] = sum;
    }
    return results;
  });

  // JS batch implementation (using existing batch function)
  bench.add("JS: Batch processing", () => {
    return vector_dot_product(aVectors, bVectors);
  });

  // WASM individual calls
  bench.add("WASM: Individual calls", () => {
    const results = new Float32Array(NUM_VECTORS);
    for (let i = 0; i < NUM_VECTORS; i++) {
      results[i] = wasm.vector_dot_product_single(aVectors[i], bVectors[i]);
    }
    return results;
  });

  // WASM batch processing (separated arrays)
  bench.add("WASM: Batch separated", () => {
    return wasm.vector_batch_dot_product_separated(
      aFlat,
      bFlat,
      VECTOR_LENGTH,
      NUM_VECTORS,
    );
  });

  // WASM batch processing (memory managed)
  bench.add("WASM: Batch memory-managed", () => {
    return batchProcessor.batchDotProduct(aFlat, bFlat, NUM_VECTORS);
  });

  await bench.run();

  // Display results
  console.log("📊 Results:\n");

  const results = bench.tasks
    .sort(
      (a, b) =>
        (a.result?.mean || Number.POSITIVE_INFINITY) -
        (b.result?.mean || Number.POSITIVE_INFINITY),
    )
    .map((task) => {
      const result = task.result;
      if (!result) return { name: task.name, status: "failed" };

      const meanMs = result.mean * 1000;
      const opsPerMs = NUM_VECTORS / meanMs;

      return {
        name: task.name,
        "Time (ms)": meanMs.toFixed(2),
        "Ops/ms": Math.round(opsPerMs),
        "Total ops": NUM_VECTORS.toLocaleString(),
      };
    });

  console.table(results);

  // Performance analysis
  const fastest = results[0];
  const slowest = results[results.length - 1];

  if (fastest && slowest && fastest["Time (ms)"] && slowest["Time (ms)"]) {
    const speedup =
      Number.parseFloat(slowest["Time (ms)"]) /
      Number.parseFloat(fastest["Time (ms)"]);
    console.log(`\n⚡ Best: ${fastest.name} (${fastest["Time (ms)"]}ms)`);
    console.log(`🐌 Worst: ${slowest.name} (${slowest["Time (ms)"]}ms)`);
    console.log(`📈 Speedup: ${speedup.toFixed(2)}x faster\n`);
  }

  // Memory stats
  const memStats = batchProcessor.getMemoryStats();
  if (memStats) {
    console.log("💾 Memory usage:");
    console.log(
      `   Total WASM memory: ${(memStats.totalMemorySize / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `   Vector buffer: ${(memStats.vectorBufferSize / 1024 / 1024).toFixed(2)} MB`,
    );
    console.log(
      `   Result buffer: ${(memStats.resultBufferSize / 1024).toFixed(2)} KB`,
    );
  }

  return results;
}

// Only run if this is being executed directly (not imported)
if (
  typeof globalThis !== "undefined" &&
  globalThis.location?.pathname?.endsWith("batch-benchmark.js")
) {
  runBatchBenchmark().catch(console.error);
}
