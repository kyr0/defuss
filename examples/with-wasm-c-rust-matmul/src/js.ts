import type { Vectors } from "./types";

export const dot_product_js_serial = (
  vectorsA: Vectors,
  vectorsB: Vectors,
): Float32Array => {
  const size = vectorsA.length;
  const results = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    results[i] = vectorsA[i].reduce(
      (sum, ai, j) => sum + ai * vectorsB[i][j],
      0,
    );
  }
  return results;
};
