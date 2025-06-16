/**
 * Scale-based benchmark to find the crossover point where WASM becomes faster than JS
 */

import { Bench } from "tinybench";
import { generateSampleData } from "./vector-test-data.js";
import { vector_dot_product } from "./vector-operations.js";
import { ensureWasmInit } from "./bench-util.js";
import { WasmVectorBatch } from "./wasm-batch-processor.js";
import * as wasm from "../pkg/defuss_fastmath.js";

interface BenchmarkResult {
  scale: string;
  numVectors: number;
  vectorLength: number;
  jsTime: number;
  wasmBatchTime: number;
  wasmManagedTime: number;
  winner: string;
  speedup: number;
}

export async function runScaleBenchmark(): Promise<BenchmarkResult[]> {
  console.log(
    "🔍 Running scale-based benchmark to find WASM crossover point...\n",
  );

  // Initialize WASM
  await ensureWasmInit();

  const results: BenchmarkResult[] = [];

  // Test different scales with appropriate iteration counts
  const testConfigs = [
    { name: "Small", numVectors: 50, vectorLength: 128, iterations: 50 },
    { name: "Medium", numVectors: 100, vectorLength: 256, iterations: 20 },
    { name: "Large", numVectors: 200, vectorLength: 512, iterations: 10 },
    { name: "X-Large", numVectors: 500, vectorLength: 1024, iterations: 5 },
    { name: "Massive", numVectors: 100000, vectorLength: 1024, iterations: 3 },
  ];

  for (const config of testConfigs) {
    console.log(
      `\n🧪 Testing ${config.name}: ${config.numVectors} vectors × ${config.vectorLength} dimensions`,
    );

    // Prepare test data
    const testData = generateSampleData(
      42,
      config.vectorLength,
      config.numVectors,
    );
    const { vectorsA: aVectors, vectorsB: bVectors } = testData;

    // Convert to flat arrays
    const aFlat = new Float32Array(aVectors.flatMap((v) => Array.from(v)));
    const bFlat = new Float32Array(bVectors.flatMap((v) => Array.from(v)));

    // Initialize batch processor
    const batchProcessor = new WasmVectorBatch();
    await batchProcessor.init(config.numVectors, config.vectorLength);

    const bench = new Bench({
      time: config.iterations <= 10 ? 3000 : 1000, // More time for fewer iterations
      iterations: config.iterations, // Use config-specified iterations
      warmupTime: config.iterations <= 10 ? 1000 : 200, // Longer warmup for fewer iterations
    });

    // For massive scale, only test WASM methods to avoid JS memory issues
    if (config.name === "Massive") {
      console.log("   🚀 Testing only WASM methods for massive scale...");

      // WASM batch separated
      bench.add("WASM Batch", () => {
        return wasm.vector_batch_dot_product_separated(
          aFlat,
          bFlat,
          config.vectorLength,
          config.numVectors,
        );
      });

      // WASM memory-managed
      bench.add("WASM Managed", () => {
        return batchProcessor.batchDotProduct(aFlat, bFlat, config.numVectors);
      });
    } else {
      // For smaller scales, test all methods
      // JS batch
      bench.add("JS Batch", () => {
        return vector_dot_product(aVectors, bVectors);
      });

      // WASM batch separated
      bench.add("WASM Batch", () => {
        return wasm.vector_batch_dot_product_separated(
          aFlat,
          bFlat,
          config.vectorLength,
          config.numVectors,
        );
      });

      // WASM memory-managed
      bench.add("WASM Managed", () => {
        return batchProcessor.batchDotProduct(aFlat, bFlat, config.numVectors);
      });
    }

    await bench.run();

    // Extract results
    const tasks = bench.tasks;
    const jsResult = tasks.find((t) => t.name === "JS Batch");
    const wasmResult = tasks.find((t) => t.name === "WASM Batch");
    const wasmManagedResult = tasks.find((t) => t.name === "WASM Managed");

    if (wasmResult?.result && wasmManagedResult?.result) {
      const jsTime = jsResult?.result ? jsResult.result.mean * 1000 : 0; // Convert to ms, or 0 if not tested
      const wasmTime = wasmResult.result.mean * 1000;
      const wasmManagedTime = wasmManagedResult.result.mean * 1000;

      // Determine winner (best of the WASM approaches vs JS, or best WASM if no JS)
      const bestWasmTime = Math.min(wasmTime, wasmManagedTime);
      let winner: string;
      let speedup: number;

      if (config.name === "Massive") {
        // For massive scale, compare WASM methods only
        winner = wasmTime < wasmManagedTime ? "WASM Batch" : "WASM Managed";
        speedup =
          wasmTime < wasmManagedTime
            ? wasmManagedTime / wasmTime
            : wasmTime / wasmManagedTime;
      } else {
        // For other scales, compare JS vs WASM
        winner = jsTime > 0 && jsTime < bestWasmTime ? "JS" : "WASM";
        speedup =
          winner === "JS" ? bestWasmTime / jsTime : jsTime / bestWasmTime;
      }

      const result: BenchmarkResult = {
        scale: config.name,
        numVectors: config.numVectors,
        vectorLength: config.vectorLength,
        jsTime,
        wasmBatchTime: wasmTime,
        wasmManagedTime,
        winner,
        speedup,
      };

      results.push(result);

      // Log immediate results
      if (config.name === "Massive") {
        console.log(`   WASM Batch:   ${wasmTime.toFixed(2)}ms`);
        console.log(`   WASM Managed: ${wasmManagedTime.toFixed(2)}ms`);
        console.log(
          `   Winner:       ${winner} (${speedup.toFixed(2)}x faster)`,
        );
        console.log(
          `   🚀 Processed ${config.numVectors.toLocaleString()} operations at ${((config.numVectors / bestWasmTime) * 1000).toFixed(0)} ops/sec`,
        );
      } else {
        console.log(`   JS:           ${jsTime.toFixed(2)}ms`);
        console.log(`   WASM Batch:   ${wasmTime.toFixed(2)}ms`);
        console.log(`   WASM Managed: ${wasmManagedTime.toFixed(2)}ms`);
        console.log(
          `   Winner:       ${winner} (${speedup.toFixed(2)}x faster)`,
        );
      }
    }
  }

  // Summary table
  console.log("\n📊 Scale Benchmark Summary:\n");
  console.table(
    results.map((r) => ({
      Scale: r.scale,
      Vectors: r.numVectors.toLocaleString(),
      Dimensions: r.vectorLength,
      "JS (ms)": r.jsTime > 0 ? r.jsTime.toFixed(2) : "N/A",
      "WASM Batch (ms)": r.wasmBatchTime.toFixed(2),
      "WASM Managed (ms)": r.wasmManagedTime.toFixed(2),
      Winner: r.winner,
      Speedup: `${r.speedup.toFixed(2)}x`,
    })),
  );

  // Analysis
  const jsWins = results.filter((r) => r.winner === "JS").length;
  const wasmWins = results.filter((r) => r.winner === "WASM").length;

  console.log("\n📈 Analysis:");
  console.log(`   JS wins:   ${jsWins}/${results.length} scales`);
  console.log(`   WASM wins: ${wasmWins}/${results.length} scales`);

  if (wasmWins > 0) {
    const firstWasmWin = results.find((r) => r.winner === "WASM");
    if (firstWasmWin) {
      console.log(
        `   WASM crossover: ${firstWasmWin.scale} scale (${firstWasmWin.numVectors} vectors × ${firstWasmWin.vectorLength} dims)`,
      );
    }
  } else {
    console.log("   WASM needs larger scales to show advantage");
  }

  return results;
}

// Run if executed directly
if (
  typeof globalThis !== "undefined" &&
  globalThis.location?.pathname?.endsWith("scale-benchmark.js")
) {
  runScaleBenchmark().catch(console.error);
}
