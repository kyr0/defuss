import init, { initThreadPool } from "../pkg";
import {
  convolution,
  convolutionInPlace,
  convolutionManaged,
  BufferUtils,
  BatchOperations,
} from "./index.js";
import { createTestDataOptimized } from "./optimized-test-utils.js";

async function quickMemoryTest() {
  console.log("🧠 Quick memory optimization test...");

  // Initialize WASM
  await init();
  try {
    await initThreadPool(navigator.hardwareConcurrency);
  } catch (e) {
    console.log(
      "⚠️ Thread pool initialization failed (expected in some environments)",
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

  console.log("\n🎯 Batch processing test:");
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
    `Batch processing: ${((batchEnd - batchStart) / batchPairs.length).toFixed(4)}ms per op`,
  );

  // Memory statistics
  console.log("\n💾 Final Memory Statistics:");
  const stats = BufferUtils.getStats();
  console.log(
    `Stack: ${stats.stack.usage}/${stats.stack.capacity} bytes (${stats.stack.efficiency.toFixed(1)}% efficiency)`,
  );
  console.log(`Peak stack usage: ${stats.stack.peak} bytes`);
  console.log(`Pool hit rate: ${stats.pools.hitRate}%`);
  console.log(`Total pooled buffers: ${stats.pools.totalPooled}`);
  console.log(`Pool sizes: ${stats.pools.poolCount} different sizes`);

  // Clean up
  batchResults.forEach((result) => BufferUtils.releaseBuffer(result));
  BufferUtils.handleMemoryPressure();

  console.log("\n✅ Quick memory test completed!");
}

quickMemoryTest().catch(console.error);
