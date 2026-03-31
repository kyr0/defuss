import { describe, it, expect } from "vitest";
import { matadd } from "./matadd.js";
import { matsub } from "./matsub.js";
import { matdiv } from "./matdiv.js";
import type { NumericArray, Matrix } from "../types.js";

// --- Helpers --------------------------------------------------------

const randomF32Row = (cols: number) =>
  new Float32Array(Array.from({ length: cols }, () => Math.random() * 10 - 5));

const randomF64Row = (cols: number) =>
  new Float64Array(Array.from({ length: cols }, () => Math.random() * 10 - 5));

const makeMatrix = <T extends NumericArray>(
  Ctor: new (arr: number[]) => T,
  rows: number,
  cols: number,
  fill: () => number,
): T[] =>
  Array.from({ length: rows }, () =>
    new Ctor(Array.from({ length: cols }, fill)) as T
  );

const naiveOp = (
  op: "add" | "sub" | "div",
  A: number[][],
  B: number[][],
): number[][] => {
  const ops = {
    add: (a: number, b: number) => a + b,
    sub: (a: number, b: number) => a - b,
    div: (a: number, b: number) => a / b,
  };
  return A.map((row, i) => row.map((v, j) => ops[op](v, B[i][j])));
};

const toNumbers = (mat: NumericArray[]): number[][] =>
  mat.map((row) => Array.from(row as any));

// --- matadd ---------------------------------------------------------

describe("matadd", () => {
  it("adds two 2x4 Float32Array matrices", () => {
    const A = [new Float32Array([1, 2, 3, 4]), new Float32Array([5, 6, 7, 8])];
    const B = [new Float32Array([8, 7, 6, 5]), new Float32Array([4, 3, 2, 1])];
    const C = matadd(A, B);
    expect(C.length).toBe(2);
    expect(Array.from(C[0])).toEqual([9, 9, 9, 9]);
    expect(Array.from(C[1])).toEqual([9, 9, 9, 9]);
  });

  it("preserves Float32Array type in output", () => {
    const A = [new Float32Array([1, 2])];
    const B = [new Float32Array([3, 4])];
    const C = matadd(A, B);
    expect(C[0]).toBeInstanceOf(Float32Array);
  });

  it("preserves Float64Array type in output", () => {
    const A = [new Float64Array([1.5, 2.5])];
    const B = [new Float64Array([3.5, 4.5])];
    const C = matadd(A, B);
    expect(C[0]).toBeInstanceOf(Float64Array);
    expect(Array.from(C[0])).toEqual([5, 7]);
  });

  it("preserves Int32Array type in output", () => {
    const A = [new Int32Array([10, 20])];
    const B = [new Int32Array([30, 40])];
    const C = matadd(A, B);
    expect(C[0]).toBeInstanceOf(Int32Array);
    expect(Array.from(C[0])).toEqual([40, 60]);
  });

  it("handles large matrix (100x128) correctly against naive", () => {
    const rows = 100, cols = 128;
    const A = Array.from({ length: rows }, () => randomF32Row(cols));
    const B = Array.from({ length: rows }, () => randomF32Row(cols));
    const C = matadd(A, B);
    const expected = naiveOp("add", toNumbers(A), toNumbers(B));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 3);
      }
    }
  });

  it("handles cols not divisible by unroll factor", () => {
    const A = [new Float32Array([1, 2, 3, 4, 5])]; // 5 cols
    const B = [new Float32Array([10, 20, 30, 40, 50])];
    const C = matadd(A, B);
    expect(Array.from(C[0])).toEqual([11, 22, 33, 44, 55]);
  });

  it("returns empty array for empty input", () => {
    const C = matadd([] as Float32Array[], [] as Float32Array[]);
    expect(C.length).toBe(0);
  });

  it("throws RangeError on row count mismatch", () => {
    const A = [new Float32Array([1, 2])];
    const B = [new Float32Array([3, 4]), new Float32Array([5, 6])];
    expect(() => matadd(A, B)).toThrow(RangeError);
  });

  it("respects explicit unroll option", () => {
    const A = [new Float32Array([1, 2, 3, 4])];
    const B = [new Float32Array([4, 3, 2, 1])];
    const C = matadd(A, B, { unroll: 4 });
    expect(Array.from(C[0])).toEqual([5, 5, 5, 5]);
  });
});

// --- matsub ---------------------------------------------------------

