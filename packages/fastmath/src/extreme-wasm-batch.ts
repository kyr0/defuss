import init, { 
  generate_test_vectors_wasm,
  batch_dot_product_hyper_optimized
} from '../pkg/defuss_fastmath.js';

/**
 * Extreme performance wrapper using the new WASM optimizations
 */
export class ExtremeWasmBatch {
  private initialized = false;
  private wasmInstance!: any;

  async init(): Promise<void> {
    if (!this.initialized) {
      this.wasmInstance = await init();
      this.initialized = true;
    }
  }

  /**
   * WASM-based ultra-fast data generation
   */
  generateTestDataWasm(
    numVectors: number,
    vectorLength: number,
    seed = 42
  ): { vectorsA: Float32Array; vectorsB: Float32Array; generationTime: number } {
    if (!this.initialized) {
      throw new Error('Not initialized. Call init() first.');
    }

    const startTime = performance.now();
    const totalSize = numVectors * vectorLength;
    
    // Get WASM memory
    const memory = this.wasmInstance.memory;
    const memorySize = totalSize * 2 * 4; // 2 arrays * 4 bytes per f32
    const safetyOffset = 65536; // 64KB offset for safety
    
    // Ensure enough memory
    const requiredBytes = safetyOffset + memorySize;
    const currentPages = memory.buffer.byteLength / 65536;
    const requiredPages = Math.ceil(requiredBytes / 65536);
    
    if (requiredPages > currentPages) {
      memory.grow(requiredPages - currentPages);
    }
    
    // Calculate pointers
    const aPtrOffset = safetyOffset;
    const bPtrOffset = safetyOffset + totalSize * 4;
    
    // Generate data directly in WASM memory
    generate_test_vectors_wasm(
      numVectors,
      vectorLength,
      seed,
      aPtrOffset / 4, // Convert to f32 pointer
      bPtrOffset / 4
    );
    
    // Create views to the generated data
    const vectorsA = new Float32Array(memory.buffer, aPtrOffset, totalSize);
    const vectorsB = new Float32Array(memory.buffer, bPtrOffset, totalSize);
    
    // Copy to independent arrays (this copy is unavoidable for return)
    const resultA = new Float32Array(vectorsA);
    const resultB = new Float32Array(vectorsB);
    
    const generationTime = performance.now() - startTime;
    
    return { 
      vectorsA: resultA, 
      vectorsB: resultB, 
      generationTime 
    };
  }

  /**
   * Hyper-optimized batch processing using the new WASM function
   */
  batchDotProductHyperOptimized(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numVectors: number
  ): { results: Float32Array; processingTime: number } {
    if (!this.initialized) {
      throw new Error('Not initialized. Call init() first.');
    }

    const startTime = performance.now();
    const memory = this.wasmInstance.memory;
    
    // Calculate memory requirements
    const totalSize = numVectors * vectorLength;
    const vectorsASize = totalSize * 4;
    const vectorsBSize = totalSize * 4;
    const resultsSize = numVectors * 4;
    const totalMemory = vectorsASize + vectorsBSize + resultsSize;
    const safetyOffset = 65536;
    
    // Ensure memory
    const requiredBytes = safetyOffset + totalMemory;
    const currentPages = memory.buffer.byteLength / 65536;
    const requiredPages = Math.ceil(requiredBytes / 65536);
    
    if (requiredPages > currentPages) {
      memory.grow(requiredPages - currentPages);
    }
    
    // Calculate offsets
    const aOffset = safetyOffset;
    const bOffset = aOffset + vectorsASize;
    const resultsOffset = bOffset + vectorsBSize;
    
    // Copy data to WASM memory
    const aView = new Float32Array(memory.buffer, aOffset, totalSize);
    const bView = new Float32Array(memory.buffer, bOffset, totalSize);
    const resultsView = new Float32Array(memory.buffer, resultsOffset, numVectors);
    
    aView.set(vectorsA);
    bView.set(vectorsB);
    
    // Call hyper-optimized WASM function
    batch_dot_product_hyper_optimized(
      aOffset / 4, // Convert to f32 pointers
      bOffset / 4,
      resultsOffset / 4,
      vectorLength,
      numVectors
    );
    
    // Copy results
    const results = new Float32Array(resultsView);
    const processingTime = performance.now() - startTime;
    
    return { results, processingTime };
  }

  /**
   * All-in-one extreme performance test
   */
  async extremePerformanceTest(
    numVectors: number,
    vectorLength: number,
    seed = 42
  ): Promise<{
    results: Float32Array;
    totalTime: number;
    generationTime: number;
    processingTime: number;
    opsPerSecond: number;
  }> {
    const totalStart = performance.now();
    
    // Step 1: WASM data generation
    const { vectorsA, vectorsB, generationTime } = this.generateTestDataWasm(
      numVectors, 
      vectorLength, 
      seed
    );
    
    // Step 2: Hyper-optimized processing
    const { results, processingTime } = this.batchDotProductHyperOptimized(
      vectorsA,
      vectorsB,
      vectorLength,
      numVectors
    );
    
    const totalTime = performance.now() - totalStart;
    const opsPerSecond = numVectors / (totalTime / 1000);
    
    return {
      results,
      totalTime,
      generationTime,
      processingTime,
      opsPerSecond
    };
  }
}
