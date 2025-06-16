import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";
import { generateSampleData } from "./vector-test-data.js";
import { vector_dot_product } from "./vector-operations.js";

/**
 * Test the zero-copy batch processor with minimal memory copying
 */
async function testZeroCopyProcessor() {
  console.log("🧪 Testing Zero-Copy Batch Processor");

  const processor = new ZeroCopyVectorBatch();
  await processor.init();

  // Test with small scale first
  const numVectors = 10;
  const vectorLength = 256;

  console.log(`Testing: ${numVectors} vectors of ${vectorLength} dimensions`);

  const { vectorsA, vectorsB } = generateSampleData(
    31337,
    vectorLength,
    numVectors,
  );

  // Test zero-copy batch processing
  console.log("Running zero-copy batch processing...");
  const start = performance.now();
  const wasmResults = processor.batchDotProduct(vectorsA, vectorsB, false);
  const wasmTime = performance.now() - start;

  // Compare with JavaScript results
  console.log("Computing JavaScript reference results...");
  const jsResults = vectorsA.map((a: Float32Array, i: number) =>
    vector_dot_product(a, vectorsB[i]),
  );

  // Verify results match
  let allMatch = true;
  const tolerance = 1e-6;
  for (let i = 0; i < numVectors; i++) {
    if (Math.abs(wasmResults[i] - jsResults[i]) > tolerance) {
      console.error(
        `❌ Mismatch at index ${i}: WASM=${wasmResults[i]}, JS=${jsResults[i]}`,
      );
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log("✅ All results match!");
    console.log(`⚡ Zero-copy processing time: ${wasmTime.toFixed(2)}ms`);
    console.log(
      `📊 Processing rate: ${((numVectors / wasmTime) * 1000).toFixed(0)} vectors/sec`,
    );
  } else {
    console.log("❌ Results do not match");
  }
}

// Test with larger scale
async function testLargeScale() {
  console.log("\n🚀 Testing Large Scale Zero-Copy Processing");

  const processor = new ZeroCopyVectorBatch();
  await processor.init();

  const numVectors = 1000;
  const vectorLength = 1024;

  console.log(`Testing: ${numVectors} vectors of ${vectorLength} dimensions`);
  console.log(
    `Total data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
  );

  const { vectorsA, vectorsB } = generateSampleData(
    31337,
    vectorLength,
    numVectors,
  );

  // Test sequential vs parallel
  console.log("Testing sequential zero-copy...");
  const seqStart = performance.now();
  const seqResults = processor.batchDotProduct(vectorsA, vectorsB, false);
  const seqTime = performance.now() - seqStart;

  console.log("Testing parallel zero-copy...");
  const parStart = performance.now();
  const parResults = processor.batchDotProduct(vectorsA, vectorsB, true);
  const parTime = performance.now() - parStart;

  // Compare results
  let resultsMatch = true;
  const tolerance = 1e-6;
  for (let i = 0; i < Math.min(100, numVectors); i++) {
    // Check first 100
    if (Math.abs(seqResults[i] - parResults[i]) > tolerance) {
      console.error(
        `❌ Sequential vs Parallel mismatch at ${i}: ${seqResults[i]} vs ${parResults[i]}`,
      );
      resultsMatch = false;
    }
  }

  if (resultsMatch) {
    console.log("✅ Sequential and parallel results match!");
    console.log(
      `⚡ Sequential: ${seqTime.toFixed(2)}ms (${((numVectors / seqTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `🚀 Parallel:   ${parTime.toFixed(2)}ms (${((numVectors / parTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(`📈 Speedup: ${(seqTime / parTime).toFixed(2)}x`);
  } else {
    console.log("❌ Sequential and parallel results do not match");
  }
}

// Run tests
export async function runZeroCopyTests() {
  try {
    await testZeroCopyProcessor();
    await testLargeScale();
    console.log("\n🎉 Zero-copy tests completed!");
  } catch (error) {
    console.error("❌ Zero-copy test failed:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runZeroCopyTests();
}
