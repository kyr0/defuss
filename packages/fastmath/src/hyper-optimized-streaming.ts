import { UltraFastVectorBatch } from "./ultra-fast-batch-processor.js";

/**
 * Hyper-optimized streaming that builds on the current champion (1.29M ops/sec)
 * Focuses on pushing the streaming approach to its absolute limits
 */
export class HyperOptimizedStreaming {
  private ultraFast: UltraFastVectorBatch;
  private initialized = false;

  constructor() {
    this.ultraFast = new UltraFastVectorBatch();
  }

  async init(): Promise<void> {
    if (!this.initialized) {
      await this.ultraFast.init();
      this.initialized = true;
    }
  }

  /**
   * HYPER-OPTIMIZATION 1: Lightning-fast data generation
   * Uses the fastest possible approach based on current benchmarks
   */
  generateTestDataLightning(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): { vectorsA: Float32Array; vectorsB: Float32Array } {
    const totalSize = numVectors * vectorLength;
    const vectorsA = new Float32Array(totalSize);
    const vectorsB = new Float32Array(totalSize);

    // Use the simplest and fastest generation approach
    let currentSeed = seed;
    const seededRandom = () => {
      currentSeed = (currentSeed * 9301 + 49297) % 233280;
      return (currentSeed / 233280) * 2 - 1;
    };

    // Simple, fast loop with minimal overhead
    for (let i = 0; i < totalSize; i++) {
      vectorsA[i] = seededRandom();
      vectorsB[i] = seededRandom();
    }

    return { vectorsA, vectorsB };
  }

