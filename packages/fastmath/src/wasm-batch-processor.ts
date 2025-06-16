/**
 * High-performance batch vector operations using WASM with manual memory management
 * Similar to C/Emscripten approach with reserved memory buffers
 */

import * as wasm from "../pkg/defuss_fastmath.js";

// Memory management for efficient batch processing
class WasmVectorBatch {
  private memory!: WebAssembly.Memory;
  private wasmInstance: any;
  private isInitialized = false;

  // Memory layout configuration
  private readonly BYTES_PER_FLOAT = 4;
  private readonly PAGE_SIZE = 64 * 1024; // 64KB per page

  // Reserved memory regions (byte offsets)
  private vectorBufferOffset = 0;
  private resultBufferOffset = 0;
  private maxVectorPairs = 0;
  private vectorLength = 0;

  /**
   * Initialize the WASM batch processor with reserved memory
   * @param maxVectorPairs Maximum number of vector pairs to process in one batch
   * @param vectorLength Length of each vector
   */
  async init(maxVectorPairs: number, vectorLength: number): Promise<void> {
    if (this.isInitialized) return;

    // Initialize WASM (thread pool is already initialized by ensureWasmInit)
    this.wasmInstance = await wasm.default();
    this.memory = this.wasmInstance.memory;

    this.maxVectorPairs = maxVectorPairs;
    this.vectorLength = vectorLength;

    // Calculate memory requirements
    const vectorBufferSize =
      maxVectorPairs * vectorLength * 2 * this.BYTES_PER_FLOAT; // 2 vectors per pair
    const resultBufferSize = maxVectorPairs * this.BYTES_PER_FLOAT;
    const totalMemoryNeeded = vectorBufferSize + resultBufferSize;

    // Ensure we have enough memory (grow if needed)
    const currentMemorySize = this.memory.buffer.byteLength;
    const pagesNeeded = Math.ceil(totalMemoryNeeded / this.PAGE_SIZE);
    const currentPages = currentMemorySize / this.PAGE_SIZE;

    if (pagesNeeded > currentPages) {
      this.memory.grow(pagesNeeded - currentPages);
    }

    // Set memory layout
    this.vectorBufferOffset = 0; // Start at beginning of memory
    this.resultBufferOffset = vectorBufferSize; // Results come after vector data

    this.isInitialized = true;

    console.log(`WasmVectorBatch initialized:
      - Max vector pairs: ${maxVectorPairs}
      - Vector length: ${vectorLength}
      - Vector buffer: ${vectorBufferSize} bytes at offset ${this.vectorBufferOffset}
      - Result buffer: ${resultBufferSize} bytes at offset ${this.resultBufferOffset}
      - Total memory: ${totalMemoryNeeded} bytes`);
  }

  /**
   * Process a batch of dot products using reserved memory
   * @param aVectors Array of 'a' vectors (flat: [a1_0, a1_1, ..., a1_n, a2_0, ...])
   * @param bVectors Array of 'b' vectors (flat: [b1_0, b1_1, ..., b1_n, b2_0, ...])
   * @param numPairs Number of vector pairs to process
   * @returns Array of dot products
   */
  batchDotProduct(
    aVectors: Float32Array,
    bVectors: Float32Array,
    numPairs: number,
  ): Float32Array {
    if (!this.isInitialized) {
      throw new Error("WasmVectorBatch not initialized");
    }

    if (numPairs > this.maxVectorPairs) {
      throw new Error(
        `Number of pairs (${numPairs}) exceeds maximum (${this.maxVectorPairs})`,
      );
    }

    const expectedLength = numPairs * this.vectorLength;
    if (
      aVectors.length !== expectedLength ||
      bVectors.length !== expectedLength
    ) {
      throw new Error(
        `Vector arrays must have length ${expectedLength} for ${numPairs} pairs of ${this.vectorLength}-dimensional vectors`,
      );
    }

    // Get memory as Float32Array views
    const memoryFloat32 = new Float32Array(this.memory.buffer);
    const vectorBufferFloat32Offset =
      this.vectorBufferOffset / this.BYTES_PER_FLOAT;
    const resultBufferFloat32Offset =
      this.resultBufferOffset / this.BYTES_PER_FLOAT;

    // Copy vector data to WASM memory in interleaved format - OPTIMIZED
    // [a1_0, a1_1, ..., a1_n, b1_0, b1_1, ..., b1_n, a2_0, a2_1, ..., a2_n, b2_0, ...]

    // Pre-allocate interleaved buffer to avoid O(n²) copying
    const interleavedData = new Float32Array(numPairs * this.vectorLength * 2);
    let writeOffset = 0;

    // Single pass interleaving - O(n) complexity
    for (let i = 0; i < numPairs; i++) {
      const vectorStart = i * this.vectorLength;

      // Copy vector 'a' - direct array copy
      interleavedData.set(
        aVectors.subarray(vectorStart, vectorStart + this.vectorLength),
        writeOffset,
      );
      writeOffset += this.vectorLength;

      // Copy vector 'b' - direct array copy
      interleavedData.set(
        bVectors.subarray(vectorStart, vectorStart + this.vectorLength),
        writeOffset,
      );
      writeOffset += this.vectorLength;
    }

    // Single bulk copy to WASM memory - O(1) operation
    memoryFloat32.set(interleavedData, vectorBufferFloat32Offset);

    // Call WASM function to process vectors in-place
    this.wasmInstance.process_vectors_in_memory(
      this.vectorBufferOffset,
      this.vectorLength,
      numPairs,
      this.resultBufferOffset,
    );

    // Read results from WASM memory
    const results = new Float32Array(numPairs);
    results.set(
      memoryFloat32.subarray(
        resultBufferFloat32Offset,
        resultBufferFloat32Offset + numPairs,
      ),
    );

    return results;
  }

