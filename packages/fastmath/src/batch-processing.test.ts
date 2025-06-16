/**
 * Tests for batch processing functionality
 */

import { describe, test, expect } from "vitest";
import { runBatchBenchmark } from "./batch-benchmark.js";
import { runSimpleTest } from "./simple-batch-test.js";
import { runScaleBenchmark } from "./scale-benchmark.js";

describe("Batch Processing", () => {
  test("should run simple batch test successfully", async () => {
    const result = await runSimpleTest();
    expect(result).toBe(true);
  }, 15000); // 15 second timeout

  test("should run batch benchmark successfully", async () => {
    const results = await runBatchBenchmark();

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    // Check that all implementations completed
    const failedTests = results.filter((r) => r.status === "failed");
    expect(failedTests.length).toBe(0);

    console.log("✅ All batch processing implementations work correctly");
  }, 60000); // 60 second timeout for the benchmark

  test("should run scale benchmark to find WASM crossover point", async () => {
    const results = await runScaleBenchmark();

    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    // Check that we got results for all scales
    expect(results.every((r) => r.wasmBatchTime > 0)).toBe(true);
    expect(results.every((r) => r.wasmManagedTime > 0)).toBe(true);

    // For non-massive scales, check JS results too
    const nonMassiveResults = results.filter((r) => r.scale !== "Massive");
    expect(nonMassiveResults.every((r) => r.jsTime > 0)).toBe(true);

    console.log("✅ Scale benchmark completed successfully");
  }, 300000); // 5 minute timeout for massive scale benchmark
});
