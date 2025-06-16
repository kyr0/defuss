import init, {
  batch_dot_product_zero_copy,
  batch_dot_product_zero_copy_parallel,
} from "../pkg/defuss_fastmath.js";

/**
 * Improved zero-copy batch vector processor with better memory management
 */
export class ImprovedZeroCopyBatch {
  private wasmInitialized = false;
  private wasmInstance!: any;
  private memoryOffset = 65536; // Start after 64KB to avoid system memory

  /**
   * Initialize WASM module (call once before use)
   */
  async init(): Promise<void> {
    if (!this.wasmInitialized) {
      this.wasmInstance = await init();
      this.wasmInitialized = true;
    }
  }

  /**
   * Zero-copy batch dot product with improved memory management
   */
  batchDotProductZeroCopy(
    vectorsA: Float32Array,
    vectorsB: Float32Array,
    vectorLength: number,
    numPairs: number,
    useParallel = false,
  ): Float32Array {
    if (!this.wasmInitialized) {
      throw new Error("WASM not initialized. Call init() first.");
    }

    // Validate input
    const expectedLength = numPairs * vectorLength;
    if (
      vectorsA.length !== expectedLength ||
      vectorsB.length !== expectedLength
    ) {
      throw new Error(
        `Expected ${expectedLength} elements, got A:${vectorsA.length}, B:${vectorsB.length}`,
      );
    }

    // Calculate memory requirements
    const vectorsASize = vectorsA.length * 4; // 4 bytes per f32
    const vectorsBSize = vectorsB.length * 4;
    const resultsSize = numPairs * 4;
    const totalSize = vectorsASize + vectorsBSize + resultsSize;

    // Get WASM memory
    const memory = this.wasmInstance.memory;

    // Ensure WASM memory has enough space (with safety margin)
    const safetyMargin = 65536; // 64KB safety margin
    const requiredBytes = this.memoryOffset + totalSize + safetyMargin;
    const currentPages = memory.buffer.byteLength / 65536;
    const requiredPages = Math.ceil(requiredBytes / 65536);

    if (requiredPages > currentPages) {
      const pagesToGrow = requiredPages - currentPages;
      memory.grow(pagesToGrow);
    }

    // Calculate safe offsets in WASM memory (in bytes)
    const aOffset = this.memoryOffset;
    const bOffset = aOffset + vectorsASize;
    const resultsOffset = bOffset + vectorsBSize;

    // Copy data to WASM memory using efficient set operations
    const aView = new Float32Array(memory.buffer, aOffset, vectorsA.length);
    const bView = new Float32Array(memory.buffer, bOffset, vectorsB.length);
    const resultsView = new Float32Array(
      memory.buffer,
      resultsOffset,
      numPairs,
    );

    // Efficient bulk copy - much faster than individual element copying
    aView.set(vectorsA);
    bView.set(vectorsB);

    // Call WASM function with memory pointers
    try {
      if (useParallel) {
        batch_dot_product_zero_copy_parallel(
          aOffset,
          bOffset,
          resultsOffset,
          vectorLength,
          numPairs,
        );
      } else {
        batch_dot_product_zero_copy(
          aOffset,
          bOffset,
          resultsOffset,
          vectorLength,
          numPairs,
        );
      }
    } catch (error) {
      throw new Error(
        `WASM execution failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Return a copy of the results
    return new Float32Array(resultsView);
  }

  /**
   * Convenience method that handles the data format conversion
   */
  batchDotProduct(
    vectorsA: number[][],
    vectorsB: number[][],
    useParallel = false,
  ): number[] {
    if (vectorsA.length !== vectorsB.length) {
      throw new Error("vectorsA and vectorsB must have the same length");
    }

    const numPairs = vectorsA.length;
    const vectorLength = vectorsA[0].length;

    // Flatten vectors into Float32Arrays for processing
    const flatA = new Float32Array(numPairs * vectorLength);
    const flatB = new Float32Array(numPairs * vectorLength);

    for (let i = 0; i < numPairs; i++) {
      const offsetStart = i * vectorLength;
      flatA.set(vectorsA[i], offsetStart);
      flatB.set(vectorsB[i], offsetStart);
    }

    const results = this.batchDotProductZeroCopy(
      flatA,
      flatB,
      vectorLength,
      numPairs,
      useParallel,
    );

    return Array.from(results);
  }
}
