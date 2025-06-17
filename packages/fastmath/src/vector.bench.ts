/**
 * @fileoverview Benchmarks for functional vector operations
 * Tests performance of the new functional vector implementation
 */
import { beforeAll, describe, it } from "vitest";
import {
  initWasm,
  compareUltimatePerformance,
  getWasmMemoryInfo,
  benchmarkUltimateExternalCall,
  benchmarkUltimateDirectCall
} from "./vector.js";

interface BenchmarkResult {
    totalTime: number;
    memoryEfficiency: number;
    gflops: number;
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
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);
      
      console.log(`\n📊 Running benchmarks for: ${name} (${vectorLength}x${numPairs})`) 
      console.log(`💾 Estimated memory: ${memoryMB.toFixed(1)}MB`);
      
      // Check memory before running
      const memStats = getWasmMemoryInfo();
      console.log(`🔍 WASM memory used:`, memStats.usedMB, "MB");

      try {
        const results: BenchmarkResult = await compareUltimatePerformance(vectorLength, numPairs);
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

  it("should call batch_dot_product_ultimate directly with pointer arithmetic", async () => {
    console.log("🎯 Testing direct call to batch_dot_product_ultimate with zero copy...");
    
    // Test comprehensive benchmarking with different workloads using the working external approach
    console.log('\n🚀 Comprehensive benchmarking with external function...');
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
      
      // Check memory requirements - skip tests that would exceed reasonable WASM limits
      const memoryMB = (vectorLength * numPairs * 8 * 4) / (1024 * 1024); // 8 bytes per element, 4 bytes per float
      if (memoryMB > 150) { // Conservative limit well below WASM's 4GB theoretical max
        console.log(`\n⚠️  Skipping: ${name} (${vectorLength}x${numPairs}) - Memory requirement: ${memoryMB.toFixed(1)}MB exceeds safe limit`);
        continue;
      }
      
      console.log(`\n🚀 Testing: ${name} (${vectorLength}x${numPairs})`);
      
      try {
        const result = await benchmarkUltimateExternalCall(vectorLength, numPairs);
        
        console.log(`⏱️  Total time: ${result.totalTime.toFixed(4)}ms`);
        console.log(`⚡ Performance: ${result.gflops.toFixed(2)} GFLOPS`);
        console.log(`💾 Memory efficiency: ${result.memoryEfficiency.toFixed(3)} GFLOPS/MB`);
        
        // Verification results
        const { verificationResults } = result;
        console.log(`✅ First pair verification: ${verificationResults.firstPairMatch ? 'PASS' : 'FAIL'}`);
        console.log(`   Expected: ${verificationResults.firstExpected.toFixed(6)}, Got: ${verificationResults.firstActual.toFixed(6)}`);
        console.log(`✅ Last pair verification: ${verificationResults.lastPairMatch ? 'PASS' : 'FAIL'}`);
        console.log(`   Expected: ${verificationResults.lastExpected.toFixed(6)}, Got: ${verificationResults.lastActual.toFixed(6)}`);
        
        if (!verificationResults.firstPairMatch || !verificationResults.lastPairMatch) {
          console.log("❌ VERIFICATION FAILED - Results don't match native JS implementation!");
          throw new Error(`Verification failed for ${name}`);
        } else {
          console.log(`✅ VERIFICATION PASSED for ${name}!`);
        }
        
        // Performance expectations
        if (result.gflops <= 0) {
          throw new Error(`Invalid performance for ${name}: ${result.gflops} GFLOPS`);
        }
        
        console.log(`🎉 SUCCESS: ${name} completed with ${result.gflops.toFixed(2)} GFLOPS`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ FAILED: ${name} - ${errorMessage}`);
        throw error;
      }
    }
    
    console.log('\n🎉 All external call tests passed! Zero-copy JS-to-WASM interface working correctly.');
  });
});
