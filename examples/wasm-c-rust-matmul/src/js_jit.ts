import type { Vectors } from "./types";

export const dot_product_js_jit_serial = (
  vectorsA: Vectors,
  vectorsB: Vectors,
): Float32Array => {
  const dims = vectorsA[0].length;
  const size = vectorsA.length;
  const results = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    let result = 0.0;
    const vectorA = vectorsA[i];
    const vectorB = vectorsB[i];

    // Unrolling the loop to improve performance
    // 300% faster than baseline/naive: vectorA.reduce((sum, ai, i) => sum + ai * vectorB[i], 0)
    let j = 0;
    const unrollFactor = 4;
    const length = Math.floor(dims / unrollFactor) * unrollFactor;

    for (; j < length; j += unrollFactor) {
      // JIT optimization, unroll factor of 4, could be 8 or 16 too
      result +=
        vectorA[j] * vectorB[j] +
        vectorA[j + 1] * vectorB[j + 1] +
        vectorA[j + 2] * vectorB[j + 2] +
        vectorA[j + 3] * vectorB[j + 3];
    }
    results[i] = result;
  }
  return results;
};
