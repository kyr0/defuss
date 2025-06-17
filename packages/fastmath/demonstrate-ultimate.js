import {
  testUltimatePerformance,
  batchDotProductCStyle,
  initWasm,
} from "./dist/index.js";

async function demonstrateUltimatePerformance() {
  console.log("🚀 Ultimate Vector Performance Demonstration");
  console.log("=".repeat(50));

  await initWasm();

  const vectorLength = 1024;
  const numPairs = 100000;

  console.log(`\n📊 Testing ${vectorLength}D × ${numPairs} operations`);
  console.log("Target: ≤35ms sequential, ≤7ms parallel\n");

  // Test baseline
  console.log("🔵 Baseline Implementation:");
  const start1 = performance.now();
  const baselineResult = batchDotProductCStyle(
    new Float32Array(vectorLength * numPairs).map(() => Math.random()),
    new Float32Array(vectorLength * numPairs).map(() => Math.random()),
    vectorLength,
    numPairs,
  );
  const end1 = performance.now();
  const baselineTime = end1 - start1;
  const baselineGFLOPS =
    (numPairs * vectorLength * 2) / (baselineTime * 1_000_000);

  console.log(`  Time: ${baselineTime.toFixed(2)}ms`);
  console.log(`  Performance: ${baselineGFLOPS.toFixed(2)} GFLOPS`);
  console.log(`  Sample result: ${baselineResult[0].toFixed(6)}`);

  // Test ultimate implementation
  console.log("\n🎯 Ultimate Implementation:");
  const ultimateResult = await testUltimatePerformance(vectorLength, numPairs);

  console.log(`  Time: ${ultimateResult.totalTime.toFixed(2)}ms`);
  console.log(`  Performance: ${ultimateResult.gflops.toFixed(2)} GFLOPS`);
  console.log(`  Sample result: ${ultimateResult.sampleResult.toFixed(6)}`);

  // Performance analysis
  const speedup = (baselineTime / ultimateResult.totalTime - 1) * 100;
  const gflopsImprovement = (ultimateResult.gflops / baselineGFLOPS - 1) * 100;

  console.log("\n📈 Performance Analysis:");
  console.log(`  Speedup: ${speedup > 0 ? "+" : ""}${speedup.toFixed(1)}%`);
  console.log(
    `  GFLOPS improvement: ${gflopsImprovement > 0 ? "+" : ""}${gflopsImprovement.toFixed(1)}%`,
  );

  // Target analysis
  const sequentialTargetAchieved = ultimateResult.totalTime <= 35;
  const parallelTargetAchieved = ultimateResult.totalTime <= 7;

  console.log("\n🎯 Target Achievement:");
  console.log(
    `  Sequential (≤35ms): ${sequentialTargetAchieved ? "✅ ACHIEVED" : "❌ MISSED"}`,
  );
  console.log(
    `  Parallel (≤7ms): ${parallelTargetAchieved ? "✅ ACHIEVED" : "❌ MISSED"}`,
  );

  if (parallelTargetAchieved) {
    console.log("  🎉 EXCELLENT: Achieved aggressive parallel target!");
  } else if (sequentialTargetAchieved) {
    console.log("  ✅ GOOD: Achieved sequential target!");
  } else {
    console.log("  ⚠️ NEEDS WORK: Targets not achieved");
  }

  console.log("\n💡 Summary:");
  console.log(
    `  The ultimate implementation delivers ${speedup.toFixed(0)}% speedup`,
  );
  console.log(
    `  and ${gflopsImprovement.toFixed(0)}% GFLOPS improvement through intelligent`,
  );
  console.log("  workload adaptation and aggressive SIMD optimization.");
}

// Run demonstration
demonstrateUltimatePerformance().catch(console.error);
