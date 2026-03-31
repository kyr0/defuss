import type { NumericArray, Vectors, OpOptions } from "../types.js";
import { selectUnrollFactor, getDotKernel } from "./unroll.js";

/**
 * Batch dot product of vector pairs.
 *
 * For each i, computes `dotProduct(vectorsA[i], vectorsB[i])`.
 * Uses JIT-optimized unrolled kernels with auto-selected factor (4/8/16).
 *
 * @example
 * ```ts
 * const similarities = await dotProduct(embeddingsA, embeddingsB);
 * // similarities is Float32Array with one value per pair
 * ```
 */
export const dotProduct = <T extends NumericArray>(
  vectorsA: Vectors<T>,
  vectorsB: Vectors<T>,
  options?: OpOptions,
): Float32Array => {
  const count = vectorsA.length;
  if (count !== vectorsB.length) {
    throw new RangeError(
      `dotProduct: vectorsA.length (${count}) !== vectorsB.length (${vectorsB.length})`,
    );
  }
  if (count === 0) return new Float32Array(0);

  const dims = vectorsA[0].length;
  const factor = options?.unroll ?? selectUnrollFactor(dims);
  const kernel = getDotKernel(factor);
  const results = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    results[i] = kernel(vectorsA[i], vectorsB[i], dims);
  }

  return results;
};
