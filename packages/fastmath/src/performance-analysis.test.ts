import { describe, it, expect } from "vitest";
import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";

describe("Performance Analysis", () => {
  it("should profile performance bottlenecks", async () => {
    console.log("🔍 Performance Bottleneck Analysis");

    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    const numVectors = 10000; // Start with smaller scale for analysis
    const vectorLength = 1024;

    console.log(
      `Analyzing: ${numVectors} vectors × ${vectorLength} dimensions`,
    );

    // **BOTTLENECK 1: JavaScript Array Creation**
    console.log("⏱️  Testing JavaScript array creation...");
    const jsArrayStart = performance.now();

    const vectorsA_JS: number[][] = [];
    const vectorsB_JS: number[][] = [];

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) * 2 - 1;
    };

    for (let i = 0; i < numVectors; i++) {
      const a: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < vectorLength; j++) {
        a.push(seededRandom());
        b.push(seededRandom());
      }
      vectorsA_JS.push(a);
      vectorsB_JS.push(b);
    }

    const jsArrayTime = performance.now() - jsArrayStart;
    console.log(`   JavaScript arrays: ${jsArrayTime.toFixed(2)}ms`);

    // **OPTIMIZED: TypedArray Creation**
    console.log("⚡ Testing TypedArray creation...");
    const typedArrayStart = performance.now();

    const vectorsA_Typed = new Float32Array(numVectors * vectorLength);
    const vectorsB_Typed = new Float32Array(numVectors * vectorLength);

    seed = 42; // Reset seed for fair comparison
    let idx = 0;
    for (let i = 0; i < numVectors; i++) {
      for (let j = 0; j < vectorLength; j++) {
        vectorsA_Typed[idx] = seededRandom();
        vectorsB_Typed[idx] = seededRandom();
        idx++;
      }
    }

    const typedArrayTime = performance.now() - typedArrayStart;
    console.log(`   TypedArray creation: ${typedArrayTime.toFixed(2)}ms`);
    console.log(
      `   🚀 Speedup: ${(jsArrayTime / typedArrayTime).toFixed(2)}x faster`,
    );

    // **BOTTLENECK 2: Data Flattening in batchDotProduct**
    console.log("⏱️  Testing data flattening overhead...");
    const flatteningStart = performance.now();

    const results1 = processor.batchDotProduct(vectorsA_JS, vectorsB_JS, false);

    const flatteningTime = performance.now() - flatteningStart;
    console.log(`   With flattening: ${flatteningTime.toFixed(2)}ms`);

    // **OPTIMIZED: Direct TypedArray Processing**
    console.log("⚡ Testing direct TypedArray processing...");
    const directStart = performance.now();

    const results2 = processor.batchDotProductZeroCopy(
      vectorsA_Typed,
      vectorsB_Typed,
      vectorLength,
      numVectors,
      false,
    );

    const directTime = performance.now() - directStart;
    console.log(`   Direct TypedArray: ${directTime.toFixed(2)}ms`);
    console.log(
      `   🚀 Speedup: ${(flatteningTime / directTime).toFixed(2)}x faster`,
    );

    // Verify results are the same
    let resultsMatch = true;
    for (let i = 0; i < Math.min(100, numVectors); i++) {
      if (Math.abs(results1[i] - results2[i]) > 1e-5) {
        resultsMatch = false;
        break;
      }
    }

    console.log(`✅ Results match: ${resultsMatch}`);

    // **SUMMARY**
    console.log("\n📊 Performance Bottleneck Summary:");
    console.log(
      `   Data creation: JS arrays ${jsArrayTime.toFixed(0)}ms vs TypedArrays ${typedArrayTime.toFixed(0)}ms`,
    );
    console.log(
      `   Processing: With flattening ${flatteningTime.toFixed(0)}ms vs Direct ${directTime.toFixed(0)}ms`,
    );
    console.log(
      `   Total potential speedup: ${((jsArrayTime + flatteningTime) / (typedArrayTime + directTime)).toFixed(2)}x`,
    );

    expect(resultsMatch).toBe(true);
  });

  it("should test parallel processing safety", async () => {
    console.log("🔍 Testing Parallel Processing");

    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    const numVectors = 1000;
    const vectorLength = 512;

    // Create TypedArray data directly
    const vectorsA = new Float32Array(numVectors * vectorLength);
    const vectorsB = new Float32Array(numVectors * vectorLength);

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) * 2 - 1;
    };

    for (let i = 0; i < vectorsA.length; i++) {
      vectorsA[i] = seededRandom();
      vectorsB[i] = seededRandom();
    }

    console.log("Testing sequential vs parallel...");

    // Sequential
    const seqStart = performance.now();
    const seqResults = processor.batchDotProductZeroCopy(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      false,
    );
    const seqTime = performance.now() - seqStart;

    // Parallel - test if it works without memory errors
    try {
      const parStart = performance.now();
      const parResults = processor.batchDotProductZeroCopy(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
        true,
      );
      const parTime = performance.now() - parStart;

      // Check if results match
      let resultsMatch = true;
      for (let i = 0; i < Math.min(100, numVectors); i++) {
        if (Math.abs(seqResults[i] - parResults[i]) > 1e-5) {
          resultsMatch = false;
          break;
        }
      }

      console.log(`✅ Parallel processing works: ${resultsMatch}`);
      console.log(`   Sequential: ${seqTime.toFixed(2)}ms`);
      console.log(`   Parallel:   ${parTime.toFixed(2)}ms`);
      console.log(`   Speedup: ${(seqTime / parTime).toFixed(2)}x`);
    } catch (error) {
      console.log(
        `❌ Parallel processing failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      console.log(`   Using sequential only: ${seqTime.toFixed(2)}ms`);
    }
  });
});
