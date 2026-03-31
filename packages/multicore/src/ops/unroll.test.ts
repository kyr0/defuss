import { describe, it, expect } from "vitest";
import {
  selectUnrollFactor,
  createElementWiseKernel,
  createDotKernel,
  getElementWiseKernel,
  getDotKernel,
} from "./unroll.js";

// ─── selectUnrollFactor ─────────────────────────────────────────────

describe("selectUnrollFactor", () => {
  it("returns 4 for dims < 16", () => {
    expect(selectUnrollFactor(1)).toBe(4);
    expect(selectUnrollFactor(4)).toBe(4);
    expect(selectUnrollFactor(15)).toBe(4);
  });

  it("returns 8 for 16 <= dims < 64", () => {
    expect(selectUnrollFactor(16)).toBe(8);
    expect(selectUnrollFactor(32)).toBe(8);
    expect(selectUnrollFactor(63)).toBe(8);
  });

  it("returns 16 for dims >= 64", () => {
    expect(selectUnrollFactor(64)).toBe(16);
    expect(selectUnrollFactor(128)).toBe(16);
    expect(selectUnrollFactor(768)).toBe(16);
    expect(selectUnrollFactor(10000)).toBe(16);
  });
});

// ─── Naive reference implementations ────────────────────────────────

const naiveElementWise = (
  op: "add" | "sub" | "mul" | "div",
  a: number[],
  b: number[],
): number[] => {
  const ops = {
    add: (x: number, y: number) => x + y,
    sub: (x: number, y: number) => x - y,
    mul: (x: number, y: number) => x * y,
    div: (x: number, y: number) => x / y,
  };
  return a.map((v, i) => ops[op](v, b[i]));
};

const naiveDot = (a: number[], b: number[]): number =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);

// ─── Helper: generate random data ──────────────────────────────────

const randomArray = (len: number): number[] =>
  Array.from({ length: len }, () => Math.random() * 10 - 5);

const toTyped = <T extends Float32Array | Float64Array | Int32Array | Uint8Array>(
  Ctor: new (arr: number[]) => T,
  arr: number[],
): T => new Ctor(arr);

// ─── createElementWiseKernel ────────────────────────────────────────

