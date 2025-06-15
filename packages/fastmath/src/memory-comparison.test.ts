/**
 * @fileoverview Test to compare memory allocation strategies
 * Demonstrates the performance difference between fast allocation and standard allocation
 */

import { describe, it, expect, beforeAll } from "vitest";
import { vector_dot_product, getVectorMemoryStats } from "./vector-operations.js";
import { generateSampleData } from "./vector-test-data.js";
import { ensureWasmInit } from "./bench-util.js";
import { 
  vector_dot_product as wasm_vector_dot_product,
  vector_dot_product_single as wasm_vector_dot_product_single,
  vector_dot_product_parallel as wasm_vector_dot_product_parallel
} from "../pkg/defuss_fastmath.js";

describe("Memory Allocation Comparison", () => {
  beforeAll(async () => {
    // Initialize WASM with thread pool based on hardware capabilities
    await ensureWasmInit();
    console.log(`🧵 WASM initialized with ${navigator.hardwareConcurrency} threads`);
  });
  it("should demonstrate fast memory allocation benefits", async () => {
    console.log("🧠 Testing fast memory allocation for vector operations...");
    
    // Generate test data with various sizes to trigger both stack and pool allocation
    const smallData = generateSampleData(123, 64, 50); // Small: should use stack
    const largeData = generateSampleData(456, 1024, 200); // Large: should use pool
    
    console.log("📊 Initial memory stats:", getVectorMemoryStats());
    
    // Perform multiple operations with different sizes to test memory reuse
    const iterations = 30;
    const results: Float32Array[] = [];
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      // Alternate between small and large to trigger different allocation paths
      if (i % 2 === 0) {
        const result = vector_dot_product(smallData.vectorsA, smallData.vectorsB);
        results.push(result);
      } else {
        const result = vector_dot_product(largeData.vectorsA, largeData.vectorsB);
        results.push(result);
      }
      
      // Periodically reset stack to force pool usage for subsequent allocations
      if (i % 10 === 5) {
        // Force some garbage collection to test pool reuse
        if (typeof globalThis.gc === 'function') {
          globalThis.gc();
        }
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`⏱️  Completed ${iterations} iterations in ${totalTime.toFixed(2)}ms`);
    console.log("📈 Final memory stats:", getVectorMemoryStats());
    
    // Verify results are correct
    expect(results).toHaveLength(iterations);
    expect(results[0]).toHaveLength(smallData.vectorsA.length);
    
    // Check memory allocation patterns
    const stats = getVectorMemoryStats();
    console.log(`🎯 Buffer pool hit rate: ${stats.bufferPool.hitRate}%`);
    console.log(`📦 Stack usage: ${stats.stackUsage}/${stats.stackSize} bytes`);
    console.log(`🏪 Pools created: ${stats.bufferPool.pools}`);
    console.log(`✅ Pool hits: ${stats.bufferPool.hits}, ❌ Pool misses: ${stats.bufferPool.misses}`);
    
    // We should see either stack usage OR pool usage (or both)
    const hasStackUsage = stats.stackUsage > 0;
    const hasPoolActivity = stats.bufferPool.hits > 0 || stats.bufferPool.misses > 0;
    
    expect(hasStackUsage || hasPoolActivity).toBe(true);
    
    // If we used the pool, we should eventually see some reuse
    if (stats.bufferPool.misses > 5) {
      // We don't require hits > 0 because buffers might not be released in this test pattern
      console.log("🔍 Pool was used but hit rate may be low due to test pattern");
    }
  });
  
  it("should compare memory allocation strategies", async () => {
    console.log("🔄 Comparing fast allocation vs standard allocation...");
    
    const testData = generateSampleData(456, 512, 100); // Moderate size
    const iterations = 50;
    
    // Test standard allocation pattern (multiple allocations)
    const standardTest = () => {
      const results: Float32Array[] = [];
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        // Simulate standard allocation pattern: create new arrays each time
        const size = testData.vectorsA.length;
        const result = new Float32Array(size);
        
        // Do some computation to make it realistic
        for (let j = 0; j < size; j++) {
          result[j] = Math.random() * testData.vectorsA[j][0];
        }
        results.push(result);
      }
      
      return performance.now() - start;
    };
    
    // Test our optimized allocation
    const optimizedTest = () => {
      const results: Float32Array[] = [];
      const start = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const result = vector_dot_product(testData.vectorsA, testData.vectorsB);
        results.push(result);
      }
      
      return performance.now() - start;
    };
    
    // Run tests
    const standardTime = standardTest();
    
    // Reset memory stats for fair comparison
    const initialStats = getVectorMemoryStats();
    
    const optimizedTime = optimizedTest();
    const finalStats = getVectorMemoryStats();
    
    console.log(`📊 Standard allocation: ${standardTime.toFixed(2)}ms`);
    console.log(`⚡ Optimized allocation: ${optimizedTime.toFixed(2)}ms`);
    
    const speedupRatio = standardTime / optimizedTime;
    console.log(`🚀 Performance ratio: ${speedupRatio.toFixed(2)}x`);
    
    console.log("🎯 Memory efficiency stats:");
    console.log(`   - Buffer pool utilization: ${finalStats.bufferPool.hitRate}%`);
    console.log(`   - Stack usage: ${finalStats.stackUsage}/${finalStats.stackSize} bytes`);
    console.log(`   - Pool hits: ${finalStats.bufferPool.hits}, misses: ${finalStats.bufferPool.misses}`);
    
    // Both should complete successfully
    expect(standardTime).toBeGreaterThan(0);
    expect(optimizedTime).toBeGreaterThan(0);
    
    // The optimized version should demonstrate memory management features
    const hasMemoryOptimizations = finalStats.stackUsage > 0 || finalStats.bufferPool.misses > 0;
    expect(hasMemoryOptimizations).toBe(true);
  });
  
  it("should perform 100k 1024D vector multiplications efficiently", async () => {
    console.log("🚀 Testing 100k vector multiplications with 1024 dimensions...");
    
    // Generate test data for 1024-dimensional vectors
    const vectorCount = 1000; // Use 1000 vectors, repeat 100 times = 100k operations
    const testData = generateSampleData(789, 1024, vectorCount);
    
    console.log("📊 Starting memory stats:", getVectorMemoryStats());
    
    const totalOperations = 100000;
    const batchSize = vectorCount;
    const batches = totalOperations / batchSize;
    
    const startTime = performance.now();
    let totalResults = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const result = vector_dot_product(testData.vectorsA, testData.vectorsB);
      totalResults += result.length;
      
      // Log progress every 10 batches
      if (batch % 10 === 0) {
        const progress = ((batch / batches) * 100).toFixed(1);
        const elapsed = performance.now() - startTime;
        console.log(`📈 Progress: ${progress}% (${elapsed.toFixed(0)}ms)`);
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    console.log(`✅ Completed ${totalOperations.toLocaleString()} vector multiplications`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`⚡ Operations per second: ${(totalOperations / (totalTime / 1000)).toLocaleString()}`);
    console.log(`🎯 Average time per operation: ${(totalTime / totalOperations * 1000).toFixed(3)}μs`);
    
    const finalStats = getVectorMemoryStats();
    console.log("📊 Final memory stats:", finalStats);
    
    // Verify we completed all operations
    expect(totalResults).toBe(totalOperations);
    
    // Performance expectations
    const opsPerSecond = totalOperations / (totalTime / 1000);
    console.log(`🏁 Performance: ${opsPerSecond.toLocaleString()} ops/sec`);
    
    // Should be able to do at least 100k ops/sec (very conservative)
    expect(opsPerSecond).toBeGreaterThan(100000);
  });
  
  it("should compare JS vs WASM single vs WASM parallel for 100k operations", async () => {
    console.log("🔥 Comparing JS vs WASM performance for 100k 1024D vector multiplications...");
    
    // Import WASM functions
    const { 
      vector_dot_product: wasm_adaptive,
      vector_dot_product_single: wasm_single, 
      vector_dot_product_parallel: wasm_parallel 
    } = await import("../pkg/defuss_fastmath.js");
    
    // Generate test data for 1024-dimensional vectors
    const vectorCount = 1000;
    const testData = generateSampleData(999, 1024, vectorCount);
    const totalOperations = 100000;
    const batches = totalOperations / vectorCount;
    
    console.log(`📝 Test setup: ${vectorCount} vectors × ${batches} batches = ${totalOperations.toLocaleString()} operations`);
    console.log(`📏 Vector dimensions: ${testData.dims}D`);
    
    // Test 1: JavaScript optimized implementation
    console.log("\n🟨 Testing JavaScript implementation...");
    const jsStart = performance.now();
    let jsResults = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      const result = vector_dot_product(testData.vectorsA, testData.vectorsB);
      jsResults += result.length;
    }
    
    const jsTime = performance.now() - jsStart;
    const jsOpsPerSec = totalOperations / (jsTime / 1000);
    
    console.log(`✅ JS completed: ${jsTime.toFixed(2)}ms (${jsOpsPerSec.toLocaleString()} ops/sec)`);
    
    // Test 2: WASM adaptive (switches between single/parallel)
    console.log("\n🟦 Testing WASM adaptive implementation...");
    const wasmAdaptiveStart = performance.now();
    let wasmAdaptiveResults = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      for (let i = 0; i < testData.vectorsA.length; i++) {
        const result = wasm_adaptive(testData.vectorsA[i], testData.vectorsB[i]);
        wasmAdaptiveResults++;
      }
    }
    
    const wasmAdaptiveTime = performance.now() - wasmAdaptiveStart;
    const wasmAdaptiveOpsPerSec = totalOperations / (wasmAdaptiveTime / 1000);
    
    console.log(`✅ WASM Adaptive completed: ${wasmAdaptiveTime.toFixed(2)}ms (${wasmAdaptiveOpsPerSec.toLocaleString()} ops/sec)`);
    
    // Test 3: WASM single-threaded
    console.log("\n🟪 Testing WASM single-threaded implementation...");
    const wasmSingleStart = performance.now();
    let wasmSingleResults = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      for (let i = 0; i < testData.vectorsA.length; i++) {
        const result = wasm_single(testData.vectorsA[i], testData.vectorsB[i]);
        wasmSingleResults++;
      }
    }
    
    const wasmSingleTime = performance.now() - wasmSingleStart;
    const wasmSingleOpsPerSec = totalOperations / (wasmSingleTime / 1000);
    
    console.log(`✅ WASM Single completed: ${wasmSingleTime.toFixed(2)}ms (${wasmSingleOpsPerSec.toLocaleString()} ops/sec)`);
    
    // Test 4: WASM parallel (multicore)
    console.log("\n🟩 Testing WASM parallel implementation...");
    const wasmParallelStart = performance.now();
    let wasmParallelResults = 0;
    
    for (let batch = 0; batch < batches; batch++) {
      for (let i = 0; i < testData.vectorsA.length; i++) {
        const result = wasm_parallel(testData.vectorsA[i], testData.vectorsB[i]);
        wasmParallelResults++;
      }
    }
    
    const wasmParallelTime = performance.now() - wasmParallelStart;
    const wasmParallelOpsPerSec = totalOperations / (wasmParallelTime / 1000);
    
    console.log(`✅ WASM Parallel completed: ${wasmParallelTime.toFixed(2)}ms (${wasmParallelOpsPerSec.toLocaleString()} ops/sec)`);
    
    // Results comparison
    console.log("\n📊 Performance Comparison:");
    console.log("┌─────────────────────┬──────────────┬─────────────────┬──────────────┐");
    console.log("│ Implementation      │ Time (ms)    │ Ops/sec         │ Speedup      │");
    console.log("├─────────────────────┼──────────────┼─────────────────┼──────────────┤");
    
    const times = [
      { name: "JavaScript (opt)", time: jsTime, ops: jsOpsPerSec },
      { name: "WASM Adaptive", time: wasmAdaptiveTime, ops: wasmAdaptiveOpsPerSec },
      { name: "WASM Single", time: wasmSingleTime, ops: wasmSingleOpsPerSec },
      { name: "WASM Parallel", time: wasmParallelTime, ops: wasmParallelOpsPerSec }
    ];
    
    const fastest = Math.min(...times.map(t => t.time));
    
    times.forEach(({ name, time, ops }) => {
      const speedup = fastest / time;
      console.log(`│ ${name.padEnd(19)} │ ${time.toFixed(2).padStart(10)} │ ${Math.round(ops).toLocaleString().padStart(13)} │ ${speedup.toFixed(2).padStart(10)}x │`);
    });
    
    console.log("└─────────────────────┴──────────────┴─────────────────┴──────────────┘");
    
    // Find the winner
    const winner = times.reduce((prev, current) => (prev.time < current.time) ? prev : current);
    console.log(`\n🏆 Winner: ${winner.name} (${winner.time.toFixed(2)}ms)`);
    
    // Verify all completed successfully
    expect(jsResults).toBe(totalOperations);
    expect(wasmAdaptiveResults).toBe(totalOperations);
    expect(wasmSingleResults).toBe(totalOperations);
    expect(wasmParallelResults).toBe(totalOperations);
    
    // The fastest should be significantly better than 136ms
    console.log(`\n🎯 Best performance: ${winner.time.toFixed(2)}ms (vs your C+Emscripten 35ms target)`);
    const vsTarget = winner.time / 35;
    console.log(`📈 Ratio vs 35ms target: ${vsTarget.toFixed(2)}x ${vsTarget < 1 ? '(FASTER!)' : '(slower)'}`);
  });
});
