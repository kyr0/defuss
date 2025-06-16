import { UltraFastVectorBatch } from "./ultra-fast-batch-processor.js";

/**
 * Extreme performance optimizations that push the boundaries
 */
export class ExtremePerformanceBatch {
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
   * OPTIMIZATION 1: Parallel data generation using Web Workers simulation
   * Generate data in chunks to maximize CPU utilization
   */
  generateTestDataParallel(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): { vectorsA: Float32Array; vectorsB: Float32Array } {
    const totalSize = numVectors * vectorLength;
    const vectorsA = new Float32Array(totalSize);
    const vectorsB = new Float32Array(totalSize);

    // Simulate parallel generation by processing in optimal chunks
    const optimalChunkSize = 65536; // 64KB chunks for cache efficiency
    const numChunks = Math.ceil(totalSize / optimalChunkSize);

    for (let chunk = 0; chunk < numChunks; chunk++) {
      const startIdx = chunk * optimalChunkSize;
      const endIdx = Math.min(startIdx + optimalChunkSize, totalSize);
      const chunkSize = endIdx - startIdx;

      // Use different seeds for each chunk to maintain randomness
      let chunkSeed = seed + chunk * 1000;
      const seededRandom = () => {
        chunkSeed = (chunkSeed * 9301 + 49297) % 233280;
        return (chunkSeed / 233280) * 2 - 1;
      };

      // Generate chunk data with optimal loop unrolling
      const aChunk = vectorsA.subarray(startIdx, endIdx);
      const bChunk = vectorsB.subarray(startIdx, endIdx);

      // Unroll loop for better performance
      let i = 0;
      for (; i < chunkSize - 3; i += 4) {
        aChunk[i] = seededRandom();
        aChunk[i + 1] = seededRandom();
        aChunk[i + 2] = seededRandom();
        aChunk[i + 3] = seededRandom();

        bChunk[i] = seededRandom();
        bChunk[i + 1] = seededRandom();
        bChunk[i + 2] = seededRandom();
        bChunk[i + 3] = seededRandom();
      }

      // Handle remaining elements
      for (; i < chunkSize; i++) {
        aChunk[i] = seededRandom();
        bChunk[i] = seededRandom();
      }
    }

    return { vectorsA, vectorsB };
  }

  /**
   * OPTIMIZATION 2: Memory-aligned ultra-fast streaming
   * Process with perfect memory alignment and cache optimization
   */
  async batchDotProductAligned(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number,
  ): Promise<Float32Array> {
    if (!this.initialized) {
      throw new Error("Not initialized. Call init() first.");
    }

    // Use smaller chunks for better cache efficiency
    const optimalChunkSize = 4096; // 4K vectors per chunk for L1 cache
    const results = new Float32Array(numVectors);
    let processedVectors = 0;

    while (processedVectors < numVectors) {
      const remainingVectors = numVectors - processedVectors;
      const currentChunkSize = Math.min(optimalChunkSize, remainingVectors);

      const startIdx = processedVectors * vectorLength;
      const endIdx = startIdx + currentChunkSize * vectorLength;

      // Create aligned views for optimal SIMD performance
      const chunkA = vectorsA.subarray(startIdx, endIdx);
      const chunkB = vectorsB.subarray(startIdx, endIdx);

      // Process with zero-copy
      const chunkResults = this.ultraFast.batchDotProductUltraFast(
        chunkA,
        chunkB,
        vectorLength,
        currentChunkSize,
        false,
      );

      // Direct copy into results
      results.set(chunkResults, processedVectors);
      processedVectors += currentChunkSize;
    }

    return results;
  }

