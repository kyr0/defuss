/**
 * @fileoverview Benchmarks for functional vector operations
 * Tests performance of the new functional vector implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  compareUltimatePerformance,
  UltimatePerformanceMetrics
} from "./ultra.js";

interface BenchmarkResult {
    ultimate: UltimatePerformanceMetrics;
    baseline: {
        time: number;
        gflops: number;
    };
    improvement: {
        speedup: number;
        gflopsGain: number;
    };
    analysis: string[];
}

describe("ultra", () => {
  beforeAll(async () => {
    await initWasm();
  });

  it("should be ultra fast", async () => {
    console.log("🚀 Starting ultra benchmarks...");
    const testConfigs = [
      { vectorLength: 64, numPairs: 1000, name: "Small vectors, small batch" },
      { vectorLength: 64, numPairs: 10_000, name: "Small vectors, medium batch" },
      { vectorLength: 64, numPairs: 10_000, name: "Small vectors, large batch" },
      { vectorLength: 384, numPairs: 1000, name: "Medium vectors, small batch" },
      { vectorLength: 384, numPairs: 10_000, name: "Medium vectors, medium batch" },
      { vectorLength: 384, numPairs: 100_000, name: "Medium vectors, large batch" },
      { vectorLength: 1024, numPairs: 1000, name: "Large vectors, small batch" },
      { vectorLength: 1024, numPairs: 10_000, name: "Medium vectors, medium batch" },
      { vectorLength: 1024, numPairs: 100_000, name: "Large vectors, medium batch" },
      { vectorLength: 4096, numPairs: 100, name: "XL vectors, small batch" },
    ];

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      console.log(`\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`) 
      const results: BenchmarkResult = await compareUltimatePerformance(vectorLength, numPairs);
      console.log(`✅ Completed: ${name}`);
      console.log("🚀 Benchmark Results (10k):", results);
    }

  });
});
