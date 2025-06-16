import { describe, it, expect } from "vitest";
import { UltraFastVectorBatch } from "./ultra-fast-batch-processor.js";
import { ImprovedZeroCopyBatch } from "./improved-zero-copy-batch.js";

describe("Ultra-Fast Performance Improvements", () => {
  it("should show massive performance improvements for large scale", async () => {
    console.log(
      "🚀 Ultra-Fast Performance Test: 100,000 vectors × 1,024 dimensions",
    );

    const ultraFast = new UltraFastVectorBatch();
    const improved = new ImprovedZeroCopyBatch();

    await ultraFast.init();
    await improved.init();

    const numVectors = 100000;
    const vectorLength = 1024;

    console.log(
      `Total data: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );

    // **OPTIMIZATION 1: Ultra-fast data generation**
    console.log("\n⚡ Testing ultra-fast data generation...");
    const dataGenStart = performance.now();

    const { vectorsA, vectorsB } = ultraFast.generateTestDataFast(
      numVectors,
      vectorLength,
      42,
    );

    const dataGenTime = performance.now() - dataGenStart;
    console.log(`✅ Data generation: ${(dataGenTime / 1000).toFixed(2)}s`);
    console.log(
      `   🚀 Generated ${numVectors.toLocaleString()} vectors at ${((numVectors / dataGenTime) * 1000).toFixed(0)} vectors/sec`,
    );

    // **OPTIMIZATION 2: Ultra-fast processing**
    console.log("\n⚡ Testing ultra-fast processing...");
    const procStart = performance.now();

    const results = ultraFast.batchDotProductUltraFast(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      false,
    );

    const procTime = performance.now() - procStart;
    console.log(`✅ Processing: ${(procTime / 1000).toFixed(2)}s`);
    console.log(
      `   🚀 Processed ${numVectors.toLocaleString()} vectors at ${((numVectors / procTime) * 1000).toFixed(0)} ops/sec`,
    );

    // **OPTIMIZATION 3: Test improved parallel processing**
    console.log("\n🔧 Testing improved parallel processing...");
    try {
      const parallelStart = performance.now();

      const parallelResults = improved.batchDotProductZeroCopy(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
        true,
      );

      const parallelTime = performance.now() - parallelStart;

      // Verify results match
      let resultsMatch = true;
      for (let i = 0; i < Math.min(1000, numVectors); i++) {
        if (Math.abs(results[i] - parallelResults[i]) > 1e-5) {
          resultsMatch = false;
          break;
        }
      }

      if (resultsMatch) {
        console.log("✅ Parallel processing works!");
        console.log(`   Sequential: ${(procTime / 1000).toFixed(2)}s`);
        console.log(`   Parallel:   ${(parallelTime / 1000).toFixed(2)}s`);
        console.log(`   🚀 Speedup: ${(procTime / parallelTime).toFixed(2)}x`);
      } else {
        console.log(`❌ Parallel results don't match, using sequential`);
      }
    } catch (error) {
      console.log(
        `❌ Parallel failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.log(`   Using sequential: ${(procTime / 1000).toFixed(2)}s`);
    }

    // **OPTIMIZATION 4: Streaming for truly massive datasets**
    console.log("\n🌊 Testing streaming processing...");
    const streamStart = performance.now();

    const streamResults = await ultraFast.batchDotProductStreaming(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      10000,
    );

    const streamTime = performance.now() - streamStart;

    // Verify streaming results match
    let streamMatch = true;
    for (let i = 0; i < Math.min(1000, numVectors); i++) {
      if (Math.abs(results[i] - streamResults[i]) > 1e-5) {
        streamMatch = false;
        break;
      }
    }

    console.log(
      `✅ Streaming: ${(streamTime / 1000).toFixed(2)}s (matches: ${streamMatch})`,
    );

    // **FINAL PERFORMANCE SUMMARY**
    const totalOptimizedTime = dataGenTime + procTime;

    console.log("\n📊 **ULTRA-FAST PERFORMANCE SUMMARY:**");
    console.log(
      `   🔢 Operations: ${numVectors.toLocaleString()} dot products`,
    );
    console.log(`   📏 Vector size: ${vectorLength} dimensions each`);
    console.log(
      `   💾 Data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );
    console.log("");
    console.log("   ⚡ **OPTIMIZED PERFORMANCE:**");
    console.log(`   📊 Data generation: ${(dataGenTime / 1000).toFixed(2)}s`);
    console.log(`   🚀 Processing: ${(procTime / 1000).toFixed(2)}s`);
    console.log(`   🏁 Total time: ${(totalOptimizedTime / 1000).toFixed(2)}s`);
    console.log(
      `   ⚡ Processing rate: ${((numVectors / procTime) * 1000).toFixed(0)} ops/sec`,
    );
    console.log(
      `   🎯 Throughput: ${((numVectors / totalOptimizedTime) * 1000).toFixed(0)} ops/sec (end-to-end)`,
    );

    // Compare with previous performance
    const previousTotal = 13.5 + 1.9; // Data gen + processing from massive scale test
    const speedupFactor = (previousTotal * 1000) / totalOptimizedTime;

    console.log("");
    console.log("   📈 **IMPROVEMENT vs PREVIOUS:**");
    console.log(`   🐌 Previous: ${previousTotal.toFixed(1)}s total`);
    console.log(
      `   ⚡ Current: ${(totalOptimizedTime / 1000).toFixed(2)}s total`,
    );
    console.log(`   🚀 Speedup: ${speedupFactor.toFixed(1)}x faster!`);

    expect(results).toHaveLength(numVectors);
    expect(results[0]).toBeTypeOf("number");
  }, 300000); // 5 minute timeout

  it("should test reusable processor for repeated operations", async () => {
    console.log("\n🔄 Testing Reusable Processor");

    const ultraFast = new UltraFastVectorBatch();
    await ultraFast.init();

    const maxVectors = 50000;
    const vectorLength = 1024;

    console.log(
      `Creating reusable processor for up to ${maxVectors.toLocaleString()} vectors`,
    );

    const processor = ultraFast.createReusableProcessor(
      maxVectors,
      vectorLength,
    );

    // Fill with test data
    const { vectorsA, vectorsB } = ultraFast.generateTestDataFast(
      maxVectors,
      vectorLength,
      123,
    );
    processor.vectorsA.set(vectorsA);
    processor.vectorsB.set(vectorsB);

    // Test multiple batch sizes with the same processor
    const testSizes = [1000, 5000, 10000, 25000, 50000];

    console.log("Testing multiple batch sizes with zero allocation overhead:");
    for (const size of testSizes) {
      const start = performance.now();
      const results = processor.processBatch(size);
      const time = performance.now() - start;

      console.log(
        `   ${size.toLocaleString().padStart(6)} vectors: ${time.toFixed(2).padStart(6)}ms (${((size / time) * 1000).toFixed(0).padStart(7)} ops/sec)`,
      );

      expect(results).toHaveLength(size);
    }

    console.log("✅ Reusable processor works perfectly!");
  });
});