  /**
   * Process a batch using the existing separated batch function
   * @param aVectors Array of 'a' vectors
   * @param bVectors Array of 'b' vectors
   * @param numPairs Number of vector pairs
   * @returns Array of dot products
   */
  batchDotProductSeparated(
    aVectors: Float32Array,
    bVectors: Float32Array,
    numPairs: number,
  ): Float32Array {
    if (!this.isInitialized) {
      throw new Error("WasmVectorBatch not initialized");
    }

    return this.wasmInstance.vector_batch_dot_product_separated(
      aVectors,
      bVectors,
      this.vectorLength,
      numPairs,
    );
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    if (!this.isInitialized) {
      return null;
    }

    return {
      totalMemorySize: this.memory.buffer.byteLength,
      vectorBufferOffset: this.vectorBufferOffset,
      resultBufferOffset: this.resultBufferOffset,
      vectorBufferSize:
        this.maxVectorPairs * this.vectorLength * 2 * this.BYTES_PER_FLOAT,
      resultBufferSize: this.maxVectorPairs * this.BYTES_PER_FLOAT,
      maxVectorPairs: this.maxVectorPairs,
      vectorLength: this.vectorLength,
    };
  }
}

/**
 * Utility function to create multiple batch processors for different sizes
 */
export class WasmVectorBatchManager {
  private processors = new Map<string, WasmVectorBatch>();

  /**
   * Get or create a batch processor for specific dimensions
   */
  async getProcessor(
    maxVectorPairs: number,
    vectorLength: number,
  ): Promise<WasmVectorBatch> {
    const key = `${maxVectorPairs}_${vectorLength}`;

    if (!this.processors.has(key)) {
      const processor = new WasmVectorBatch();
      await processor.init(maxVectorPairs, vectorLength);
      this.processors.set(key, processor);
    }

    return this.processors.get(key)!;
  }

  /**
   * Process a batch of dot products, automatically selecting the right processor
   */
  async batchDotProduct(
    aVectors: Float32Array,
    bVectors: Float32Array,
    vectorLength: number,
    numPairs?: number,
  ): Promise<Float32Array> {
    const actualNumPairs = numPairs || aVectors.length / vectorLength;

    // Select processor size (round up to next power of 2 for efficiency)
    const maxPairs = Math.max(1024, 2 ** Math.ceil(Math.log2(actualNumPairs)));

    const processor = await this.getProcessor(maxPairs, vectorLength);
    return processor.batchDotProduct(aVectors, bVectors, actualNumPairs);
  }

  /**
   * Get all processors and their memory usage
   */
  getStats() {
    const stats: any[] = [];
    for (const [key, processor] of this.processors) {
      stats.push({
        key,
        ...processor.getMemoryStats(),
      });
    }
    return stats;
  }
}

// Export singleton instance for easy use
export const wasmBatchManager = new WasmVectorBatchManager();
export { WasmVectorBatch };
