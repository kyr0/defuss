import type { NumericArray, Matrix, OpOptions } from "../types.js";
import { selectUnrollFactor, getDotKernel } from "./unroll.js";

/**
 * Matrix multiplication.  C = A × B
 *
 * Row-parallel: each "worker" computes a slice of C's rows.
 * Inner dot product uses the unrolled kernel (4/8/16) for the k-dimension.
 *
 * Complexity: O(M × N × K) with M = A.rows, K = A.cols = B.rows, N = B.cols.
 */
export const matmul = <T extends NumericArray>(
  A: Matrix<T>,
  B: Matrix<T>,
  options?: OpOptions,
): Matrix<T> => {
  const M = A.length;         // rows of A
  if (M === 0) return [] as unknown as Matrix<T>;

  const K = A[0].length;      // cols of A = rows of B
  const bRows = B.length;
  if (K !== bRows) {
    throw new RangeError(
      `matmul: A.cols (${K}) !== B.rows (${bRows})`,
    );
  }
  const N = B[0].length;      // cols of B

  const factor = options?.unroll ?? selectUnrollFactor(K);
  const dotKernel = getDotKernel(factor);

  // Determine output constructor from A's row type
  const Ctor = A[0].constructor as { new (len: number): T };

  // Transpose B once for cache-friendly column access during dot products
  const BT: NumericArray[] = new Array(N);
  for (let col = 0; col < N; col++) {
    const column = new (B[0].constructor as { new (len: number): NumericArray })(K);
    for (let row = 0; row < K; row++) {
      column[row] = B[row][col];
    }
    BT[col] = column;
  }

  const C: T[] = new Array(M);
  for (let i = 0; i < M; i++) {
    const row = new Ctor(N);
    const aRow = A[i] as NumericArray;
    for (let j = 0; j < N; j++) {
      (row as unknown as NumericArray)[j] = dotKernel(aRow, BT[j], K);
    }
    C[i] = row;
  }

  return C as Matrix<T>;
};