describe("createElementWiseKernel", () => {
  const ops = ["add", "sub", "mul", "div"] as const;
  const factors = [4, 8, 16] as const;

  for (const op of ops) {
    for (const factor of factors) {
      describe(`${op} × unroll-${factor}`, () => {
        it("handles length exactly divisible by factor", () => {
          const len = factor * 5;
          const a = randomArray(len);
          const b = randomArray(len);
          const out = new Array(len).fill(0);
          const expected = naiveElementWise(op, a, b);

          const kernel = createElementWiseKernel(op, factor);
          kernel(a, b, out, 0, len);

          for (let i = 0; i < len; i++) {
            expect(out[i]).toBeCloseTo(expected[i], 10);
          }
        });

        it("handles length NOT divisible by factor (remainder path)", () => {
          const len = factor * 3 + Math.floor(factor / 2) + 1;
          const a = randomArray(len);
          const b = randomArray(len);
          const out = new Array(len).fill(0);
          const expected = naiveElementWise(op, a, b);

          const kernel = createElementWiseKernel(op, factor);
          kernel(a, b, out, 0, len);

          for (let i = 0; i < len; i++) {
            expect(out[i]).toBeCloseTo(expected[i], 10);
          }
        });

        it("handles offset > 0", () => {
          const offset = 3;
          const len = factor * 2 + 1;
          const total = offset + len + 2; // extra padding
          const a = randomArray(total);
          const b = randomArray(total);
          const out = new Array(total).fill(-999);
          const expected = naiveElementWise(op, a.slice(offset, offset + len), b.slice(offset, offset + len));

          const kernel = createElementWiseKernel(op, factor);
          kernel(a, b, out, offset, len);

          // Before offset: untouched
          for (let i = 0; i < offset; i++) {
            expect(out[i]).toBe(-999);
          }
          // The computed range
          for (let i = 0; i < len; i++) {
            expect(out[offset + i]).toBeCloseTo(expected[i], 10);
          }
          // After range: untouched
          for (let i = offset + len; i < total; i++) {
            expect(out[i]).toBe(-999);
          }
        });

        it("handles length = 0", () => {
          const kernel = createElementWiseKernel(op, factor);
          const out = [1, 2, 3];
          kernel([1, 2, 3], [4, 5, 6], out, 0, 0);
          expect(out).toEqual([1, 2, 3]); // unchanged
        });

        it("handles length = 1", () => {
          const kernel = createElementWiseKernel(op, factor);
          const out = [0];
          kernel([7], [3], out, 0, 1);
          expect(out[0]).toBeCloseTo(naiveElementWise(op, [7], [3])[0], 10);
        });
      });
    }
  }

  describe("works with Float32Array", () => {
    it("add unroll-4 with Float32Array", () => {
      const a = new Float32Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const b = new Float32Array([8, 7, 6, 5, 4, 3, 2, 1]);
      const out = new Float32Array(8);
      const kernel = createElementWiseKernel("add", 4);
      kernel(a, b, out, 0, 8);
      expect(Array.from(out)).toEqual([9, 9, 9, 9, 9, 9, 9, 9]);
    });
  });

  describe("works with Float64Array", () => {
    it("sub unroll-8 with Float64Array", () => {
      const a = new Float64Array([10, 20, 30, 40, 50, 60, 70, 80]);
      const b = new Float64Array([1, 2, 3, 4, 5, 6, 7, 8]);
      const out = new Float64Array(8);
      const kernel = createElementWiseKernel("sub", 8);
      kernel(a, b, out, 0, 8);
      expect(Array.from(out)).toEqual([9, 18, 27, 36, 45, 54, 63, 72]);
    });
  });

  describe("works with Int32Array", () => {
    it("mul unroll-4 with Int32Array", () => {
      const a = new Int32Array([2, 3, 4, 5]);
      const b = new Int32Array([10, 20, 30, 40]);
      const out = new Int32Array(4);
      const kernel = createElementWiseKernel("mul", 4);
      kernel(a, b, out, 0, 4);
      expect(Array.from(out)).toEqual([20, 60, 120, 200]);
    });
  });

  describe("works with Uint8Array", () => {
    it("add unroll-16 with Uint8Array", () => {
      const a = new Uint8Array(16).fill(10);
      const b = new Uint8Array(16).fill(5);
      const out = new Uint8Array(16);
      const kernel = createElementWiseKernel("add", 16);
      kernel(a, b, out, 0, 16);
      expect(Array.from(out)).toEqual(new Array(16).fill(15));
    });
  });
});

// ─── createDotKernel ────────────────────────────────────────────────

