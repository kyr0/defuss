import type { NumericArray, Matrix, OpOptions } from "../types.js";
import { selectUnrollFactor, getElementWiseKernel } from "./unroll.js";

/**
 * Element-wise matrix subtraction.  C[i][j] = A[i][j] - B[i][j]
 *
 * Row-parallel with unrolled inner loop (factor 4/8/16).
 * Output TypedArray constructor matches input type.
 */
export const matsub = <T extends NumericArray>(
  A: Matrix<T>,
  B: Matrix<T>,
  options?: OpOptions,
): Matrix<T> => {
  const rows = A.length;
  if (rows !== B.length) {
    throw new RangeError(`matsub: row count mismatch (${rows} vs ${B.length})`);
  }
  if (rows === 0) return [] as unknown as Matrix<T>;

  const cols = A[0].length;
  const factor = options?.unroll ?? selectUnrollFactor(cols);
  const kernel = getElementWiseKernel("sub", factor);

  const Ctor = A[0].constructor as { new (len: number): T };
  const C: T[] = new Array(rows);

  for (let i = 0; i < rows; i++) {
    const out = new Ctor(cols);
    kernel(A[i], B[i], out as unknown as NumericArray, 0, cols);
    C[i] = out;
  }

  return C as Matrix<T>;
};
