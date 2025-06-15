import { describe, it } from "vitest";
import { Bench } from "tinybench";
import init, { initThreadPool } from "../pkg";
import {
  convolution,
  convolutionInPlace,
  convolutionManaged,
  BufferUtils,
  BatchOperations,
} from "./index.js";
import { convolution as convolution_js } from "./convolution.js";
import { convolution as convolution_wasm } from "../pkg/defuss_fastmath.js";
import {
  createTestDataOptimized,
  BenchmarkUtils,
} from "./optimized-test-utils.js";

describe("Memory Allocation Benchmarks", () => {
  it("should compare allocation strategies", async () => {
    console.log("🧠 Starting memory allocation benchmarks...");

    // Initialize WASM
    await init();
    await initThreadPool(navigator.hardwareConcurrency);
    console.log("✅ WASM initialized");

    // Pre-allocate benchmark buffers
    BenchmarkUtils.preAllocateBenchmarkBuffers();

    const testSize = 128;
    const kernelSize = 8;
    const iterations = 1000;

    console.log(
      `\n📊 Testing with ${testSize}x${kernelSize} over ${iterations} iterations`,
    );

    // Generate test data once
    const signal = createTestDataOptimized.signal(testSize);
    const kernel = createTestDataOptimized.kernel1D(kernelSize);

    // Pre-allocate result buffer for in-place operations
    const reusableResult = new Float32Array(testSize + kernelSize - 1);

    const bench = new Bench({ time: 2000, iterations: 100 });

    bench
      .add("Traditional (new allocation each time)", () => {
        const result = new Float32Array(testSize + kernelSize - 1);
        convolution_js(signal, kernel, result);
      })
      .add("Managed API (buffer pool)", () => {
        const result = convolutionManaged(signal, kernel);
        BufferUtils.releaseBuffer(result);
      })
      .add("In-place (zero allocation)", () => {
        convolutionInPlace(signal, kernel, reusableResult);
      })
      .add("Smart adaptive (with optimizations)", () => {
        const result = convolution(signal, kernel);
        BufferUtils.releaseBuffer(result);
      })
      .add("Stack allocation (small buffers)", () => {
        BufferUtils.resetStack();
        const smallSignal = createTestDataOptimized.signal(32);
        const smallKernel = createTestDataOptimized.kernel1D(3);
        convolution(smallSignal, smallKernel); // Should use stack
      });

    await bench.run();

    console.log("\n📊 Memory Allocation Benchmark Results:");
    bench.tasks.forEach((task) => {
      if (task.result) {
        console.log(`${task.name}:`);
        console.log(
          `  Operations/sec: ${Math.round(task.result.hz).toLocaleString()}`,
        );
        console.log(`  Time: ${(task.result.mean * 1000).toFixed(4)}ms`);
        console.log(
          `  Memory efficiency: ${
            task.name.includes("zero allocation")
              ? "🟢 Zero"
              : task.name.includes("pool") || task.name.includes("Stack")
                ? "🟡 Optimized"
                : "🔴 Standard"
          }`,
        );
      }
    });

    // Test batch operations
    console.log("\n🚀 Testing batch operations...");

    const batchPairs = Array.from({ length: 50 }, (_, i) => ({
      signal: createTestDataOptimized.signal(64 + i),
      kernel: createTestDataOptimized.kernel1D(4 + (i % 3)),
    }));

    const batchStartTime = performance.now();
    const batchResults = BatchOperations.convolutionBatch(batchPairs, {
      reuseBuffers: true,
    });
    const batchEndTime = performance.now();

    console.log(
      `Batch processed ${batchPairs.length} convolutions in ${(batchEndTime - batchStartTime).toFixed(2)}ms`,
    );
    console.log(
      `Average per operation: ${((batchEndTime - batchStartTime) / batchPairs.length).toFixed(4)}ms`,
    );

    // Memory statistics
    console.log("\n💾 Memory Usage Statistics:");
    const stats = BufferUtils.getStats();
    console.log(
      `Stack usage: ${stats.stack.usage} / ${stats.stack.capacity} bytes (${stats.stack.efficiency.toFixed(1)}%)`,
    );
    console.log(`Buffer pools: ${stats.pools.sizes.length} different sizes`);
    stats.pools.sizes.forEach(({ bufferSize, pooledCount }) => {
      console.log(`  - Size ${bufferSize}: ${pooledCount} buffers pooled`);
    });

    // Test cache efficiency
    console.log("\n📈 Test Data Cache Statistics:");
    const cacheStats = createTestDataOptimized.getCacheStats();
    console.log(`Cache entries: ${cacheStats.entryCount}`);
    console.log(
      `Total cached memory: ${(cacheStats.totalMemory / 1024).toFixed(2)} KB`,
    );

    // Memory pressure test
    BenchmarkUtils.memoryPressureTest(1000);

    // Cleanup
    batchResults.forEach((result) => BufferUtils.releaseBuffer(result));
    BufferUtils.resetStack();

    console.log("\n✅ Memory allocation benchmarks completed!");
  });

  it("should demonstrate enhanced allocation patterns", async () => {
    console.log("\n🔬 Enhanced Allocation Pattern Analysis...");

    // Initialize WASM
    await init();
    try {
      await initThreadPool(navigator.hardwareConcurrency);
    } catch (e) {
      console.log(
        "⚠️ Thread pool initialization failed (using single-threaded mode)",
      );
    }

    // Pre-warm the system
    BufferUtils.preWarm();

    const testSize = 128;
    const kernelSize = 8;
    const iterations = 1000;

    console.log(
      `\n📊 Testing ${iterations} iterations of ${testSize}x${kernelSize}`,
    );

    // Generate test data
    const signal = createTestDataOptimized.signal(testSize);
    const kernel = createTestDataOptimized.kernel1D(kernelSize);
    const reusableResult = new Float32Array(testSize + kernelSize - 1);

    console.log("\n🔥 Stack allocation test (small buffers):");
    const stackStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      const smallSignal = createTestDataOptimized.signal(32);
      const smallKernel = createTestDataOptimized.kernel1D(3);
      const result = convolution(smallSignal, smallKernel);
      if (i % 100 === 0) BufferUtils.resetStack();
    }
    const stackEnd = performance.now();
    console.log(
      `Stack allocations: ${((stackEnd - stackStart) / iterations).toFixed(4)}ms per op`,
    );

    console.log("\n♻️ Pool allocation test (medium buffers):");
    const poolStart = performance.now();
    const poolResults: Float32Array[] = [];
    for (let i = 0; i < iterations; i++) {
      const result = convolution(signal, kernel);
      poolResults.push(result);
    }
    const poolEnd = performance.now();
    console.log(
      `Pool allocations: ${((poolEnd - poolStart) / iterations).toFixed(4)}ms per op`,
    );

    // Clean up pool test
    poolResults.forEach((result) => BufferUtils.releaseBuffer(result));

    console.log("\n⚡ In-place test (zero allocation):");
    const inPlaceStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      convolutionInPlace(signal, kernel, reusableResult);
    }
    const inPlaceEnd = performance.now();
    console.log(
      `In-place operations: ${((inPlaceEnd - inPlaceStart) / iterations).toFixed(4)}ms per op`,
    );

    console.log("\n🎯 Enhanced batch processing test:");
    const batchPairs = Array.from({ length: 100 }, (_, i) => ({
      signal: createTestDataOptimized.signal(64 + (i % 32)),
      kernel: createTestDataOptimized.kernel1D(4 + (i % 3)),
    }));

    const batchStart = performance.now();
    const batchResults = BatchOperations.convolutionBatch(batchPairs, {
      reuseBuffers: true,
      preAllocateResults: true,
      useSharedWorkspace: true,
    });
    const batchEnd = performance.now();
    console.log(
      `Enhanced batch processing: ${((batchEnd - batchStart) / batchPairs.length).toFixed(4)}ms per op`,
    );

    // Test streaming for very large datasets
    console.log("\n🌊 Streaming processing test:");
    const largeBatch = Array.from({ length: 500 }, (_, i) => ({
      signal: createTestDataOptimized.signal(32 + (i % 16)),
      kernel: createTestDataOptimized.kernel1D(3 + (i % 2)),
    }));

    const streamStart = performance.now();
    let streamedCount = 0;
    for (const batch of BatchOperations.convolutionStream(largeBatch, 50)) {
      streamedCount += batch.length;
      // Release immediately in streaming mode
      batch.forEach((result) => BufferUtils.releaseBuffer(result));
    }
    const streamEnd = performance.now();
    console.log(
      `Streamed ${streamedCount} operations: ${((streamEnd - streamStart) / streamedCount).toFixed(4)}ms per op`,
    );

    // Enhanced memory statistics
    console.log("\n💾 Enhanced Memory Statistics:");
    const stats = BufferUtils.getStats();
    console.log(
      `Stack: ${stats.stack.usage}/${stats.stack.capacity} bytes (${stats.stack.efficiency.toFixed(1)}% efficiency)`,
    );
    console.log(`Peak stack usage: ${stats.stack.peak} bytes`);
    console.log(`Pool hit rate: ${stats.pools.hitRate}%`);
    console.log(`Total pooled buffers: ${stats.pools.totalPooled}`);
    console.log(`Pool sizes: ${stats.pools.poolCount} different sizes`);

    // Test memory pressure handling
    console.log("\n🧯 Memory pressure handling test:");
    BufferUtils.handleMemoryPressure();
    const statsAfterPressure = BufferUtils.getStats();
    console.log(
      `Stack after pressure: ${statsAfterPressure.stack.usage} bytes`,
    );
    console.log(
      `Pools after pressure: ${statsAfterPressure.pools.totalPooled} buffers`,
    );

    // Clean up
    batchResults.forEach((result) => BufferUtils.releaseBuffer(result));

    console.log("\n✅ Enhanced allocation pattern analysis completed!");
  });
});