describe("createDotKernel", () => {
  const factors = [4, 8, 16] as const;

  for (const factor of factors) {
    describe(`unroll-${factor}`, () => {
      it("computes correct dot product for length exactly divisible by factor", () => {
        const len = factor * 4;
        const a = randomArray(len);
        const b = randomArray(len);
        const expected = naiveDot(a, b);

        const kernel = createDotKernel(factor);
        const result = kernel(a, b, len);

        expect(result).toBeCloseTo(expected, 6);
      });

      it("computes correct dot product for length NOT divisible by factor", () => {
        const len = factor * 3 + Math.ceil(factor / 2) + 1;
        const a = randomArray(len);
        const b = randomArray(len);
        const expected = naiveDot(a, b);

        const kernel = createDotKernel(factor);
        const result = kernel(a, b, len);

        expect(result).toBeCloseTo(expected, 6);
      });

      it("returns 0 for zero-length vectors", () => {
        const kernel = createDotKernel(factor);
        expect(kernel([], [], 0)).toBe(0);
      });

      it("returns correct result for length = 1", () => {
        const kernel = createDotKernel(factor);
        expect(kernel([3], [7], 1)).toBe(21);
      });

      it("returns correct result for length = 2", () => {
        const kernel = createDotKernel(factor);
        expect(kernel([2, 3], [4, 5], 2)).toBe(23); // 2*4 + 3*5
      });

      it("handles large dimensions (768-dim, embedding-like)", () => {
        const len = 768;
        const a = randomArray(len);
        const b = randomArray(len);
        const expected = naiveDot(a, b);

        const kernel = createDotKernel(factor);
        const result = kernel(a, b, len);

        expect(result).toBeCloseTo(expected, 4);
      });
    });
  }

  describe("works with Float32Array", () => {
    it("unroll-4 with Float32Array", () => {
      const a = new Float32Array([1, 2, 3, 4]);
      const b = new Float32Array([4, 3, 2, 1]);
      const kernel = createDotKernel(4);
      // 1*4 + 2*3 + 3*2 + 4*1 = 4 + 6 + 6 + 4 = 20
      expect(kernel(a, b, 4)).toBeCloseTo(20, 5);
    });
  });

  describe("works with Float64Array", () => {
    it("unroll-8 with Float64Array", () => {
      const a = new Float64Array([1, 1, 1, 1, 1, 1, 1, 1]);
      const b = new Float64Array([2, 2, 2, 2, 2, 2, 2, 2]);
      const kernel = createDotKernel(8);
      expect(kernel(a, b, 8)).toBe(16);
    });
  });

  describe("works with Int32Array", () => {
    it("unroll-4 with Int32Array", () => {
      const a = new Int32Array([1, -1, 2, -2]);
      const b = new Int32Array([3, 3, 3, 3]);
      const kernel = createDotKernel(4);
      // 1*3 + (-1)*3 + 2*3 + (-2)*3 = 3 - 3 + 6 - 6 = 0
      expect(kernel(a, b, 4)).toBe(0);
    });
  });
});

// ─── Kernel caching ─────────────────────────────────────────────────

describe("getElementWiseKernel (caching)", () => {
  it("returns the same kernel for same op+factor", () => {
    const k1 = getElementWiseKernel("add", 4);
    const k2 = getElementWiseKernel("add", 4);
    expect(k1).toBe(k2);
  });

  it("returns different kernels for different ops", () => {
    const k1 = getElementWiseKernel("add", 4);
    const k2 = getElementWiseKernel("sub", 4);
    expect(k1).not.toBe(k2);
  });

  it("returns different kernels for different factors", () => {
    const k1 = getElementWiseKernel("add", 4);
    const k2 = getElementWiseKernel("add", 8);
    expect(k1).not.toBe(k2);
  });
});

describe("getDotKernel (caching)", () => {
  it("returns the same kernel for same factor", () => {
    const k1 = getDotKernel(4);
    const k2 = getDotKernel(4);
    expect(k1).toBe(k2);
  });

  it("returns different kernels for different factors", () => {
    const k1 = getDotKernel(4);
    const k2 = getDotKernel(16);
    expect(k1).not.toBe(k2);
  });
});

// ─── Cross-check: all unroll factors agree ──────────────────────────

describe("cross-factor consistency", () => {
  it("all dot kernel factors produce the same result for 768-dim vectors", () => {
    const len = 768;
    const a = randomArray(len);
    const b = randomArray(len);
    const expected = naiveDot(a, b);

    const r4 = createDotKernel(4)(a, b, len);
    const r8 = createDotKernel(8)(a, b, len);
    const r16 = createDotKernel(16)(a, b, len);

    expect(r4).toBeCloseTo(expected, 4);
    expect(r8).toBeCloseTo(expected, 4);
    expect(r16).toBeCloseTo(expected, 4);
  });

  it("all element-wise add factors produce the same result for 100-elem arrays", () => {
    const len = 100;
    const a = randomArray(len);
    const b = randomArray(len);
    const expected = naiveElementWise("add", a, b);

    for (const factor of [4, 8, 16] as const) {
      const out = new Array(len).fill(0);
      createElementWiseKernel("add", factor)(a, b, out, 0, len);
      for (let i = 0; i < len; i++) {
        expect(out[i]).toBeCloseTo(expected[i], 10);
      }
    }
  });
});
