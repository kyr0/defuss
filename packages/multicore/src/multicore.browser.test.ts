/**
 * E2E browser test for defuss-multicore.
 *
 * Runs in a real Chromium browser via Playwright + vitest browser mode.
 * Validates that Web Worker execution (Blob URL pool) works end-to-end:
 *   - multicore HOF distributes work across browser Web Workers
 *   - parallel map/filter/reduce work in the browser
 *   - TypedArray ops (dotProduct, matmul, matadd, etc.) execute correctly
 *   - AbortController cancellation works
 *   - Streaming via AsyncIterable works
 */
import { describe, it, expect } from "vitest";
import { multicore, getPoolSize } from "./index.js";
import { map, filter, reduce } from "./parallel-array.js";
import { dotProduct } from "./ops/dotproduct.js";
import { matmul } from "./ops/matmul.js";
import { matadd } from "./ops/matadd.js";
import { matsub } from "./ops/matsub.js";
import { matdiv } from "./ops/matdiv.js";

// --- Environment Sanity --------------------------------------------

describe("browser environment", () => {
  it("detects Web Worker support", () => {
    expect(typeof Worker).toBe("function");
  });

  it("getPoolSize returns a positive integer", () => {
    const size = getPoolSize();
    expect(size).toBeGreaterThan(0);
    expect(Number.isInteger(size)).toBe(true);
  });
});

// --- multicore HOF (Web Workers) -----------------------------------

describe("multicore HOF in browser", () => {
  it("executes a pure function across Web Workers", async () => {
    const sum = multicore(
      (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
      { threshold: 64 },
    );

    // Generate array large enough to exceed threshold
    const data = Array.from({ length: 2000 }, (_, i) => i + 1);
    const results = await sum(data);
    const total = (results as number[]).reduce((a, b) => a + b, 0);

    // Sum of 1..2000 = 2000*2001/2 = 2_001_000
    expect(total).toBe(2_001_000);
  });

  it("handles reduce option in browser", async () => {
    const parallelSum = multicore(
      (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
      { threshold: 64, reduce: (a: number, b: number) => a + b },
    );

    const data = Array.from({ length: 5000 }, (_, i) => i + 1);
    const total = await parallelSum(data);

    expect(total).toBe(5000 * 5001 / 2);
  });

  it("falls back to main thread for small arrays", async () => {
    const double = multicore((x: number[]) => x.map((v) => v * 2));

    const small = [1, 2, 3];
    const result = await double(small);
    expect(result).toEqual([[2, 4, 6]]);
  });

  it("distributes TypedArray across workers in browser", async () => {
    const sum = multicore(
      (chunk: Float32Array) => {
        let s = 0;
        for (let i = 0; i < chunk.length; i++) s += chunk[i];
        return s;
      },
      { threshold: 64, reduce: (a: number, b: number) => a + b },
    );

    const arr = new Float32Array(4096);
    for (let i = 0; i < arr.length; i++) arr[i] = 1;

    const total = await sum(arr);
    expect(total).toBe(4096);
  });

  it("streams results via AsyncIterable in browser", async () => {
    const identity = multicore(
      (chunk: number[]) => chunk.length,
      { threshold: 64 },
    );

    const data = Array.from({ length: 3000 }, (_, i) => i);
    const lengths: number[] = [];

    for await (const len of identity(data)) {
      lengths.push(len as number);
    }

    expect(lengths.length).toBeGreaterThan(0);
    expect(lengths.reduce((a, b) => a + b, 0)).toBe(3000);
  });

  it("supports AbortController cancellation in browser", async () => {
    const slowFn = multicore(
      (chunk: number[]) => {
        // Simulate slow work
        let sum = 0;
        for (let i = 0; i < 1e7; i++) sum += i;
        return chunk.reduce((a, b) => a + b, 0) + sum * 0;
      },
      { threshold: 64 },
    );

    const data = Array.from({ length: 10000 }, (_, i) => i);
    const controller = new AbortController();

    // Abort immediately
    controller.abort();

    await expect(slowFn(data, { signal: controller.signal })).rejects.toThrow();
  });
});

// --- parallel map/filter/reduce (browser Web Workers) --------------

describe("parallel map in browser", () => {
  it("maps over large array using Web Workers", async () => {
    const data = Array.from({ length: 5000 }, (_, i) => i);
    const result = await map(data, (x: number) => x * 3);

    expect(result.length).toBe(5000);
    expect(result[0]).toBe(0);
    expect(result[1]).toBe(3);
    expect(result[4999]).toBe(4999 * 3);
  });
});

describe("parallel filter in browser", () => {
  it("filters large array using Web Workers", async () => {
    const data = Array.from({ length: 5000 }, (_, i) => i);
    const result = await filter(data, (x: number) => x % 2 === 0);

    expect(result.length).toBe(2500);
    expect((result as unknown as number[]).every((x: number) => x % 2 === 0)).toBe(true);
  });
});

describe("parallel reduce in browser", () => {
  it("reduces large array using Web Workers", async () => {
    const data = Array.from({ length: 5000 }, (_, i) => i + 1);
    const result = await reduce(data, (a: number, b: number) => a + b, 0);

    expect(result).toBe(5000 * 5001 / 2);
  });
});

// --- Vector/Matrix ops (computation correctness in browser) --------

describe("dotProduct in browser", () => {
  it("computes correct dot product of Float32Arrays", () => {
    const a = Float32Array.from([1, 2, 3, 4]);
    const b = Float32Array.from([5, 6, 7, 8]);
    // 1*5 + 2*6 + 3*7 + 4*8 = 5 + 12 + 21 + 32 = 70
    const result = dotProduct([a], [b]);
    expect(result[0]).toBe(70);
  });

  it("handles large dimension dot product (768-dim, embedding size)", () => {
    const dim = 768;
    const a = new Float64Array(dim);
    const b = new Float64Array(dim);
    for (let i = 0; i < dim; i++) {
      a[i] = 1;
      b[i] = 1;
    }
    const result = dotProduct([a], [b]);
    expect(result[0]).toBe(dim);
  });

  it("batch dot product works in browser", () => {
    const n = 50;
    const dim = 32;
    const as: Float64Array[] = [];
    const bs: Float64Array[] = [];
    for (let i = 0; i < n; i++) {
      const a = new Float64Array(dim).fill(1);
      const b = new Float64Array(dim).fill(2);
      as.push(a);
      bs.push(b);
    }
    const result = dotProduct(as, bs);
    expect(result.length).toBe(n);
    for (let i = 0; i < n; i++) {
      expect(result[i]).toBe(dim * 2); // 1*2 * 32 = 64
    }
  });
});

describe("matmul in browser", () => {
  it("multiplies 2x3 * 3x2 correctly", () => {
    const A = [
      new Float64Array([1, 2, 3]),
      new Float64Array([4, 5, 6]),
    ]; // 2x3
    const B = [
      new Float64Array([7, 8]),
      new Float64Array([9, 10]),
      new Float64Array([11, 12]),
    ]; // 3x2
    const C = matmul(A, B);

    // Row 0: 1*7+2*9+3*11=58,   1*8+2*10+3*12=64
    // Row 1: 4*7+5*9+6*11=139,  4*8+5*10+6*12=154
    expect(Array.from(C[0])).toEqual([58, 64]);
    expect(Array.from(C[1])).toEqual([139, 154]);
  });

  it("identity matrix multiplication A * I = A", () => {
    const n = 4;
    const A = Array.from({ length: n }, (_, i) =>
      Float64Array.from({ length: n }, (_, j) => i * n + j + 1),
    );
    const I = Array.from({ length: n }, (_, i) => {
      const row = new Float64Array(n);
      row[i] = 1;
      return row;
    });

    const result = matmul(A, I);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        expect(result[i][j]).toBeCloseTo(A[i][j], 10);
      }
    }
  });
});

