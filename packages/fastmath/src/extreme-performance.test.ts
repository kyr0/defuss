import { describe, it, expect } from "vitest";
import { ExtremePerformanceBatch } from "./extreme-performance-batch.js";
import { ExtremeWasmBatch } from "./extreme-wasm-batch.js";
import { UltraFastVectorBatch } from "./ultra-fast-batch-processor.js";

describe("Extreme Performance Improvements", () => {
  it("should achieve extreme performance with all optimizations", async () => {
    console.log(
      "🔥 EXTREME PERFORMANCE TEST: 100,000 vectors × 1,024 dimensions",
    );

    const extreme = new ExtremePerformanceBatch();
    const extremeWasm = new ExtremeWasmBatch();
    const ultraFast = new UltraFastVectorBatch();

    await extreme.init();
    await extremeWasm.init();
    await ultraFast.init();

    const numVectors = 100000;
    const vectorLength = 1024;

    console.log(
      `🎯 Target: ${numVectors.toLocaleString()} vectors × ${vectorLength} dimensions`,
    );
    console.log(
      `📊 Data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );

    // **TEST 1: Optimized JavaScript data generation**
    console.log("\n🚀 TEST 1: Optimized JS Data Generation");
    const jsGenStart = performance.now();
    const { vectorsA: jsA, vectorsB: jsB } = extreme.generateTestDataParallel(
      numVectors,
      vectorLength,
      42,
    );
    const jsGenTime = performance.now() - jsGenStart;

    console.log(`   ✅ JS Generation: ${(jsGenTime / 1000).toFixed(2)}s`);
    console.log(
      `   📈 Rate: ${((numVectors / jsGenTime) * 1000).toFixed(0)} vectors/sec`,
    );

    // **TEST 2: WASM data generation**
    console.log("\n⚡ TEST 2: WASM Data Generation");
    const {
      vectorsA: wasmA,
      vectorsB: wasmB,
      generationTime: wasmGenTime,
    } = extremeWasm.generateTestDataWasm(numVectors, vectorLength, 42);

    console.log(`   ✅ WASM Generation: ${(wasmGenTime / 1000).toFixed(2)}s`);
    console.log(
      `   📈 Rate: ${((numVectors / wasmGenTime) * 1000).toFixed(0)} vectors/sec`,
    );
    console.log(
      `   🚀 Speedup vs JS: ${(jsGenTime / wasmGenTime).toFixed(2)}x`,
    );

    // **TEST 3: Processing comparisons**
    console.log("\n🔥 TEST 3: Processing Speed Comparison");

    // 3a. Streaming (previous best)
    const streamStart = performance.now();
    const streamResults = await ultraFast.batchDotProductStreaming(
      jsA,
      jsB,
      vectorLength,
      numVectors,
      4096,
    );
    const streamTime = performance.now() - streamStart;

    console.log(
      `   📊 Streaming: ${(streamTime / 1000).toFixed(3)}s (${((numVectors / streamTime) * 1000).toFixed(0)} ops/sec)`,
    );

    // 3b. Memory-aligned processing
    const alignedStart = performance.now();
    const alignedResults = await extreme.batchDotProductAligned(
      jsA,
      jsB,
      vectorLength,
      numVectors,
    );
    const alignedTime = performance.now() - alignedStart;

    console.log(
      `   🎯 Aligned: ${(alignedTime / 1000).toFixed(3)}s (${((numVectors / alignedTime) * 1000).toFixed(0)} ops/sec)`,
    );

    // 3c. Hyper-optimized WASM
    const { processingTime: hyperTime, results: hyperResults } =
      extremeWasm.batchDotProductHyperOptimized(
        wasmA,
        wasmB,
        vectorLength,
        numVectors,
      );

    console.log(
      `   ⚡ Hyper-WASM: ${(hyperTime / 1000).toFixed(3)}s (${((numVectors / hyperTime) * 1000).toFixed(0)} ops/sec)`,
    );

    // **TEST 4: Zero-allocation processing**
    console.log("\n🔄 TEST 4: Zero-Allocation Processing");
    const processor = extreme.createZeroAllocationProcessor(
      numVectors,
      vectorLength,
    );

    const zeroAllocStart = performance.now();
    const zeroAllocResults = processor.generateAndProcess(numVectors, 42);
    const zeroAllocTime = performance.now() - zeroAllocStart;

    console.log(
      `   🏆 Zero-Alloc: ${(zeroAllocTime / 1000).toFixed(3)}s (${((numVectors / zeroAllocTime) * 1000).toFixed(0)} ops/sec)`,
    );

    // **TEST 5: All-in-one extreme performance**
    console.log("\n🚀 TEST 5: All-in-One Extreme Performance");
    const extremeResults = await extremeWasm.extremePerformanceTest(
      numVectors,
      vectorLength,
      42,
    );

    console.log(
      `   🔥 Total Time: ${(extremeResults.totalTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   📊 Generation: ${(extremeResults.generationTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   ⚡ Processing: ${(extremeResults.processingTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   🎯 Throughput: ${extremeResults.opsPerSecond.toFixed(0)} ops/sec`,
    );

    // **VERIFY RESULTS ACCURACY**
    console.log("\n🔍 Verifying Results Accuracy...");
    const sampleSize = 1000;

    let streamVsAligned = true;
    let streamVsHyper = true;
    let streamVsZero = true;

    for (let i = 0; i < sampleSize; i++) {
      if (Math.abs(streamResults[i] - alignedResults[i]) > 1e-5)
        streamVsAligned = false;
      if (Math.abs(streamResults[i] - hyperResults[i]) > 1e-5)
        streamVsHyper = false;
      if (Math.abs(streamResults[i] - zeroAllocResults[i]) > 1e-5)
        streamVsZero = false;
    }

    console.log(
      `   ✅ Streaming vs Aligned: ${streamVsAligned ? "MATCH" : "MISMATCH"}`,
    );
    console.log(
      `   ✅ Streaming vs Hyper-WASM: ${streamVsHyper ? "MATCH" : "MISMATCH"}`,
    );
    console.log(
      `   ✅ Streaming vs Zero-Alloc: ${streamVsZero ? "MATCH" : "MISMATCH"}`,
    );

    // **FINAL PERFORMANCE SUMMARY**
    const bestTime = Math.min(
      streamTime,
      alignedTime,
      hyperTime,
      zeroAllocTime,
    );
    const originalTime = 1900; // From previous tests (1.9s)
    const overallSpeedup = originalTime / bestTime;

    console.log("\n🏆 **EXTREME PERFORMANCE SUMMARY:**");
    console.log(
      `   🔢 Operations: ${numVectors.toLocaleString()} dot products`,
    );
    console.log(`   📏 Vector size: ${vectorLength} dimensions each`);
    console.log(
      `   💾 Data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );
    console.log("");
    console.log("   ⚡ **PROCESSING PERFORMANCE:**");
    console.log(
      `   🌊 Streaming:     ${(streamTime / 1000).toFixed(3)}s (${((numVectors / streamTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `   🎯 Aligned:       ${(alignedTime / 1000).toFixed(3)}s (${((numVectors / alignedTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `   ⚡ Hyper-WASM:    ${(hyperTime / 1000).toFixed(3)}s (${((numVectors / hyperTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `   🔄 Zero-Alloc:    ${(zeroAllocTime / 1000).toFixed(3)}s (${((numVectors / zeroAllocTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log("");
    console.log("   🏅 **BEST PERFORMANCE:**");
    console.log(`   🚀 Best time: ${(bestTime / 1000).toFixed(3)}s`);
    console.log(
      `   ⚡ Best rate: ${((numVectors / bestTime) * 1000).toFixed(0)} ops/sec`,
    );
    console.log(
      `   📈 Speedup vs original: ${overallSpeedup.toFixed(1)}x faster!`,
    );

    // Generate performance classification
    const opsPerSec = (numVectors / bestTime) * 1000;
    let classification = "";
    if (opsPerSec > 2000000) classification = "🚀 LUDICROUS SPEED";
    else if (opsPerSec > 1000000) classification = "⚡ EXTREME SPEED";
    else if (opsPerSec > 500000) classification = "🔥 VERY FAST";
    else if (opsPerSec > 100000) classification = "💨 FAST";
    else classification = "🐌 NEEDS WORK";

    console.log(`   🏆 Performance Class: ${classification}`);

    expect(streamVsAligned && streamVsHyper && streamVsZero).toBe(true);
    expect(opsPerSec).toBeGreaterThan(100000); // At least 100k ops/sec
  }, 300000); // 5 minute timeout

  it("should test scalability across different sizes", async () => {
    console.log("\n📈 SCALABILITY TEST");

    const extreme = new ExtremeWasmBatch();
    await extreme.init();

    const testCases = [
      { vectors: 1000, dims: 512, name: "Small" },
      { vectors: 10000, dims: 1024, name: "Medium" },
      { vectors: 50000, dims: 1024, name: "Large" },
      { vectors: 100000, dims: 1024, name: "Massive" },
    ];

    console.log("Testing extreme performance across different scales:");
    console.log(
      "Size".padEnd(10) +
        "Vectors".padEnd(12) +
        "Time".padEnd(10) +
        "Ops/Sec".padEnd(12) +
        "Efficiency",
    );
    console.log("-".repeat(60));

    for (const testCase of testCases) {
      const result = await extreme.extremePerformanceTest(
        testCase.vectors,
        testCase.dims,
        42,
      );

      const efficiency =
        testCase.vectors <= 10000
          ? "Baseline"
          : result.opsPerSecond > 800000
            ? "Excellent"
            : result.opsPerSecond > 500000
              ? "Good"
              : result.opsPerSecond > 200000
                ? "Fair"
                : "Poor";

      console.log(
        testCase.name.padEnd(10) +
          testCase.vectors.toLocaleString().padEnd(12) +
          `${(result.totalTime / 1000).toFixed(3)}s`.padEnd(10) +
          result.opsPerSecond.toFixed(0).padEnd(12) +
          efficiency,
      );

      expect(result.opsPerSecond).toBeGreaterThan(50000);
    }

    console.log("✅ Scalability test completed!");
  });
});
