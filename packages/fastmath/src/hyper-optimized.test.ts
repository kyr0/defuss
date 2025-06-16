import { describe, it, expect } from "vitest";
import { HyperOptimizedStreaming } from "./hyper-optimized-streaming.js";
import { UltraFastVectorBatch } from "./ultra-fast-batch-processor.js";

describe("Hyper-Optimized Streaming", () => {
  it("should push streaming performance to the absolute limit", async () => {
    console.log(
      "🚀 HYPER-OPTIMIZED STREAMING TEST: 100,000 vectors × 1,024 dimensions",
    );

    const hyper = new HyperOptimizedStreaming();
    const ultraFast = new UltraFastVectorBatch(); // Current champion baseline

    await hyper.init();
    await ultraFast.init();

    const numVectors = 100000;
    const vectorLength = 1024;

    console.log(
      `🎯 Target: ${numVectors.toLocaleString()} vectors × ${vectorLength} dimensions`,
    );
    console.log(
      `📊 Data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );

    // **TEST 1: Lightning-fast data generation**
    console.log("\n⚡ TEST 1: Lightning-Fast Data Generation");
    const lightningGenStart = performance.now();
    const { vectorsA, vectorsB } = hyper.generateTestDataLightning(
      numVectors,
      vectorLength,
      42,
    );
    const lightningGenTime = performance.now() - lightningGenStart;

    console.log(
      `   ✅ Lightning Generation: ${(lightningGenTime / 1000).toFixed(2)}s`,
    );
    console.log(
      `   📈 Rate: ${((numVectors / lightningGenTime) * 1000).toFixed(0)} vectors/sec`,
    );

    // **TEST 2: Compare with current champion (streaming)**
    console.log("\n🏆 TEST 2: Current Champion vs Hyper-Optimized");

    // Current champion: Ultra-fast streaming
    const championStart = performance.now();
    const championResults = await ultraFast.batchDotProductStreaming(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      4096,
    );
    const championTime = performance.now() - championStart;

    // Hyper-optimized: Super-streaming
    const hyperStart = performance.now();
    const hyperResults = await hyper.batchDotProductSuperStreaming(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
    );
    const hyperTime = performance.now() - hyperStart;

    console.log(
      `   🏅 Current Champion: ${(championTime / 1000).toFixed(3)}s (${((numVectors / championTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `   🚀 Hyper-Optimized: ${(hyperTime / 1000).toFixed(3)}s (${((numVectors / hyperTime) * 1000).toFixed(0)} ops/sec)`,
    );

    const speedup = championTime / hyperTime;
    console.log(
      `   📈 Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? "faster" : "slower"}`,
    );

    // **TEST 3: Adaptive chunking**
    console.log("\n🧠 TEST 3: Adaptive Chunking Strategy");
    const adaptiveStart = performance.now();
    const adaptiveResults = await hyper.batchDotProductAdaptive(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
    );
    const adaptiveTime = performance.now() - adaptiveStart;

    console.log(
      `   🎯 Adaptive: ${(adaptiveTime / 1000).toFixed(3)}s (${((numVectors / adaptiveTime) * 1000).toFixed(0)} ops/sec)`,
    );

    // **TEST 4: Memory-pool streaming**
    console.log("\n💾 TEST 4: Memory-Pool Streaming");
    const memoryPool = hyper.createMemoryPoolStreaming(
      numVectors,
      vectorLength,
    );

    const poolStart = performance.now();
    const poolResults = await memoryPool.process(
      vectorsA,
      vectorsB,
      numVectors,
    );
    const poolTime = performance.now() - poolStart;

    const memUsage = memoryPool.getMemoryUsage();
    console.log(
      `   🔄 Memory Pool: ${(poolTime / 1000).toFixed(3)}s (${((numVectors / poolTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `   💾 Memory Usage: ${memUsage.totalMB.toFixed(1)} MB (reusable)`,
    );

    // **TEST 5: All-in-one hyper pipeline**
    console.log("\n🔥 TEST 5: All-In-One Hyper Pipeline");
    const pipelineResult = await hyper.hyperOptimizedPipeline(
      numVectors,
      vectorLength,
      42,
    );

    console.log(`   🚀 Method: ${pipelineResult.method}`);
    console.log(
      `   ⏱️  Total Time: ${(pipelineResult.totalTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   📊 Generation: ${(pipelineResult.generationTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   ⚡ Processing: ${(pipelineResult.processingTime / 1000).toFixed(3)}s`,
    );
    console.log(
      `   🎯 Throughput: ${pipelineResult.opsPerSecond.toFixed(0)} ops/sec`,
    );

    // **TEST 6: Speed test comparison**
    console.log("\n🏁 TEST 6: Speed Test Comparison");
    const speedTestResult = await hyper.speedTest(numVectors, vectorLength, 42);

    console.log("   Method         Time       Ops/Sec");
    console.log("   ------------------------------------");
    for (const result of speedTestResult.results) {
      console.log(
        `   ${result.method.padEnd(13)} ${(result.time / 1000).toFixed(3)}s    ${result.opsPerSecond.toFixed(0)}`,
      );
    }
    console.log(
      `   🏆 Fastest: ${speedTestResult.fastest} (${speedTestResult.fastestOpsPerSecond.toFixed(0)} ops/sec)`,
    );

    // **VERIFY RESULTS ACCURACY**
    console.log("\n🔍 Verifying Results Accuracy...");
    const sampleSize = 1000;

    let hyperVsChampion = true;
    let adaptiveVsChampion = true;
    let poolVsChampion = true;
    let pipelineVsChampion = true;

    for (let i = 0; i < sampleSize; i++) {
      if (Math.abs(hyperResults[i] - championResults[i]) > 1e-5)
        hyperVsChampion = false;
      if (Math.abs(adaptiveResults[i] - championResults[i]) > 1e-5)
        adaptiveVsChampion = false;
      if (Math.abs(poolResults[i] - championResults[i]) > 1e-5)
        poolVsChampion = false;
      if (Math.abs(pipelineResult.results[i] - championResults[i]) > 1e-5)
        pipelineVsChampion = false;
    }

    console.log(
      `   ✅ Hyper vs Champion: ${hyperVsChampion ? "MATCH" : "MISMATCH"}`,
    );
    console.log(
      `   ✅ Adaptive vs Champion: ${adaptiveVsChampion ? "MATCH" : "MISMATCH"}`,
    );
    console.log(
      `   ✅ Pool vs Champion: ${poolVsChampion ? "MATCH" : "MISMATCH"}`,
    );
    console.log(
      `   ✅ Pipeline vs Champion: ${pipelineVsChampion ? "MATCH" : "MISMATCH"}`,
    );

    // Find the absolute best performance
    const allResults = [
      {
        name: "Champion",
        time: championTime,
        ops: (numVectors / championTime) * 1000,
      },
      { name: "Hyper", time: hyperTime, ops: (numVectors / hyperTime) * 1000 },
      {
        name: "Adaptive",
        time: adaptiveTime,
        ops: (numVectors / adaptiveTime) * 1000,
      },
      { name: "Pool", time: poolTime, ops: (numVectors / poolTime) * 1000 },
      {
        name: "Pipeline (proc)",
        time: pipelineResult.processingTime,
        ops: (numVectors / pipelineResult.processingTime) * 1000,
      },
    ];

    const absoluteBest = allResults.reduce((prev, current) =>
      prev.ops > current.ops ? prev : current,
    );

    // Performance classification
    let classification = "🐌 SLOW";
    if (absoluteBest.ops > 50000) classification = "⚡ FAST";
    if (absoluteBest.ops > 100000) classification = "🚀 VERY FAST";
    if (absoluteBest.ops > 500000) classification = "💥 EXTREME SPEED";
    if (absoluteBest.ops > 1000000) classification = "🌟 ULTIMATE SPEED";
    if (absoluteBest.ops > 1500000) classification = "🌌 TRANSCENDENT SPEED";
    if (absoluteBest.ops > 2000000) classification = "🚀🌟 HYPERSONIC SPEED";

    console.log("\n🏆 **HYPER-OPTIMIZED PERFORMANCE SUMMARY:**");
    console.log(
      `   🔢 Operations: ${numVectors.toLocaleString()} dot products`,
    );
    console.log(`   📏 Vector size: ${vectorLength} dimensions each`);
    console.log(
      `   💾 Data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );
    console.log("");
    console.log("   ⚡ **PROCESSING PERFORMANCE:**");
    for (const result of allResults) {
      console.log(
        `   ${result.name.padEnd(15)}: ${(result.time / 1000).toFixed(3)}s (${result.ops.toFixed(0)} ops/sec)`,
      );
    }
    console.log("");
    console.log("   🏅 **ULTIMATE ACHIEVEMENT:**");
    console.log(`   🚀 Best method: ${absoluteBest.name}`);
    console.log(`   ⚡ Best time: ${(absoluteBest.time / 1000).toFixed(3)}s`);
    console.log(`   🎯 Best rate: ${absoluteBest.ops.toFixed(0)} ops/sec`);
    console.log(
      `   📈 Improvement vs 50K baseline: ${(absoluteBest.ops / 50000).toFixed(1)}x faster!`,
    );
    console.log(`   🏆 Performance Class: ${classification}`);

    // Assertions
    expect(
      hyperVsChampion &&
        adaptiveVsChampion &&
        poolVsChampion &&
        pipelineVsChampion,
    ).toBe(true);
    expect(absoluteBest.ops).toBeGreaterThan(500000); // At least 500K ops/sec
    expect(speedTestResult.fastestOpsPerSecond).toBeGreaterThan(100000); // Speed test should be fast
  }, 60000); // 60 second timeout

  it("should demonstrate scalability improvements", async () => {
    console.log("\n📈 HYPER-OPTIMIZED SCALABILITY TEST");
    console.log("Testing hyper-optimized performance across different scales:");
    console.log(
      "Size      Vectors     Gen Time  Proc Time  Total     Ops/Sec    Method",
    );
    console.log(
      "-------------------------------------------------------------------------",
    );

    const hyper = new HyperOptimizedStreaming();
    await hyper.init();

    const testSizes = [
      { name: "Small", vectors: 1000, length: 512 },
      { name: "Medium", vectors: 10000, length: 1024 },
      { name: "Large", vectors: 50000, length: 1024 },
      { name: "Massive", vectors: 100000, length: 1024 },
    ];

    for (const test of testSizes) {
      const result = await hyper.hyperOptimizedPipeline(
        test.vectors,
        test.length,
        42,
      );
      const opsPerSec = test.vectors / (result.totalTime / 1000);

      console.log(
        `${test.name.padEnd(9)} ${test.vectors.toLocaleString().padEnd(11)} ${(result.generationTime / 1000).toFixed(3)}s    ${(result.processingTime / 1000).toFixed(3)}s     ${(result.totalTime / 1000).toFixed(3)}s   ${opsPerSec.toFixed(0).padEnd(10)} ${result.method}`,
      );
    }

    console.log("✅ Hyper-optimized scalability test completed!");
  }, 30000); // 30 second timeout

  it("should test memory efficiency of different approaches", async () => {
    console.log("\n💾 MEMORY EFFICIENCY COMPARISON");

    const hyper = new HyperOptimizedStreaming();
    await hyper.init();

    const numVectors = 25000; // Smaller dataset for quicker testing
    const vectorLength = 1024;

    console.log(`📊 Testing with ${numVectors.toLocaleString()} vectors:`);

    // Test memory pool
    const memoryPool = hyper.createMemoryPoolStreaming(
      numVectors,
      vectorLength,
    );
    const memUsage = memoryPool.getMemoryUsage();

    console.log(
      `   💾 Memory Pool: ${memUsage.totalMB.toFixed(2)} MB (pre-allocated)`,
    );

    // Test multiple runs with the same pool
    const runs = 3;
    console.log(`\n🔄 Testing ${runs} consecutive runs:`);

    const { vectorsA, vectorsB } = hyper.generateTestDataLightning(
      numVectors,
      vectorLength,
      42,
    );

    for (let i = 0; i < runs; i++) {
      const start = performance.now();
      const results = await memoryPool.process(vectorsA, vectorsB, numVectors);
      const time = performance.now() - start;

      console.log(
        `   Run ${i + 1}: ${(time / 1000).toFixed(3)}s (${((numVectors / time) * 1000).toFixed(0)} ops/sec) - ${results.length} results`,
      );
    }

    console.log("✅ Memory efficiency test completed!");
  }, 20000); // 20 second timeout
});