  /**
   * OPTIMIZATION 3: Pre-allocated memory pool for zero allocation
   */
  createZeroAllocationProcessor(maxVectors: number, vectorLength: number) {
    const maxSize = maxVectors * vectorLength;

    // Pre-allocate all memory
    const vectorsAPool = new Float32Array(maxSize);
    const vectorsBPool = new Float32Array(maxSize);
    const resultsPool = new Float32Array(maxVectors);
    const tempChunkA = new Float32Array(4096 * vectorLength); // 4K vector chunk
    const tempChunkB = new Float32Array(4096 * vectorLength);
    const tempResults = new Float32Array(4096);

    return {
      vectorsAPool,
      vectorsBPool,
      resultsPool,

      generateAndProcess: (actualVectors: number, seed = 42) => {
        if (actualVectors > maxVectors) {
          throw new Error(
            `Cannot process ${actualVectors} vectors, max is ${maxVectors}`,
          );
        }

        // Generate data directly into pre-allocated pool
        let currentSeed = seed;
        const seededRandom = () => {
          currentSeed = (currentSeed * 9301 + 49297) % 233280;
          return (currentSeed / 233280) * 2 - 1;
        };

        const totalSize = actualVectors * vectorLength;

        // Ultra-fast generation with loop unrolling
        for (let i = 0; i < totalSize - 7; i += 8) {
          vectorsAPool[i] = seededRandom();
          vectorsAPool[i + 1] = seededRandom();
          vectorsAPool[i + 2] = seededRandom();
          vectorsAPool[i + 3] = seededRandom();
          vectorsAPool[i + 4] = seededRandom();
          vectorsAPool[i + 5] = seededRandom();
          vectorsAPool[i + 6] = seededRandom();
          vectorsAPool[i + 7] = seededRandom();

          vectorsBPool[i] = seededRandom();
          vectorsBPool[i + 1] = seededRandom();
          vectorsBPool[i + 2] = seededRandom();
          vectorsBPool[i + 3] = seededRandom();
          vectorsBPool[i + 4] = seededRandom();
          vectorsBPool[i + 5] = seededRandom();
          vectorsBPool[i + 6] = seededRandom();
          vectorsBPool[i + 7] = seededRandom();
        }

        // Handle remaining elements
        for (let i = Math.floor(totalSize / 8) * 8; i < totalSize; i++) {
          vectorsAPool[i] = seededRandom();
          vectorsBPool[i] = seededRandom();
        }

        // Process in optimal chunks using pre-allocated temp arrays
        let processedVectors = 0;

        while (processedVectors < actualVectors) {
          const remainingVectors = actualVectors - processedVectors;
          const currentChunkSize = Math.min(4096, remainingVectors);

          const startIdx = processedVectors * vectorLength;
          const endIdx = startIdx + currentChunkSize * vectorLength;

          // Copy to aligned temp arrays (this is still faster than memory allocation)
          tempChunkA.set(vectorsAPool.subarray(startIdx, endIdx));
          tempChunkB.set(vectorsBPool.subarray(startIdx, endIdx));

          // Process chunk
          const chunkResults = this.ultraFast.batchDotProductUltraFast(
            tempChunkA.subarray(0, currentChunkSize * vectorLength),
            tempChunkB.subarray(0, currentChunkSize * vectorLength),
            vectorLength,
            currentChunkSize,
            false,
          );

          // Copy results
          resultsPool.set(chunkResults, processedVectors);
          processedVectors += currentChunkSize;
        }

        return resultsPool.subarray(0, actualVectors);
      },
    };
  }

  /**
   * OPTIMIZATION 4: Memory-mapped style processing
   * Simulate memory-mapped file processing for ultimate efficiency
   */
  async processMemoryMapped(
    numVectors: number,
    vectorLength: number,
    seed = 42,
  ): Promise<{
    results: Float32Array;
    totalTime: number;
    generationTime: number;
    processingTime: number;
  }> {
    const startTotal = performance.now();

    // Step 1: Ultra-fast parallel data generation
    const genStart = performance.now();
    const { vectorsA, vectorsB } = this.generateTestDataParallel(
      numVectors,
      vectorLength,
      seed,
    );
    const genTime = performance.now() - genStart;

    // Step 2: Ultra-fast aligned processing
    const procStart = performance.now();
    const results = await this.batchDotProductAligned(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors,
    );
    const procTime = performance.now() - procStart;

    const totalTime = performance.now() - startTotal;

    return {
      results,
      totalTime,
      generationTime: genTime,
      processingTime: procTime,
    };
  }
}
