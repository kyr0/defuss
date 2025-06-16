import { describe, it, expect } from "vitest";
import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";

describe("Massive Scale Zero-Copy Processing", () => {
  it("should handle 100k vectors × 1024 dimensions", async () => {
    console.log("🚀 Testing Massive Scale: 100,000 vectors × 1,024 dimensions");

    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    const numVectors = 100000;
    const vectorLength = 1024;

    console.log(
      `Total data size: ${((numVectors * vectorLength * 8) / 1024 / 1024).toFixed(1)} MB`,
    );

    // Create massive test data with seeded random
    console.log("⏳ Generating test data...");
    const dataStart = performance.now();

    const vectorsA: number[][] = [];
    const vectorsB: number[][] = [];

    let seed = 42;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return (seed / 233280) * 2 - 1; // Range [-1, 1]
    };

    for (let i = 0; i < numVectors; i++) {
      const a: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < vectorLength; j++) {
        a.push(seededRandom());
        b.push(seededRandom());
      }
      vectorsA.push(a);
      vectorsB.push(b);

      // Progress indicator
      if (i % 10000 === 0) {
        console.log(`  Generated ${i.toLocaleString()} vectors...`);
      }
    }

    const dataTime = performance.now() - dataStart;
    console.log(
      `✅ Data generation completed in ${(dataTime / 1000).toFixed(1)}s`,
    );

    // Test zero-copy sequential processing
    console.log("⚡ Running zero-copy batch processing (sequential)...");
    const processStart = performance.now();

    const results = processor.batchDotProduct(vectorsA, vectorsB, false);

    const processTime = performance.now() - processStart;
    console.log(
      `✅ Zero-copy processing completed in ${(processTime / 1000).toFixed(2)}s`,
    );

    // Verify results
    expect(results).toHaveLength(numVectors);
    expect(results[0]).toBeTypeOf("number");
    expect(results[results.length - 1]).toBeTypeOf("number");

    // Performance metrics
    const opsPerSecond = ((numVectors / processTime) * 1000).toFixed(0);
    const megaOpsPerSecond = (numVectors / processTime / 1000).toFixed(2);

    console.log("📊 **MASSIVE SCALE PERFORMANCE RESULTS:**");
    console.log(
      `   🔢 Operations: ${numVectors.toLocaleString()} dot products`,
    );
    console.log(`   ⏱️  Processing time: ${(processTime / 1000).toFixed(2)}s`);
    console.log(`   🚀 Processing rate: ${opsPerSecond} ops/sec`);
    console.log(`   ⚡ Processing rate: ${megaOpsPerSecond} million ops/sec`);
    console.log("   💾 Memory efficiency: Zero-copy WASM linear memory");

    // Sanity check: verify a few results manually
    console.log("🔍 Verifying sample results...");
    for (let i = 0; i < 3; i++) {
      let manual = 0;
      for (let j = 0; j < vectorLength; j++) {
        manual += vectorsA[i][j] * vectorsB[i][j];
      }
      expect(Math.abs(results[i] - manual)).toBeLessThan(1e-5);
    }
    console.log("✅ Sample verification passed!");
  }, 300000); // 5 minute timeout for massive scale
});
