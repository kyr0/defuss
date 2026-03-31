import type { NumericArray } from "../types.js";

// ─── Unroll Factor Selection ────────────────────────────────────────

/**
 * Auto-select loop unroll factor based on dimensionality.
 * - dims < 16  → 4  (16-byte stepping)
 * - dims < 64  → 8  (32-byte stepping)
 * - dims >= 64 → 16 (64-byte stepping, matches WASM SIMD 4×4)
 */
export const selectUnrollFactor = (dims: number): 4 | 8 | 16 => {
  if (dims < 16) return 4;
  if (dims < 64) return 8;
  return 16;
};

// ─── Element-Wise Kernels ───────────────────────────────────────────

type ElementOp = "add" | "sub" | "mul" | "div";

const opFn: Record<ElementOp, (a: number, b: number) => number> = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b,
  div: (a, b) => a / b,
};

/**
 * Create an unrolled element-wise kernel for a given operator and factor.
 * Writes results into `out` starting at `offset` for `length` elements.
 */
export const createElementWiseKernel = (
  op: ElementOp,
  factor: 4 | 8 | 16,
): ((a: NumericArray, b: NumericArray, out: NumericArray, offset: number, length: number) => void) => {
  const fn = opFn[op];

  return (a, b, out, offset, length) => {
    const end = offset + length;
    const unrolledEnd = offset + length - (length % factor);
    let j = offset;

    // Unrolled main loop
    if (factor === 4) {
      for (; j < unrolledEnd; j += 4) {
        out[j] = fn(a[j], b[j]);
        out[j + 1] = fn(a[j + 1], b[j + 1]);
        out[j + 2] = fn(a[j + 2], b[j + 2]);
        out[j + 3] = fn(a[j + 3], b[j + 3]);
      }
    } else if (factor === 8) {
      for (; j < unrolledEnd; j += 8) {
        out[j] = fn(a[j], b[j]);
        out[j + 1] = fn(a[j + 1], b[j + 1]);
        out[j + 2] = fn(a[j + 2], b[j + 2]);
        out[j + 3] = fn(a[j + 3], b[j + 3]);
        out[j + 4] = fn(a[j + 4], b[j + 4]);
        out[j + 5] = fn(a[j + 5], b[j + 5]);
        out[j + 6] = fn(a[j + 6], b[j + 6]);
        out[j + 7] = fn(a[j + 7], b[j + 7]);
      }
    } else {
      // factor === 16
      for (; j < unrolledEnd; j += 16) {
        out[j] = fn(a[j], b[j]);
        out[j + 1] = fn(a[j + 1], b[j + 1]);
        out[j + 2] = fn(a[j + 2], b[j + 2]);
        out[j + 3] = fn(a[j + 3], b[j + 3]);
        out[j + 4] = fn(a[j + 4], b[j + 4]);
        out[j + 5] = fn(a[j + 5], b[j + 5]);
        out[j + 6] = fn(a[j + 6], b[j + 6]);
        out[j + 7] = fn(a[j + 7], b[j + 7]);
        out[j + 8] = fn(a[j + 8], b[j + 8]);
        out[j + 9] = fn(a[j + 9], b[j + 9]);
        out[j + 10] = fn(a[j + 10], b[j + 10]);
        out[j + 11] = fn(a[j + 11], b[j + 11]);
        out[j + 12] = fn(a[j + 12], b[j + 12]);
        out[j + 13] = fn(a[j + 13], b[j + 13]);
        out[j + 14] = fn(a[j + 14], b[j + 14]);
        out[j + 15] = fn(a[j + 15], b[j + 15]);
      }
    }

    // Remainder
    for (; j < end; j++) {
      out[j] = fn(a[j], b[j]);
    }
  };
};

// ─── Dot Product Kernels ────────────────────────────────────────────

/**
 * Create an unrolled dot product kernel for the given factor.
 * Uses multiple accumulators to exploit ILP (instruction-level parallelism).
 */