describe("element-wise matrix ops in browser", () => {
  it("matadd adds two matrices", () => {
    const A = [new Float64Array([1, 2, 3]), new Float64Array([4, 5, 6])];
    const B = [new Float64Array([10, 20, 30]), new Float64Array([40, 50, 60])];
    const C = matadd(A, B);
    expect(Array.from(C[0])).toEqual([11, 22, 33]);
    expect(Array.from(C[1])).toEqual([44, 55, 66]);
  });

  it("matsub subtracts two matrices", () => {
    const A = [new Float64Array([10, 20]), new Float64Array([30, 40])];
    const B = [new Float64Array([1, 2]), new Float64Array([3, 4])];
    const C = matsub(A, B);
    expect(Array.from(C[0])).toEqual([9, 18]);
    expect(Array.from(C[1])).toEqual([27, 36]);
  });

  it("matdiv divides two matrices", () => {
    const A = [new Float64Array([10, 20]), new Float64Array([30, 40])];
    const B = [new Float64Array([2, 4]), new Float64Array([5, 8])];
    const C = matdiv(A, B);
    expect(Array.from(C[0])).toEqual([5, 5]);
    expect(Array.from(C[1])).toEqual([6, 5]);
  });

  it("preserves Float32Array type", () => {
    const A = [new Float32Array([1, 2, 3, 4])];
    const B = [new Float32Array([5, 6, 7, 8])];
    const C = matadd(A, B);
    expect(C[0]).toBeInstanceOf(Float32Array);
  });

  it("round-trip A + B - B ~= A", () => {
    const A = [new Float64Array([1.5, 2.7, 3.1, 4.9])];
    const B = [new Float64Array([10.1, 20.2, 30.3, 40.4])];
    const sum = matadd(A, B);
    const roundTrip = matsub(sum, B);
    for (let j = 0; j < A[0].length; j++) {
      expect(roundTrip[0][j]).toBeCloseTo(A[0][j], 10);
    }
  });
});
