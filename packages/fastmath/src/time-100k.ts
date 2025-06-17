import {
  initWasm,
  batchDotProductZeroCopyParallel,
  batchDotProductCStyle,
} from "./vector.js";

async function time100kOps() {
  // Initialize WASM
  console.log("🚀 Initializing WASM...");
  await initWasm();

  // Test parameters
  const vectorLength = 1024;
  const numPairs = 100000;
  const totalElements = vectorLength * numPairs;

  console.log(`📊 Timing 100k operations (${vectorLength}D vectors)`);
  console.log(
    `Memory needed: ${((totalElements * 2 * 4) / 1024 / 1024).toFixed(2)} MB`,
  );

  // Generate test data
  console.log("📝 Generating test data...");
  const genStart = performance.now();
  const vectorsA = new Float32Array(totalElements);
  const vectorsB = new Float32Array(totalElements);

  for (let i = 0; i < totalElements; i++) {
    vectorsA[i] = Math.random();
    vectorsB[i] = Math.random();
  }
  const genTime = performance.now() - genStart;
  console.log(`✅ Data generation: ${genTime.toFixed(2)}ms`);

  // Test Sequential (C-style)
  console.log("\n🔄 Testing Sequential (C-style)...");
  const seqStart = performance.now();
  const seqResult = batchDotProductCStyle(
    vectorsA,
    vectorsB,
    vectorLength,
    numPairs,
  );
  const seqTime = performance.now() - seqStart;
  const seqGFLOPS = (numPairs * vectorLength * 2) / (seqTime * 1e6);
  console.log(`⏱️  Sequential: ${seqTime.toFixed(2)}ms`);
  console.log(`🚀 Sequential: ${seqGFLOPS.toFixed(2)} GFLOPS`);

  // Test Parallel
  console.log("\n🔄 Testing Parallel...");
  const parStart = performance.now();
  const parResult = batchDotProductZeroCopyParallel(
    vectorsA,
    vectorsB,
    vectorLength,
    numPairs,
    true,
  );
  const parTime = performance.now() - parStart;
  const parGFLOPS = (numPairs * vectorLength * 2) / (parTime * 1e6);
  console.log(`⏱️  Parallel: ${parTime.toFixed(2)}ms`);
  console.log(`🚀 Parallel: ${parGFLOPS.toFixed(2)} GFLOPS`);

  // Performance comparison
  const speedup = (seqTime / parTime - 1) * 100;
  console.log(`\n📈 Parallel speedup: ${speedup.toFixed(1)}%`);

  // Verify results match
  const maxCheck = Math.min(10, numPairs);
  let allMatch = true;
  for (let i = 0; i < maxCheck; i++) {
    if (Math.abs(seqResult[i] - parResult[i]) > 1e-5) {
      allMatch = false;
      break;
    }
  }
  console.log(`✅ Results match: ${allMatch}`);

  // Total time including initialization
  const totalTime = performance.now() - seqStart + genTime;
  console.log(`\n⏱️  Total end-to-end time: ${totalTime.toFixed(2)}ms`);

  // Check 35ms target
  if (parTime <= 35) {
    console.log(`🎯 TARGET ACHIEVED! (${parTime.toFixed(1)}ms ≤ 35ms)`);
  } else {
    const speedupNeeded = ((parTime / 35 - 1) * 100).toFixed(0);
    console.log(`📈 Need ${speedupNeeded}% speedup for 35ms target`);
  }

  return {
    sequential: seqTime,
    parallel: parTime,
    speedup: speedup,
    total: totalTime,
    gflops: parGFLOPS,
  };
}

// Run the test
time100kOps().catch(console.error);
