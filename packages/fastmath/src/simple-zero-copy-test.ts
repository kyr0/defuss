import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";

/**
 * Simple test to verify zero-copy processor functionality
 */
async function simpleZeroCopyTest() {
  console.log("🧪 Simple Zero-Copy Test");

  try {
    const processor = new ZeroCopyVectorBatch();
    await processor.init();
    console.log("✅ Zero-copy processor initialized");

    // Create simple test data
    const vectorsA = [
      [1.0, 2.0, 3.0],
      [4.0, 5.0, 6.0],
    ];
    const vectorsB = [
      [1.0, 1.0, 1.0],
      [2.0, 2.0, 2.0],
    ];

    console.log("Testing with simple vectors...");
    const results = processor.batchDotProduct(vectorsA, vectorsB, false);

    console.log("Results:", results);
    console.log("Expected: [6.0, 36.0]");

    // Manual verification
    const expected = [
      1 * 1 + 2 * 1 + 3 * 1, // = 6
      4 * 2 + 5 * 2 + 6 * 2, // = 36
    ];

    let allMatch = true;
    for (let i = 0; i < results.length; i++) {
      if (Math.abs(results[i] - expected[i]) > 1e-6) {
        console.error(
          `❌ Mismatch at ${i}: got ${results[i]}, expected ${expected[i]}`,
        );
        allMatch = false;
      }
    }

    if (allMatch) {
      console.log("✅ Zero-copy test passed!");
    } else {
      console.log("❌ Zero-copy test failed!");
    }
  } catch (error) {
    console.error("❌ Test error:", error);
  }
}

simpleZeroCopyTest();
