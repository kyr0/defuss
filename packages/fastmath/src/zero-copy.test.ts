import { describe, it, expect } from "vitest";
import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";

describe("Zero-Copy Batch Processing", () => {
  it("should perform basic zero-copy batch dot product", async () => {
    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    // Create simple test data
    const vectorsA = [
      [1.0, 2.0, 3.0],
      [4.0, 5.0, 6.0],
    ];
    const vectorsB = [
      [1.0, 1.0, 1.0],
      [2.0, 2.0, 2.0],
    ];

    console.log("Input vectors A:", vectorsA);
    console.log("Input vectors B:", vectorsB);

    const results = processor.batchDotProduct(vectorsA, vectorsB, false);
    console.log("WASM results:", results);

    // Manual calculation for verification
    const manual = [];
    for (let i = 0; i < vectorsA.length; i++) {
      let sum = 0;
      for (let j = 0; j < vectorsA[i].length; j++) {
        sum += vectorsA[i][j] * vectorsB[i][j];
      }
      manual.push(sum);
    }
    console.log("Manual calculation:", manual);

    // Expected results:
    // [1*1 + 2*1 + 3*1, 4*2 + 5*2 + 6*2] = [6, 30]
    expect(results).toHaveLength(2);
    expect(results[0]).toBeCloseTo(6.0, 5);
    expect(results[1]).toBeCloseTo(30.0, 5);

    console.log("✅ Zero-copy basic test passed!");
  });

  it("should perform zero-copy batch with larger vectors", async () => {
    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    // Create larger test vectors
    const numVectors = 100;
    const vectorLength = 256;

    const vectorsA: number[][] = [];
    const vectorsB: number[][] = [];

    for (let i = 0; i < numVectors; i++) {
      const a: number[] = [];
      const b: number[] = [];
      for (let j = 0; j < vectorLength; j++) {
        a.push(Math.random());
        b.push(Math.random());
      }
      vectorsA.push(a);
      vectorsB.push(b);
    }

    console.log(`Testing ${numVectors} vectors of ${vectorLength} dimensions`);

    const start = performance.now();
    const results = processor.batchDotProduct(vectorsA, vectorsB, false);
    const time = performance.now() - start;

    expect(results).toHaveLength(numVectors);
    expect(results[0]).toBeTypeOf("number");

    console.log(`✅ Zero-copy large test completed in ${time.toFixed(2)}ms`);
    console.log(
      `📊 Processing rate: ${((numVectors / time) * 1000).toFixed(0)} vectors/sec`,
    );
  });

  it.skip("should test sequential vs parallel zero-copy processing", async () => {
    const processor = new ZeroCopyVectorBatch();
    await processor.init();

    // Create test data
    const numVectors = 1000;
    const vectorLength = 512;

    const vectorsA: number[][] = [];
    const vectorsB: number[][] = [];

    // Use seeded random for reproducible results
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
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
    }

    console.log(`Testing ${numVectors} vectors of ${vectorLength} dimensions`);

    // Test sequential
    const seqStart = performance.now();
    const seqResults = processor.batchDotProduct(vectorsA, vectorsB, false);
    const seqTime = performance.now() - seqStart;

    // Test parallel
    const parStart = performance.now();
    const parResults = processor.batchDotProduct(vectorsA, vectorsB, true);
    const parTime = performance.now() - parStart;

    expect(seqResults).toHaveLength(numVectors);
    expect(parResults).toHaveLength(numVectors);

    // Results should be very close (allowing for floating point differences)
    for (let i = 0; i < Math.min(100, numVectors); i++) {
      expect(Math.abs(seqResults[i] - parResults[i])).toBeLessThan(1e-5);
    }

    console.log(
      `⚡ Sequential: ${seqTime.toFixed(2)}ms (${((numVectors / seqTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(
      `🚀 Parallel:   ${parTime.toFixed(2)}ms (${((numVectors / parTime) * 1000).toFixed(0)} ops/sec)`,
    );
    console.log(`📈 Speedup: ${(seqTime / parTime).toFixed(2)}x`);
  }, 30000); // 30 second timeout
});
