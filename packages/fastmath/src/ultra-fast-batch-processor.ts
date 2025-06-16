import { ZeroCopyVectorBatch } from "./zero-copy-batch-processor.js";

/**
 * Ultra-optimized batch processor that eliminates all data preparation overhead
 */
export class UltraFastVectorBatch {
  private zeroCopyProcessor: ZeroCopyVectorBatch;
  private initialized = false;

  constructor() {
    this.zeroCopyProcessor = new ZeroCopyVectorBatch();
  }

  async init(): Promise<void> {
    if (!this.initialized) {
      await this.zeroCopyProcessor.init();
      this.initialized = true;
    }
  }

  /**
   * Ultra-fast batch processing with pre-allocated TypedArrays
   * Eliminates all data preparation overhead
   */
  batchDotProductUltraFast(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number,
    useParallel = false,
  ): Float32Array {
    if (!this.initialized) {
      throw new Error("Not initialized. Call init() first.");
    }

    return this.zeroCopyProcessor.batchDotProductZeroCopy(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      useParallel,
    );
  }

  /**
   * Generate test data directly as TypedArrays (much faster than JS arrays)
   */
  generateTestDataFast(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): { vectorsA: Float32Array; vectorsB: Float32Array } {
    const totalSize = numVectors * vectorLength;
    const vectorsA = new Float32Array(totalSize);
    const vectorsB = new Float32Array(totalSize);

    let currentSeed = seed;
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return (currentSeed / 233280) * 2 - 1;
    };

    // Ultra-fast single loop generation
    for (let i = 0; i < totalSize; i++) {
      vectorsA[i] = seededRandom();
      vectorsB[i] = seededRandom();
    }

    return { vectorsA, vectorsB };
  }

  /**
   * Streaming batch processor for truly massive datasets
   * Processes data in chunks to avoid memory allocation overhead
   */
  async batchDotProductStreaming(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number,
    chunkSize = 10000,
  ): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error("Not initialized. Call init() first.");
    }

    const results = new Float32Array(numVectors);
    let processedVectors = 0;

    while (processedVectors < numVectors) {
      const remainingVectors = numVectors - processedVectors;
      const currentChunkSize = Math.min(chunkSize, remainingVectors);

      const startIdx = processedVectors * vectorLength;
      const endIdx = startIdx + currentChunkSize * vectorLength;

      // Create views (no copying!)
      const chunkA = vectorsA.subarray(startIdx, endIdx);
      const chunkB = vectorsB.subarray(startIdx, endIdx);

      // Process chunk
      const chunkResults = this.zeroCopyProcessor.batchDotProductZeroCopy(
        chunkA,
        chunkB,
        vectorLength,
        currentChunkSize,
        false, // Keep sequential for memory safety
      );

      // Copy results into final array
      results.set(chunkResults, processedVectors);

      processedVectors += currentChunkSize;

      // Allow event loop to breathe for very large datasets
      if (processedVectors % 50000 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return results;
  }

  /**
   * Pre-allocate and reuse memory for repeated processing
   */
  createReusableProcessor(maxVectors: number, vectorLength: number) {
    const maxSize = maxVectors * vectorLength;
    const vectorsA = new Float32Array(maxSize);
    const vectorsB = new Float32Array(maxSize);
    const results = new Float32Array(maxVectors);

    return {
      vectorsA,
      vectorsB,
      results,

      processBatch: (actualVectors: number) => {
        if (actualVectors > maxVectors) {
          throw new Error(
            `Cannot process ${actualVectors} vectors, max is ${maxVectors}`,
          );
        }

        const actualSize = actualVectors * vectorLength;
        const inputA = vectorsA.subarray(0, actualSize);
        const inputB = vectorsB.subarray(0, actualSize);

        const batchResults = this.zeroCopyProcessor.batchDotProductZeroCopy(
          inputA,
          inputB,
          vectorLength,
          actualVectors,
          false,
        );

        // Copy to pre-allocated results array
        results.set(batchResults.subarray(0, actualVectors));
        return results.subarray(0, actualVectors);
      },
    };
  }
}