  /**
   * HYPER-OPTIMIZATION 2: Super-streaming with optimized chunk size
   * Takes the champion streaming approach and optimizes it further
   */
  async batchDotProductSuperStreaming(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number,
  ): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error("Not initialized. Call init() first.");
    }

    // Optimal chunk size based on current benchmarks
    const optimalChunkSize = 4096;
    const results = new Float32Array(numVectors);
    let processedVectors = 0;

    while (processedVectors < numVectors) {
      const remainingVectors = numVectors - processedVectors;
      const currentChunkSize = Math.min(optimalChunkSize, remainingVectors);

      const startIdx = processedVectors * vectorLength;
      const endIdx = startIdx + currentChunkSize * vectorLength;

      // Create views (no copying!)
      const chunkA = vectorsA.subarray(startIdx, endIdx);
      const chunkB = vectorsB.subarray(startIdx, endIdx);

      // Use the proven zero-copy method
      const chunkResults = this.ultraFast.batchDotProductUltraFast(
        chunkA,
        chunkB,
        vectorLength,
        currentChunkSize,
        false,
      );

      // Direct set (fastest way to copy results)
      results.set(chunkResults, processedVectors);
      processedVectors += currentChunkSize;
    }

    return results;
  }

  /**
   * HYPER-OPTIMIZATION 3: Adaptive chunk sizing
   * Dynamically adjusts chunk size based on dataset characteristics
   */
  async batchDotProductAdaptive(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number,
  ): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error("Not initialized. Call init() first.");
    }

    // Adaptive chunk size based on vector size and count
    let chunkSize: number;
    if (vectorLength <= 256) {
      chunkSize = 8192; // Smaller vectors, larger chunks
    } else if (vectorLength <= 512) {
      chunkSize = 4096; // Medium vectors, medium chunks
    } else if (vectorLength <= 1024) {
      chunkSize = 2048; // Large vectors, smaller chunks
    } else {
      chunkSize = 1024; // Very large vectors, very small chunks
    }

    // For small datasets, process all at once
    if (numVectors <= chunkSize) {
      return this.ultraFast.batchDotProductUltraFast(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
        false,
      );
    }

    const results = new Float32Array(numVectors);
    let processedVectors = 0;

    while (processedVectors < numVectors) {
      const remainingVectors = numVectors - processedVectors;
      const currentChunkSize = Math.min(chunkSize, remainingVectors);

      const startIdx = processedVectors * vectorLength;
      const endIdx = startIdx + currentChunkSize * vectorLength;

      const chunkA = vectorsA.subarray(startIdx, endIdx);
      const chunkB = vectorsB.subarray(startIdx, endIdx);

      const chunkResults = this.ultraFast.batchDotProductUltraFast(
        chunkA,
        chunkB,
        vectorLength,
        currentChunkSize,
        false,
      );

      results.set(chunkResults, processedVectors);
      processedVectors += currentChunkSize;
    }

    return results;
  }

  /**
   * HYPER-OPTIMIZATION 4: Memory-pool streaming
   * Reuses a single result buffer for multiple operations
   */
  createMemoryPoolStreaming(maxVectors: number, vectorLength: number) {
    const resultsPool = new Float32Array(maxVectors);
    const tempResultsPool = new Float32Array(8192); // Max chunk size

    return {
      process: async (
        vectorsA: Float32Array,
        vectorsB: Float32Array,
        actualVectors: number,
      ): Promise<Float32Array> => {
        if (actualVectors > maxVectors) {
          throw new Error(
            `Cannot process ${actualVectors} vectors, max is ${maxVectors}`,
          );
        }

        const chunkSize = 4096;
        let processedVectors = 0;

        while (processedVectors < actualVectors) {
          const remainingVectors = actualVectors - processedVectors;
          const currentChunkSize = Math.min(chunkSize, remainingVectors);

          const startIdx = processedVectors * vectorLength;
          const endIdx = startIdx + currentChunkSize * vectorLength;

          const chunkA = vectorsA.subarray(startIdx, endIdx);
          const chunkB = vectorsB.subarray(startIdx, endIdx);

          const chunkResults = this.ultraFast.batchDotProductUltraFast(
            chunkA,
            chunkB,
            vectorLength,
            currentChunkSize,
            false,
          );

          // Copy to our pool instead of creating new arrays
          resultsPool.set(chunkResults, processedVectors);
          processedVectors += currentChunkSize;
        }

        // Return a view of the pool (no copying!)
        return resultsPool.subarray(0, actualVectors);
      },

      getMemoryUsage: () => ({
        totalMB:
          (resultsPool.byteLength + tempResultsPool.byteLength) / (1024 * 1024),
        maxVectors,
      }),
    };
  }

  /**
   * HYPER-OPTIMIZATION 5: All-in-one optimized pipeline
   * Combines the best of all optimizations
   */
  async hyperOptimizedPipeline(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): Promise<{
    totalTime: number;
    generationTime: number;
    processingTime: number;
    opsPerSecond: number;
    results: Float32Array;
    method: string;
  }> {
    const startTotal = performance.now();

    // Step 1: Lightning-fast data generation
    const genStart = performance.now();
    const { vectorsA, vectorsB } = this.generateTestDataLightning(
      numVectors,
      vectorLength,
      seed,
    );
    const genTime = performance.now() - genStart;

    // Step 2: Choose the best processing method
    let results: Float32Array;
    let method: string;
    const procStart = performance.now();

    if (numVectors <= 10000) {
      // Small datasets: Process all at once
      results = this.ultraFast.batchDotProductUltraFast(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
        false,
      );
      method = "Direct processing";
    } else if (vectorLength <= 512) {
      // Medium vectors: Use adaptive chunking
      results = await this.batchDotProductAdaptive(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
      );
      method = "Adaptive chunking";
    } else {
      // Large vectors: Use super-streaming
      results = await this.batchDotProductSuperStreaming(
        vectorsA,
        vectorsB,
        vectorLength,
        numVectors,
      );
      method = "Super-streaming";
    }

    const procTime = performance.now() - procStart;
    const totalTime = performance.now() - startTotal;

    return {
      totalTime,
      generationTime: genTime,
      processingTime: procTime,
      opsPerSecond: numVectors / (totalTime / 1000),
      results,
      method,
    };
  }

  /**
   * HYPER-OPTIMIZATION 6: Speed test with multiple configurations
   */
  async speedTest(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): Promise<{
    results: Array<{
      method: string;
      time: number;
      opsPerSecond: number;
      results: Float32Array;
    }>;
    fastest: string;
    fastestOpsPerSecond: number;
  }> {
    const { vectorsA, vectorsB } = this.generateTestDataLightning(
      numVectors,
      vectorLength,
      seed,
    );
    const testResults = [];

    // Test 1: Direct processing (baseline)
    const directStart = performance.now();
    const directResults = this.ultraFast.batchDotProductUltraFast(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
      false,
    );
    const directTime = performance.now() - directStart;
    testResults.push({
      method: "Direct",
      time: directTime,
      opsPerSecond: numVectors / (directTime / 1000),
      results: directResults,
    });

    // Test 2: Super-streaming
    const streamStart = performance.now();
    const streamResults = await this.batchDotProductSuperStreaming(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
    );
    const streamTime = performance.now() - streamStart;
    testResults.push({
      method: "Super-streaming",
      time: streamTime,
      opsPerSecond: numVectors / (streamTime / 1000),
      results: streamResults,
    });

    // Test 3: Adaptive chunking
    const adaptiveStart = performance.now();
    const adaptiveResults = await this.batchDotProductAdaptive(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
    );
    const adaptiveTime = performance.now() - adaptiveStart;
    testResults.push({
      method: "Adaptive",
      time: adaptiveTime,
      opsPerSecond: numVectors / (adaptiveTime / 1000),
      results: adaptiveResults,
    });

    // Find the fastest
    const fastest = testResults.reduce((prev, current) =>
      prev.opsPerSecond > current.opsPerSecond ? prev : current,
    );

    return {
      results: testResults,
      fastest: fastest.method,
      fastestOpsPerSecond: fastest.opsPerSecond,
    };
  }
}
