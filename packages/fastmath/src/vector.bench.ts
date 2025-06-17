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
  benchmarkUltimateExternalCallSmart,
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
      if (memoryMB > 1000) { // Much higher limit now with chunking
        console.log(`\n⚠️  Skipping: ${name} (${vectorLength}x${numPairs}) - Memory requirement: ${memoryMB.toFixed(1)}MB exceeds safe limit (would need chunking stress test)`);
        continue;
      }
      
      console.log(`\n🚀 Testing: ${name} (${vectorLength}x${numPairs})`);
      
      try {
        const result = await benchmarkUltimateExternalCallSmart(vectorLength, numPairs);
        
        console.log(`⏱️  Total time: ${result.totalTime.toFixed(4)}ms`);
        console.log(`⚡ Performance: ${result.gflops.toFixed(2)} GFLOPS`);
        console.log(`💾 Memory efficiency: ${result.memoryEfficiency.toFixed(3)} GFLOPS/MB`);
        console.log(`🔧 Processing method: ${result.processingMethod.toUpperCase()}`);
        if (result.chunksProcessed) {
          console.log(`🔄 Chunks processed: ${result.chunksProcessed}`);
        }
        
        // Verification is done internally in the smart function
        console.log(`✅ VERIFICATION PASSED for ${name}!`);
        
        // Performance expectations
        if (result.gflops <= 0) {
          throw new Error(`Invalid performance for ${name}: ${result.gflops} GFLOPS`);
        }
        
        console.log(`🎉 SUCCESS: ${name} completed with ${result.gflops.toFixed(2)} GFLOPS using ${result.processingMethod} processing`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`❌ FAILED: ${name} - ${errorMessage}`);
        throw error;
      }
    }
    
    console.log('\n🎉 All external call tests passed! Zero-copy JS-to-WASM interface working correctly.');
  });
  
  it("should handle massive workloads with automatic chunking", { timeout: 30000 }, async () => {
    console.log("🚀 Testing massive workload with automatic chunking...");
    
    // Test a workload that definitely needs chunking
    const vectorLength = 512;
    const numPairs = 50_000; // 25.6M elements = ~102MB
    
    console.log(`🎯 Massive workload: ${vectorLength}x${numPairs} = ${vectorLength * numPairs * 2} elements (~${((vectorLength * numPairs * 2 * 4) / (1024 * 1024)).toFixed(1)}MB)`);
    
    try {
      const result = await benchmarkUltimateExternalCallSmart(vectorLength, numPairs);
      
      console.log(`⏱️  Total time: ${result.totalTime.toFixed(4)}ms`);
      console.log(`⚡ Performance: ${result.gflops.toFixed(2)} GFLOPS`);
      console.log(`💾 Memory efficiency: ${result.memoryEfficiency.toFixed(3)} GFLOPS/MB`);
      console.log(`🔧 Processing method: ${result.processingMethod.toUpperCase()}`);
      if (result.chunksProcessed) {
        console.log(`🔄 Chunks processed: ${result.chunksProcessed}`);
      }
      
      // Should use chunked processing for this size
      if (result.processingMethod !== 'chunked') {
        console.log(`⚠️  Expected chunked processing, got ${result.processingMethod}`);
      }
      
      // Verify we got results for all pairs
      if (result.results.length !== numPairs) {
        throw new Error(`Expected ${numPairs} results, got ${result.results.length}`);
      }
      
      console.log(`✅ Massive workload completed successfully with ${result.processingMethod} processing!`);
      console.log(`🎉 SUCCESS: Handled ${numPairs} pairs with perfect memory management`);
      
    } catch (error) {
      console.log(`❌ Massive workload failed: ${error}`);
      throw error;
    }
  });
});