describe("matsub", () => {
  it("subtracts two 2x4 Float32Array matrices", () => {
    const A = [new Float32Array([10, 20, 30, 40]), new Float32Array([50, 60, 70, 80])];
    const B = [new Float32Array([1, 2, 3, 4]), new Float32Array([5, 6, 7, 8])];
    const C = matsub(A, B);
    expect(Array.from(C[0])).toEqual([9, 18, 27, 36]);
    expect(Array.from(C[1])).toEqual([45, 54, 63, 72]);
  });

  it("preserves type in output", () => {
    const A = [new Float64Array([5, 10])];
    const B = [new Float64Array([2, 3])];
    const C = matsub(A, B);
    expect(C[0]).toBeInstanceOf(Float64Array);
    expect(Array.from(C[0])).toEqual([3, 7]);
  });

  it("produces negative values", () => {
    const A = [new Float32Array([1, 2, 3])];
    const B = [new Float32Array([10, 20, 30])];
    const C = matsub(A, B);
    expect(Array.from(C[0])).toEqual([-9, -18, -27]);
  });

  it("handles large matrix against naive", () => {
    const rows = 50, cols = 67; // odd cols
    const A = Array.from({ length: rows }, () => randomF64Row(cols));
    const B = Array.from({ length: rows }, () => randomF64Row(cols));
    const C = matsub(A, B);
    const expected = naiveOp("sub", toNumbers(A), toNumbers(B));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 10);
      }
    }
  });

  it("returns empty array for empty input", () => {
    expect(matsub([], []).length).toBe(0);
  });

  it("throws RangeError on row count mismatch", () => {
    expect(() => matsub([new Float32Array(4)], [])).toThrow(RangeError);
  });
});

// --- matdiv ---------------------------------------------------------

describe("matdiv", () => {
  it("divides two 1x4 Float32Array matrices", () => {
    const A = [new Float32Array([10, 20, 30, 40])];
    const B = [new Float32Array([2, 4, 5, 8])];
    const C = matdiv(A, B);
    expect(Array.from(C[0])).toEqual([5, 5, 6, 5]);
  });

  it("preserves type in output", () => {
    const A = [new Float64Array([10, 20])];
    const B = [new Float64Array([2, 5])];
    const C = matdiv(A, B);
    expect(C[0]).toBeInstanceOf(Float64Array);
    expect(Array.from(C[0])).toEqual([5, 4]);
  });

  it("handles fractional results with Float32Array", () => {
    const A = [new Float32Array([1, 1, 1])];
    const B = [new Float32Array([3, 7, 11])];
    const C = matdiv(A, B);
    expect(C[0][0]).toBeCloseTo(1 / 3, 5);
    expect(C[0][1]).toBeCloseTo(1 / 7, 5);
    expect(C[0][2]).toBeCloseTo(1 / 11, 5);
  });

  it("produces Infinity on division by zero for float types", () => {
    const A = [new Float32Array([1])];
    const B = [new Float32Array([0])];
    const C = matdiv(A, B);
    expect(C[0][0]).toBe(Infinity);
  });

  it("handles large matrix against naive", () => {
    const rows = 30, cols = 100;
    const A = Array.from({ length: rows }, () =>
      new Float64Array(Array.from({ length: cols }, () => Math.random() * 10 + 1)),
    );
    const B = Array.from({ length: rows }, () =>
      new Float64Array(Array.from({ length: cols }, () => Math.random() * 10 + 1)),
    );
    const C = matdiv(A, B);
    const expected = naiveOp("div", toNumbers(A), toNumbers(B));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        expect(C[i][j]).toBeCloseTo(expected[i][j], 10);
      }
    }
  });

  it("returns empty array for empty input", () => {
    expect(matdiv([], []).length).toBe(0);
  });

  it("throws RangeError on row count mismatch", () => {
    expect(() => matdiv([new Float32Array(4)], [])).toThrow(RangeError);
  });
});

// --- Cross-op consistency -------------------------------------------

describe("cross-op: add then sub yields original", () => {
  it("A + B - B ~= A", () => {
    const A = [randomF64Row(32), randomF64Row(32)];
    const B = [randomF64Row(32), randomF64Row(32)];
    const sum = matadd(A, B);
    const result = matsub(sum, B);

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 32; j++) {
        expect(result[i][j]).toBeCloseTo(A[i][j], 10);
      }
    }
  });
});
