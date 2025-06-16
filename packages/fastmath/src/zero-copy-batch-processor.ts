import init, {
  batch_dot_product_zero_copy,
  batch_dot_product_zero_copy_parallel,
} from "../pkg/defuss_fastmath.js";

/**
 * Zero-copy batch vector processor that minimizes memory copying
 * Uses WASM linear memory views to avoid unnecessary data copying
 */
export class ZeroCopyVectorBatch {
  private wasmInitialized = false;
  private wasmInstance!: any;

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
   * Zero-copy batch dot product using WASM linear memory
   * Minimizes copying by working directly with memory views
   *
   * @param vectorsA Flat Float32Array containing all 'a' vectors concatenated
   * @param vectorsB Flat Float32Array containing all 'b' vectors concatenated
   * @param vectorLength Length of each individual vector
   * @param numPairs Number of vector pairs to process
   * @param useParallel Whether to use parallel processing (for large datasets)
   * @returns Float32Array with dot product results
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

    // Ensure WASM memory has enough space
    const currentPages = memory.buffer.byteLength / 65536;
    const requiredPages = Math.ceil(totalSize / 65536);
    if (requiredPages > currentPages) {
      memory.grow(requiredPages - currentPages);
    }

    // Calculate offsets in WASM memory (in bytes)
    const aOffset = 0;
    const bOffset = vectorsASize;
    const resultsOffset = vectorsASize + vectorsBSize;

    // Copy data to WASM memory using efficient set operations
    const aView = new Float32Array(memory.buffer, aOffset, vectorsA.length);
    const bView = new Float32Array(memory.buffer, bOffset, vectorsB.length);
    const resultsView = new Float32Array(
      memory.buffer,
      resultsOffset,
      numPairs,
    );

    // Efficient bulk copy - this is much faster than individual element copying
    aView.set(vectorsA);
    bView.set(vectorsB);

    // Calculate pointer values (byte offsets)
    const aPtrValue = aOffset;
    const bPtrValue = bOffset;
    const resultsPtrValue = resultsOffset;

    // Call WASM function with memory pointers
    if (useParallel) {
      batch_dot_product_zero_copy_parallel(
        aPtrValue,
        bPtrValue,
        resultsPtrValue,
        vectorLength,
        numPairs,
      );
    } else {
      batch_dot_product_zero_copy(
        aPtrValue,
        bPtrValue,
        resultsPtrValue,
        vectorLength,
        numPairs,
      );
    }

    // Return a copy of the results (this is the only unavoidable copy)
    return new Float32Array(resultsView);
  }

  /**
   * Convenience method that handles the data format conversion
   * Takes arrays of vector arrays and flattens them for zero-copy processing
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
