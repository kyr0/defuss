/**
 * Simple test to debug batch processing without tinybench
 */

import { generateSampleData } from "./vector-test-data.js";
import { vector_dot_product } from "./vector-operations.js";
import { ensureWasmInit } from "./bench-util.js";
import { WasmVectorBatch } from "./wasm-batch-processor.js";
import * as wasm from "../pkg/defuss_fastmath.js";

// Very small scale for debugging
const VECTOR_LENGTH = 10;
const NUM_VECTORS = 5;
const SEED = 42;

export async function runSimpleTest() {
  console.log("🔍 Simple batch test starting...");
  console.log(`Testing: ${NUM_VECTORS} vectors of ${VECTOR_LENGTH} dimensions`);

  try {
    // Initialize WASM
    console.log("1. Initializing WASM...");
    await ensureWasmInit();
    console.log("✅ WASM initialized");

    // Prepare test data
    console.log("2. Preparing test data...");
    const testData = generateSampleData(SEED, VECTOR_LENGTH, NUM_VECTORS);
    const { vectorsA: aVectors, vectorsB: bVectors } = testData;
    console.log("✅ Test data prepared");

    // Convert to flat arrays
    console.log("3. Converting to flat arrays...");
    const aFlat = new Float32Array(aVectors.flatMap((v) => Array.from(v)));
    const bFlat = new Float32Array(bVectors.flatMap((v) => Array.from(v)));
    console.log(
      `✅ Flat arrays created: ${aFlat.length} and ${bFlat.length} elements`,
    );

    // Test 1: JS individual
    console.log("4. Testing JS individual...");
    const jsResults = new Float32Array(NUM_VECTORS);
    for (let i = 0; i < NUM_VECTORS; i++) {
      const a = aVectors[i];
      const b = bVectors[i];
      let sum = 0;
      for (let j = 0; j < VECTOR_LENGTH; j++) {
        sum += a[j] * b[j];
      }
      jsResults[i] = sum;
    }
    console.log(
      `✅ JS individual results: [${Array.from(jsResults)
        .map((x) => x.toFixed(2))
        .join(", ")}]`,
    );

    // Test 2: JS batch
    console.log("5. Testing JS batch...");
    const jsBatchResults = vector_dot_product(aVectors, bVectors);
    console.log(
      `✅ JS batch results: [${Array.from(jsBatchResults)
        .map((x) => x.toFixed(2))
        .join(", ")}]`,
    );

    // Test 3: WASM individual
    console.log("6. Testing WASM individual...");
    const wasmIndividualResults = new Float32Array(NUM_VECTORS);
    for (let i = 0; i < NUM_VECTORS; i++) {
      wasmIndividualResults[i] = wasm.vector_dot_product_single(
        aVectors[i],
        bVectors[i],
      );
    }
    console.log(
      `✅ WASM individual results: [${Array.from(wasmIndividualResults)
        .map((x) => x.toFixed(2))
        .join(", ")}]`,
    );

    // Test 4: WASM batch separated
    console.log("7. Testing WASM batch separated...");
    const wasmBatchResults = wasm.vector_batch_dot_product_separated(
      aFlat,
      bFlat,
      VECTOR_LENGTH,
      NUM_VECTORS,
    );
    console.log(
      `✅ WASM batch results: [${Array.from(wasmBatchResults)
        .map((x) => x.toFixed(2))
        .join(", ")}]`,
    );

    // Test 5: WASM memory-managed batch
    console.log("8. Testing WASM memory-managed batch...");
    const batchProcessor = new WasmVectorBatch();
    await batchProcessor.init(NUM_VECTORS, VECTOR_LENGTH);
    console.log("✅ WasmVectorBatch initialized");

    const wasmManagedResults = batchProcessor.batchDotProduct(
      aFlat,
      bFlat,
      NUM_VECTORS,
    );
    console.log(
      `✅ WASM managed results: [${Array.from(wasmManagedResults)
        .map((x) => x.toFixed(2))
        .join(", ")}]`,
    );

    // Verify results match
    console.log("9. Verifying results match...");
    const tolerance = 1e-5;
    let allMatch = true;

    for (let i = 0; i < NUM_VECTORS; i++) {
      const expected = jsResults[i];
      const tests = [
        jsBatchResults[i],
        wasmIndividualResults[i],
        wasmBatchResults[i],
        wasmManagedResults[i],
      ];

      for (let j = 0; j < tests.length; j++) {
        if (Math.abs(tests[j] - expected) > tolerance) {
          console.error(
            `❌ Mismatch at index ${i}, test ${j}: expected ${expected}, got ${tests[j]}`,
          );
          allMatch = false;
        }
      }
    }

    if (allMatch) {
      console.log("✅ All results match!");
    }

    console.log("🎉 Simple test completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Simple test failed:", error);
    return false;
  }
}

// Run if executed directly
if (
  typeof globalThis !== "undefined" &&
  globalThis.location?.pathname?.endsWith("simple-batch-test.js")
) {
  runSimpleTest().catch(console.error);
}