export const createDotKernel = (
  factor: 4 | 8 | 16,
): ((a: NumericArray, b: NumericArray, dims: number) => number) => {
  return (a, b, dims) => {
    const unrolledEnd = dims - (dims % factor);
    let j = 0;

    if (factor === 4) {
      let acc0 = 0, acc1 = 0, acc2 = 0, acc3 = 0;
      for (; j < unrolledEnd; j += 4) {
        acc0 += a[j] * b[j];
        acc1 += a[j + 1] * b[j + 1];
        acc2 += a[j + 2] * b[j + 2];
        acc3 += a[j + 3] * b[j + 3];
      }
      let sum = acc0 + acc1 + acc2 + acc3;
      for (; j < dims; j++) sum += a[j] * b[j];
      return sum;
    }

    if (factor === 8) {
      let acc0 = 0, acc1 = 0, acc2 = 0, acc3 = 0;
      let acc4 = 0, acc5 = 0, acc6 = 0, acc7 = 0;
      for (; j < unrolledEnd; j += 8) {
        acc0 += a[j] * b[j];
        acc1 += a[j + 1] * b[j + 1];
        acc2 += a[j + 2] * b[j + 2];
        acc3 += a[j + 3] * b[j + 3];
        acc4 += a[j + 4] * b[j + 4];
        acc5 += a[j + 5] * b[j + 5];
        acc6 += a[j + 6] * b[j + 6];
        acc7 += a[j + 7] * b[j + 7];
      }
      let sum = (acc0 + acc1) + (acc2 + acc3) + (acc4 + acc5) + (acc6 + acc7);
      for (; j < dims; j++) sum += a[j] * b[j];
      return sum;
    }

    // factor === 16
    let acc0 = 0, acc1 = 0, acc2 = 0, acc3 = 0;
    let acc4 = 0, acc5 = 0, acc6 = 0, acc7 = 0;
    let acc8 = 0, acc9 = 0, acc10 = 0, acc11 = 0;
    let acc12 = 0, acc13 = 0, acc14 = 0, acc15 = 0;
    for (; j < unrolledEnd; j += 16) {
      acc0 += a[j] * b[j];
      acc1 += a[j + 1] * b[j + 1];
      acc2 += a[j + 2] * b[j + 2];
      acc3 += a[j + 3] * b[j + 3];
      acc4 += a[j + 4] * b[j + 4];
      acc5 += a[j + 5] * b[j + 5];
      acc6 += a[j + 6] * b[j + 6];
      acc7 += a[j + 7] * b[j + 7];
      acc8 += a[j + 8] * b[j + 8];
      acc9 += a[j + 9] * b[j + 9];
      acc10 += a[j + 10] * b[j + 10];
      acc11 += a[j + 11] * b[j + 11];
      acc12 += a[j + 12] * b[j + 12];
      acc13 += a[j + 13] * b[j + 13];
      acc14 += a[j + 14] * b[j + 14];
      acc15 += a[j + 15] * b[j + 15];
    }
    let sum = (acc0 + acc1 + acc2 + acc3)
            + (acc4 + acc5 + acc6 + acc7)
            + (acc8 + acc9 + acc10 + acc11)
            + (acc12 + acc13 + acc14 + acc15);
    for (; j < dims; j++) sum += a[j] * b[j];
    return sum;
  };
};

// ─── Pre-built Kernel Caches ────────────────────────────────────────

// Element-wise kernels keyed by op and factor
const ewCache = new Map<string, ReturnType<typeof createElementWiseKernel>>();

export const getElementWiseKernel = (
  op: ElementOp,
  factor: 4 | 8 | 16,
): ReturnType<typeof createElementWiseKernel> => {
  const key = `${op}_${factor}`;
  let kernel = ewCache.get(key);
  if (!kernel) {
    kernel = createElementWiseKernel(op, factor);
    ewCache.set(key, kernel);
  }
  return kernel;
};

// Dot product kernels keyed by factor
const dotCache = new Map<number, ReturnType<typeof createDotKernel>>();

export const getDotKernel = (
  factor: 4 | 8 | 16,
): ReturnType<typeof createDotKernel> => {
  let kernel = dotCache.get(factor);
  if (!kernel) {
    kernel = createDotKernel(factor);
    dotCache.set(factor, kernel);
  }
  return kernel;
};
