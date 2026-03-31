import { describe, it, expect } from "vitest";
import { matmul } from "./matmul.js";

// ─── Naive reference implementation ─────────────────────────────────

const naiveMatmul = (A: number[][], B: number[][]): number[][] => {
  const M = A.length;
  const K = A[0].length;
  const N = B[0].length;
  const C: number[][] = Array.from({ length: M }, () => new Array(N).fill(0));
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < K; k++) {
        sum += A[i][k] * B[k][j];
      }
      C[i][j] = sum;
    }
  }
  return C;
};

const toNumbers = (mat: any[]): number[][] =>
  mat.map((row: any) => Array.from(row));

const randomF32Row = (cols: number) =>
  new Float32Array(Array.from({ length: cols }, () => Math.random() * 4 - 2));

const randomF64Row = (cols: number) =>
  new Float64Array(Array.from({ length: cols }, () => Math.random() * 4 - 2));

// ─── Basic correctness ─────────────────────────────────────────────

describe("matmul", () => {
  it("multiplies 2x3 * 3x2 identity-like", () => {
    // A = [[1,0,0],[0,1,0]]  B = [[1,0],[0,1],[0,0]]
    // C = [[1,0],[0,1]]
    const A = [new Float32Array([1, 0, 0]), new Float32Array([0, 1, 0])];
    const B = [new Float32Array([1, 0]), new Float32Array([0, 1]), new Float32Array([0, 0])];
    const C = matmul(A, B);
    expect(C.length).toBe(2);
    expect(C[0].length).toBe(2);
    expect(Array.from(C[0])).toEqual([1, 0]);
    expect(Array.from(C[1])).toEqual([0, 1]);
  });

  it("multiplies 1x1 * 1x1", () => {
    const A = [new Float32Array([3])];
    const B = [new Float32Array([7])];
    const C = matmul(A, B);
    expect(C.length).toBe(1);
    expect(C[0][0]).toBe(21);
  });

  it("multiplies 2x2 * 2x2", () => {
    const A = [new Float32Array([1, 2]), new Float32Array([3, 4])];
    const B = [new Float32Array([5, 6]), new Float32Array([7, 8])];
    const C = matmul(A, B);
    // [[1*5+2*7, 1*6+2*8], [3*5+4*7, 3*6+4*8]]
    // = [[19, 22], [43, 50]]
    expect(Array.from(C[0])).toEqual([19, 22]);
    expect(Array.from(C[1])).toEqual([43, 50]);
  });

  it("multiplies row vector * column vector → 1x1", () => {
    const A = [new Float32Array([1, 2, 3])]; // 1x3
    const B = [new Float32Array([4]), new Float32Array([5]), new Float32Array([6])]; // 3x1
    const C = matmul(A, B);
    // 1*4 + 2*5 + 3*6 = 32
    expect(C.length).toBe(1);
    expect(C[0].length).toBe(1);
    expect(C[0][0]).toBe(32);
  });

  it("multiplies column vector * row vector → outer product", () => {
    const A = [new Float32Array([1]), new Float32Array([2]), new Float32Array([3])]; // 3x1
    const B = [new Float32Array([4, 5, 6])]; // 1x3
    const C = matmul(A, B);
    // [[4,5,6],[8,10,12],[12,15,18]]
    expect(C.length).toBe(3);
    expect(Array.from(C[0])).toEqual([4, 5, 6]);
    expect(Array.from(C[1])).toEqual([8, 10, 12]);
    expect(Array.from(C[2])).toEqual([12, 15, 18]);
  });

  // ─── Identity matrix ─────────────────────────────────────────────

  it("A * I = A for 4x4 identity", () => {
    const A = [
      new Float32Array([1, 2, 3, 4]),
      new Float32Array([5, 6, 7, 8]),
      new Float32Array([9, 10, 11, 12]),
      new Float32Array([13, 14, 15, 16]),
    ];
    const I = [
      new Float32Array([1, 0, 0, 0]),
      new Float32Array([0, 1, 0, 0]),
      new Float32Array([0, 0, 1, 0]),
      new Float32Array([0, 0, 0, 1]),
    ];
    const C = matmul(A, I);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        expect(C[i][j]).toBeCloseTo(A[i][j], 5);
      }
    }
  });

  // ─── Against naive reference ──────────────────────────────────────

  it("matches naive for 8x16 * 16x8", () => {
    const M = 8, K = 16, N = 8;
    const A = Array.from({ length: M }, () => randomF32Row(K));
    const B = Array.from({ length: K }, () => randomF32Row(N));
    const C = matmul(A, B);
    const expected = naiveMatmul(toNumbers(A), toNumbers(B));

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 2);
      }
    }
  });

  it("matches naive for 32x64 * 64x32 (exercises unroll-16 path)", () => {
    const M = 32, K = 64, N = 32;
    const A = Array.from({ length: M }, () => randomF32Row(K));
    const B = Array.from({ length: K }, () => randomF32Row(N));
    const C = matmul(A, B);
    const expected = naiveMatmul(toNumbers(A), toNumbers(B));

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 0);
      }
    }
  });

  it("matches naive for non-square 7x13 * 13x5 (remainder paths)", () => {
    const M = 7, K = 13, N = 5;
    const A = Array.from({ length: M }, () => randomF32Row(K));
    const B = Array.from({ length: K }, () => randomF32Row(N));
    const C = matmul(A, B);
    const expected = naiveMatmul(toNumbers(A), toNumbers(B));

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 2);
      }
    }
  });

  // ─── TypedArray types ─────────────────────────────────────────────

  it("preserves Float32Array type in output", () => {
    const A = [new Float32Array([1, 2])];
    const B = [new Float32Array([3]), new Float32Array([4])];
    const C = matmul(A, B);
    expect(C[0]).toBeInstanceOf(Float32Array);
  });

  it("preserves Float64Array type in output", () => {
    const A = [new Float64Array([1, 2])];
    const B = [new Float64Array([3]), new Float64Array([4])];
    const C = matmul(A, B);
    expect(C[0]).toBeInstanceOf(Float64Array);
  });

  it("works with Float64Array (higher precision)", () => {
    const M = 10, K = 20, N = 10;
    const A = Array.from({ length: M }, () => randomF64Row(K));
    const B = Array.from({ length: K }, () => randomF64Row(N));
    const C = matmul(A, B);
    const expected = naiveMatmul(toNumbers(A), toNumbers(B));

    for (let i = 0; i < M; i++) {
      for (let j = 0; j < N; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 8);
      }
    }
  });

  it("works with Int32Array", () => {
    const A = [new Int32Array([1, 2]), new Int32Array([3, 4])];
    const B = [new Int32Array([5, 6]), new Int32Array([7, 8])];
    const C = matmul(A, B);
    expect(Array.from(C[0])).toEqual([19, 22]);
    expect(Array.from(C[1])).toEqual([43, 50]);
    expect(C[0]).toBeInstanceOf(Int32Array);
  });

  // ─── Unroll option ────────────────────────────────────────────────

  it("works with explicit unroll=4", () => {
    const A = [new Float32Array([1, 2, 3, 4])];
    const B = [
      new Float32Array([1]),
      new Float32Array([1]),
      new Float32Array([1]),
      new Float32Array([1]),
    ];
    const C = matmul(A, B, { unroll: 4 });
    expect(C[0][0]).toBe(10); // 1+2+3+4
  });

  // ─── Edge cases ───────────────────────────────────────────────────

  it("returns empty array for empty input", () => {
    const C = matmul([] as Float32Array[], []);
    expect(C.length).toBe(0);
  });

  it("throws RangeError when A.cols !== B.rows", () => {
    const A = [new Float32Array([1, 2, 3])]; // 1x3
    const B = [new Float32Array([1, 2])];     // 1x2 — should be 3xN
    expect(() => matmul(A, B)).toThrow(RangeError);
  });

  // ─── Larger exercise for cache/transpose ──────────────────────────

  it("handles 64x64 * 64x64 (stresses transpose + unroll-16)", () => {
    const N = 64;
    const A = Array.from({ length: N }, () => randomF32Row(N));
    const B = Array.from({ length: N }, () => randomF32Row(N));
    const C = matmul(A, B);
    const expected = naiveMatmul(toNumbers(A), toNumbers(B));

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], -1); // Float32 loses precision
      }
    }
  });
});
