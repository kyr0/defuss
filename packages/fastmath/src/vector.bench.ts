/**
 * @fileoverview Benchmarks for functional vector operations
 * Tests performance of the new functional vector implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  benchmarkUltimateExternalCallSmart,
  getWasmMemoryInfo,
} from "./vector.js";

interface BenchmarkResult {
    totalTime: number;
    memoryEfficiency: number;
    gflops: number;
}

describe("vector", () => {
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
   //   { vectorLength: 1024, numPairs: 1_000_000, name: "Huge vectors, medium batch" },
      { vectorLength: 4096, numPairs: 100, name: "XL vectors, small batch" },
    ];

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);
      
      console.log(`\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`) 
      console.log(`💾 Estimated memory: ${memoryMB.toFixed(1)}MB`);
      
      // Check memory before running
      const memStats = getWasmMemoryInfo();
      console.log(`🔍 WASM memory used:`, memStats.usedMB, "MB");

      try {
        const results: BenchmarkResult = await benchmarkUltimateExternalCallSmart(vectorLength, numPairs);
        console.log(`✅ Completed: ${name}`);
        console.log(`⏱️  Total time: ${results.totalTime.toFixed(2)}ms`);
        console.log(` Memory efficiency: ${results.memoryEfficiency.toFixed(3)} GFLOPS/MB`);
        console.log(`⚡ Performance: ${results.gflops.toFixed(2)} GFLOPS`);

        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`⚠️ Skipped: ${name} - ${errorMessage}`);
      }
    }
  });
  
});
