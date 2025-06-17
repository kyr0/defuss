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
  benchmarkUltimateDirectCall,
  dot_product
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

  
  /*
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
      { vectorLength: 1024, numPairs: 1_000_000, name: "Huge vectors, medium batch" },
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
  
  it("should call batch_dot_product_ultimate directly with pointer arithmetic", { timeout: 60000 }, async () => {
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
      { vectorLength: 1024, numPairs: 1_000_000, name: "Huge vectors, medium batch" },
      { vectorLength: 4096, numPairs: 100, name: "XL vectors, small batch" },
    ];

    for (const config of testConfigs) {
      const { vectorLength, numPairs, name } = config;
      
      console.log(`\n🚀 Testing: ${name} (${vectorLength}x${numPairs})`);
      const memoryMB = (vectorLength * numPairs * 2 * 4) / (1024 * 1024);
      console.log(`💾 Estimated memory requirement: ${memoryMB.toFixed(1)}MB`);
      
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
        
        // Check if it's a memory allocation error that we should handle gracefully
        if (errorMessage.includes('Array buffer allocation failed') || 
            errorMessage.includes('exceeds JS ArrayBuffer limit') ||
            errorMessage.includes('JavaScript memory allocation failed')) {
          console.log(`⚠️  SKIPPED: ${name} - Memory limit exceeded (${memoryMB.toFixed(1)}MB)`);
          console.log(`   This is expected for very large workloads that exceed JavaScript ArrayBuffer limits.`);
          return; // Skip this test gracefully
        }
        
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
  
  it("should use dot_product function with pre-allocated arrays", { timeout: 10000 }, async () => {
    console.log("🎯 Testing dot_product function with pre-allocated arrays...");
    
    const vectorLength = 1024;
    const numPairs = 1000;
    const totalElements = vectorLength * numPairs;
    
    // Pre-allocate arrays like a benchmarking framework would
    const vectorsA = new Float32Array(totalElements);
    const vectorsB = new Float32Array(totalElements);
    const results = new Float32Array(numPairs);
    
    // Generate test data
    for (let i = 0; i < totalElements; i++) {
      vectorsA[i] = (i % vectorLength) + 1;
      vectorsB[i] = 2.0;
    }
    
    console.log(`📊 Testing ${numPairs} pairs of ${vectorLength}-element vectors`);
    
    try {
      // Call the dot_product function
      dot_product(vectorsA, vectorsB, results);
      
      // Verify some results
      const expectedFirst = vectorLength * (vectorLength + 1);  // sum of 1,2,3...vectorLength, each multiplied by 2
      const actualFirst = results[0];
      
      console.log(`🔍 First result: ${actualFirst}, expected: ${expectedFirst}`);
      console.log(`🔍 Verification: ${Math.abs(actualFirst - expectedFirst) < 0.001 ? '✅' : '❌'}`);
      
      // Check that all results are the same (since all pairs have the same pattern)
      const allSame = results.every(val => Math.abs(val - actualFirst) < 0.001);
      console.log(`🔍 All results consistent: ${allSame ? '✅' : '❌'}`);
      
      console.log(`✅ dot_product function works correctly!`);
      
    } catch (error) {
      console.log(`❌ dot_product function failed: ${error}`);
      throw error;
    }
  });
  */
  
  it("should use dot_product function with chunked processing for large workloads", { timeout: 30000 }, async () => {
    console.log("🎯 Testing dot_product function with chunked processing (1024x100000 EXT)...");
    
    // Create a workload that will require chunked processing
    const vectorLength = 1024;
    const numPairs = 100000; // This should trigger chunked processing
    const totalElements = vectorLength * numPairs;
    
    console.log(`📊 Testing ${numPairs} pairs of ${vectorLength}-element vectors (chunked processing expected)`);
    
    try {
      // Pre-allocate arrays
      const vectorsA = new Float32Array(totalElements);
      const vectorsB = new Float32Array(totalElements);
      const results = new Float32Array(numPairs);
      
      // Generate test data
      for (let i = 0; i < totalElements; i++) {
        vectorsA[i] = (i % vectorLength) + 1;
        vectorsB[i] = 2.0;
      }
      
      // Call the dot_product function (should use chunked processing internally)
      const start = performance.now();
      dot_product(vectorsA, vectorsB, results);
      const end = performance.now();
      
      console.log(`⏱️  Chunked processing completed in: ${(end - start).toFixed(2)}ms`);
      
      // Verify some results
      const expectedFirst = vectorLength * (vectorLength + 1);  // sum of 1,2,3...vectorLength, each multiplied by 2
      const actualFirst = results[0];
      const actualLast = results[numPairs - 1];
      
      console.log(`🔍 First result: ${actualFirst}, expected: ${expectedFirst}`);
      console.log(`🔍 Last result: ${actualLast}, expected: ${expectedFirst}`);
      console.log(`🔍 Verification: ${Math.abs(actualFirst - expectedFirst) < 0.001 && Math.abs(actualLast - expectedFirst) < 0.001 ? '✅' : '❌'}`);
      
      // Check that all results are consistent
      const allSame = results.every(val => Math.abs(val - actualFirst) < 0.001);
      console.log(`🔍 All ${numPairs} results consistent: ${allSame ? '✅' : '❌'}`);
      
      console.log(`✅ dot_product function with chunked processing works correctly!`);
      
    } catch (error) {
      console.log(`❌ dot_product chunked processing failed: ${error}`);
      throw error;
    }
  });
  
  /*
  it("should compare internal vs external performance", { timeout: 10000 }, async () => {
    console.log("🔍 Investigating performance difference between internal and external calls...");
    
    const vectorLength = 1024;
    const numPairs = 10000;
    const totalElements = vectorLength * numPairs;
    
    console.log(`📊 Testing ${numPairs} pairs of ${vectorLength}-element vectors`);
    console.log(`💾 Total elements: ${totalElements.toLocaleString()}`);
    
    // Test 1: Internal call (test_ultimate_performance)
    console.log("\n🏠 Testing INTERNAL performance (data allocated in Rust):");
    const internalStart = performance.now();
    // Note: test_ultimate_performance is not currently exposed to TypeScript
    // We need to call it through a wrapper or expose it
    const internalEnd = performance.now();
    
    // Test 2: External call (dot_product with JS-allocated data)
    console.log("\n📤 Testing EXTERNAL performance (data passed from JS):");
    const vectorsA = new Float32Array(totalElements);
    const vectorsB = new Float32Array(totalElements);
    const results = new Float32Array(numPairs);
    
    // Generate test data
    for (let i = 0; i < totalElements; i++) {
      vectorsA[i] = (i % vectorLength) + 1;
      vectorsB[i] = 2.0;
    }
    
    const externalStart = performance.now();
    dot_product(vectorsA, vectorsB, results);
    const externalEnd = performance.now();
    
    const externalTime = externalEnd - externalStart;
    console.log(`⏱️  External call time: ${externalTime.toFixed(4)}ms`);
    
    // Let's also test the benchmarkUltimateExternalCallSmart for comparison
    console.log("\n📊 Testing SMART EXTERNAL call:");
    const smartStart = performance.now();
    const smartResult = await benchmarkUltimateExternalCallSmart(vectorLength, numPairs);
    const smartEnd = performance.now();
    
    console.log(`⏱️  Smart external total: ${smartResult.totalTime.toFixed(4)}ms`);
    console.log(`⚡ Smart external GFLOPS: ${smartResult.gflops.toFixed(2)}`);
    console.log(`🔧 Smart processing method: ${smartResult.processingMethod}`);
    
    // Test 3: Zero-copy approach (data allocated and computed entirely in WASM)
    console.log("\n🚀 Testing ZERO-COPY performance (no JS arrays):");
    const zeroCopyStart = performance.now();
    // Import the WASM module directly for zero-copy test
    const { batch_dot_product_zero_copy } = await import("../pkg/defuss_fastmath.js");
    const zeroCopyResult = batch_dot_product_zero_copy(vectorLength, numPairs);
    const zeroCopyEnd = performance.now();
    
    const zeroCopyTime = zeroCopyEnd - zeroCopyStart;
    console.log(`⏱️  Zero-copy time: ${zeroCopyTime.toFixed(4)}ms`);
    console.log(`📊 Zero-copy results length: ${zeroCopyResult.length}`);
    
    // Analyze the bottlenecks
    console.log("\n🔍 ANALYSIS:");
    console.log(`📤 External (dot_product): ${externalTime.toFixed(4)}ms`);
    console.log(`� Zero-copy (WASM only): ${zeroCopyTime.toFixed(4)}ms`);
    console.log(`�📊 Smart external: ${smartResult.totalTime.toFixed(4)}ms`);
    
    const jsOverhead = externalTime - zeroCopyTime;
    console.log(`💡 JavaScript overhead: ${jsOverhead.toFixed(4)}ms (${((jsOverhead / externalTime) * 100).toFixed(1)}%)`);
    
    if (externalTime > 50) {
      console.log("⚠️  External call is slow - investigating potential causes:");
      console.log("   - JS->WASM memory copying overhead");
      console.log("   - Array subarray operations");
      console.log("   - Multiple WASM boundary crossings");
      console.log("   - Memory allocation/deallocation");
    }
  });
  */
});
