/**
 * @fileoverview Benchmarks for matrix operations
 * Tests performance of JS vs WASM implementations across different matrix sizes
 * and validates adaptive switching thresholds
 */

import { beforeAll, describe, it } from "vitest";
import { Bench } from "tinybench";
import {
  matrix_multiply,
  matrix_multiply_single,
  matrix_multiply_parallel,
} from "../pkg/defuss_fastmath.js";
import {
  matrix_multiply as js_matrix_multiply,
  matrix_multiply_simple as js_matrix_multiply_simple,
} from "./vector-operations.js";
import { ensureWasmInit } from "./bench-util.js";
import { seededRandom } from "./vector-test-data.js";

describe("Matrix Operations Performance Benchmarks", () => {
  beforeAll(async () => {
    await ensureWasmInit();
  });

  it("should run comprehensive matrix benchmarks", async () => {
    console.log("🚀 Starting matrix operation benchmarks...");

    const allResults: Array<{
      name: string;
      m: number;
      k: number;
      n: number;
      ops: number;
      time: number;
      type: string;
    }> = [];

    // Test configurations for different matrix sizes
    const testConfigs = [
      { m: 8, k: 8, n: 8, name: "Tiny (8x8)" },
      { m: 16, k: 16, n: 16, name: "Small (16x16)" },
      { m: 32, k: 32, n: 32, name: "Medium (32x32)" },
      { m: 64, k: 64, n: 64, name: "Large (64x64)" },
      { m: 128, k: 128, n: 128, name: "XLarge (128x128)" },
      { m: 256, k: 256, n: 256, name: "XXLarge (256x256)" },
    ];

    // Matrix Multiplication Benchmarks
    console.log("\n📊 Running Matrix Multiplication benchmarks...");

    for (const config of testConfigs) {
      console.log(
        `  Testing ${config.name} - ${config.m}x${config.k} * ${config.k}x${config.n}...`,
      );

      // Generate test matrices
      const rng = seededRandom(31337);

      // Matrix A: m x k (row-major)
      const matrixA = new Float32Array(config.m * config.k);
      for (let i = 0; i < matrixA.length; i++) {
        matrixA[i] = (rng() - 0.5) * 2;
      }

      // Matrix B: k x n (row-major)
      const matrixB = new Float32Array(config.k * config.n);
      for (let i = 0; i < matrixB.length; i++) {
        matrixB[i] = (rng() - 0.5) * 2;
      }

      // Pre-allocate result matrices
      const wasmResult = new Float32Array(config.m * config.n);
      const wasmSingleResult = new Float32Array(config.m * config.n);
      const wasmParallelResult = new Float32Array(config.m * config.n);

      // For JS matrix multiply, we need to convert to 2D arrays
      const matrixA2D: Float32Array[] = [];
      const matrixB2D: Float32Array[] = [];
      const jsResult: Float32Array[] = [];
      const jsSimpleResult: Float32Array[] = [];

      for (let i = 0; i < config.m; i++) {
        matrixA2D.push(matrixA.slice(i * config.k, (i + 1) * config.k));
        jsResult.push(new Float32Array(config.n));
        jsSimpleResult.push(new Float32Array(config.n));
      }

      for (let i = 0; i < config.k; i++) {
        matrixB2D.push(matrixB.slice(i * config.n, (i + 1) * config.n));
      }

      const bench = new Bench({ time: 1000, iterations: 3 });

      bench
        .add(`JS Matrix Multiply ${config.name}`, () => {
          js_matrix_multiply(
            matrixA2D,
            matrixB2D,
            jsResult,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`JS Simple Matrix Multiply ${config.name}`, () => {
          js_matrix_multiply_simple(
            matrixA2D,
            matrixB2D,
            jsSimpleResult,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`WASM Adaptive Matrix Multiply ${config.name}`, () => {
          matrix_multiply(
            matrixA,
            matrixB,
            wasmResult,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`WASM Single-threaded Matrix Multiply ${config.name}`, () => {
          matrix_multiply_single(
            matrixA,
            matrixB,
            wasmSingleResult,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`WASM Parallel Matrix Multiply ${config.name}`, () => {
          matrix_multiply_parallel(
            matrixA,
            matrixB,
            wasmParallelResult,
            config.m,
            config.k,
            config.n,
          );
        });

      await bench.run();

      // Collect results
      bench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            m: config.m,
            k: config.k,
            n: config.n,
            ops: task.result.hz,
            time: task.result.mean,
            type: "MatrixMultiply",
          });
        }
      });
    }

    // Threshold Analysis - Test around the MATRIX_PARALLEL_THRESHOLD (10000 operations)
    console.log("\n📊 Running Matrix Threshold Analysis benchmarks...");
    const thresholdConfigs = [
      { m: 16, k: 16, n: 16 }, // 4096 ops
      { m: 20, k: 20, n: 20 }, // 8000 ops
      { m: 22, k: 22, n: 22 }, // ~10648 ops (around threshold)
      { m: 25, k: 25, n: 25 }, // 15625 ops
      { m: 32, k: 32, n: 32 }, // 32768 ops
      { m: 40, k: 40, n: 40 }, // 64000 ops
    ];

    for (const config of thresholdConfigs) {
      const totalOps = config.m * config.k * config.n;
      console.log(
        `  Testing threshold analysis for ${config.m}x${config.k}x${config.n} (${totalOps} ops)...`,
      );

      const rng = seededRandom(12345);

      const matrixA = new Float32Array(config.m * config.k);
      const matrixB = new Float32Array(config.k * config.n);
      const result1 = new Float32Array(config.m * config.n);
      const result2 = new Float32Array(config.m * config.n);
      const result3 = new Float32Array(config.m * config.n);

      for (let i = 0; i < matrixA.length; i++) {
        matrixA[i] = (rng() - 0.5) * 2;
      }
      for (let i = 0; i < matrixB.length; i++) {
        matrixB[i] = (rng() - 0.5) * 2;
      }

      const thresholdBench = new Bench({ time: 500, iterations: 5 });

      thresholdBench
        .add(`WASM Single ${totalOps}ops`, () => {
          matrix_multiply_single(
            matrixA,
            matrixB,
            result1,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`WASM Parallel ${totalOps}ops`, () => {
          matrix_multiply_parallel(
            matrixA,
            matrixB,
            result2,
            config.m,
            config.k,
            config.n,
          );
        })
        .add(`WASM Adaptive ${totalOps}ops`, () => {
          matrix_multiply(
            matrixA,
            matrixB,
            result3,
            config.m,
            config.k,
            config.n,
          );
        });

      await thresholdBench.run();

      // Collect results
      thresholdBench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            m: config.m,
            k: config.k,
            n: config.n,
            ops: task.result.hz,
            time: task.result.mean,
            type: "ThresholdAnalysis",
          });
        }
      });
    }

    // Non-square Matrix Tests
    console.log("\n📊 Running Non-square Matrix benchmarks...");
    const nonSquareConfigs = [
      { m: 64, k: 32, n: 16, name: "Tall (64x32x16)" },
      { m: 16, k: 32, n: 64, name: "Wide (16x32x64)" },
      { m: 100, k: 50, n: 25, name: "Mixed (100x50x25)" },
    ];

    for (const config of nonSquareConfigs) {
      console.log(`  Testing ${config.name}...`);

      const rng = seededRandom(54321);

      const matrixA = new Float32Array(config.m * config.k);
      const matrixB = new Float32Array(config.k * config.n);
      const wasmResult = new Float32Array(config.m * config.n);

      for (let i = 0; i < matrixA.length; i++) {
        matrixA[i] = (rng() - 0.5) * 2;
      }
      for (let i = 0; i < matrixB.length; i++) {
        matrixB[i] = (rng() - 0.5) * 2;
      }

      const nonSquareBench = new Bench({ time: 500, iterations: 5 });

      nonSquareBench.add(`WASM Adaptive ${config.name}`, () => {
        matrix_multiply(
          matrixA,
          matrixB,
          wasmResult,
          config.m,
          config.k,
          config.n,
        );
      });

      await nonSquareBench.run();

      // Collect results
      nonSquareBench.tasks.forEach((task) => {
        if (task.result) {
          allResults.push({
            name: task.name,
            m: config.m,
            k: config.k,
            n: config.n,
            ops: task.result.hz,
            time: task.result.mean,
            type: "NonSquare",
          });
        }
      });
    }

    // Generate markdown report
    console.log("\n📝 Generating markdown report...");

    let markdown = "# Matrix Operations Performance Benchmarks\n\n";
    markdown += `Generated on: ${new Date().toISOString()}\n\n`;

    // Matrix Multiply Results
    const matrixResults = allResults.filter((r) => r.type === "MatrixMultiply");
    if (matrixResults.length > 0) {
      markdown += "## Matrix Multiplication Results\n\n";
      markdown +=
        "| Matrix Size | Implementation | Operations/sec | Time (ms) | Total Ops |\n";
      markdown +=
        "|-------------|----------------|----------------|-----------|----------|\n";

      for (const result of matrixResults) {
        const totalOps = result.m * result.k * result.n;
        markdown += `| ${result.m}x${result.k}x${result.n} | ${result.name} | ${result.ops.toFixed(2)} | ${(result.time * 1000).toFixed(3)} | ${totalOps} |\n`;
      }
      markdown += "\n";
    }

    // Threshold Analysis Results
    const thresholdResults = allResults.filter(
      (r) => r.type === "ThresholdAnalysis",
    );
    if (thresholdResults.length > 0) {
      markdown += "## Threshold Analysis Results\n\n";
      markdown +=
        "| Matrix Size | Implementation | Operations/sec | Time (ms) | Total Ops |\n";
      markdown +=
        "|-------------|----------------|----------------|-----------|----------|\n";

      for (const result of thresholdResults) {
        const totalOps = result.m * result.k * result.n;
        markdown += `| ${result.m}x${result.k}x${result.n} | ${result.name} | ${result.ops.toFixed(2)} | ${(result.time * 1000).toFixed(3)} | ${totalOps} |\n`;
      }
      markdown += "\n";
    }

    // Non-square Results
    const nonSquareResults = allResults.filter((r) => r.type === "NonSquare");
    if (nonSquareResults.length > 0) {
      markdown += "## Non-square Matrix Results\n\n";
      markdown +=
        "| Matrix Size | Implementation | Operations/sec | Time (ms) | Total Ops |\n";
      markdown +=
        "|-------------|----------------|----------------|-----------|----------|\n";

      for (const result of nonSquareResults) {
        const totalOps = result.m * result.k * result.n;
        markdown += `| ${result.m}x${result.k}x${result.n} | ${result.name} | ${result.ops.toFixed(2)} | ${(result.time * 1000).toFixed(3)} | ${totalOps} |\n`;
      }
      markdown += "\n";
    }

    // Performance Analysis
    markdown += "## Performance Analysis\n\n";

    // Find best performing implementation for each matrix size
    const sizeGroups = new Map<string, typeof allResults>();
    for (const result of matrixResults) {
      const key = `${result.m}x${result.k}x${result.n}`;
      if (!sizeGroups.has(key)) {
        sizeGroups.set(key, []);
      }
      sizeGroups.get(key)!.push(result);
    }

    markdown += "### Best Implementation by Matrix Size\n\n";
    markdown +=
      "| Matrix Size | Best Implementation | Operations/sec | Speedup vs JS |\n";
    markdown +=
      "|-------------|---------------------|----------------|---------------|\n";

    for (const [size, results] of sizeGroups) {
      const sortedResults = results.sort((a, b) => b.ops - a.ops);
      const best = sortedResults[0];
      const jsResult = results.find(
        (r) =>
          r.name.includes("JS Matrix Multiply") && !r.name.includes("Simple"),
      );
      const speedup = jsResult ? (best.ops / jsResult.ops).toFixed(2) : "N/A";

      markdown += `| ${size} | ${best.name} | ${best.ops.toFixed(2)} | ${speedup}x |\n`;
    }

    console.log(markdown);
    console.log("\n✅ Matrix benchmarks completed!");
  });
});
