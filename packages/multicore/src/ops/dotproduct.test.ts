import { describe, it, expect } from "vitest";
import { dotProduct } from "./dotproduct.js";

// ─── Naive reference ────────────────────────────────────────────────

const naiveDot = (a: number[], b: number[]): number =>
  a.reduce((sum, v, i) => sum + v * b[i], 0);

const randomArray = (len: number): number[] =>
  Array.from({ length: len }, () => Math.random() * 10 - 5);

const randomF32 = (len: number): Float32Array =>
  new Float32Array(randomArray(len));

// ─── Basic correctness ─────────────────────────────────────────────

describe("dotProduct", () => {
  it("computes correct result for small Float32Array vectors", () => {
    const a = [new Float32Array([1, 2, 3, 4])];
    const b = [new Float32Array([4, 3, 2, 1])];
    const result = dotProduct(a, b);
    // 1*4 + 2*3 + 3*2 + 4*1 = 20
    expect(result[0]).toBeCloseTo(20, 4);
  });

  it("correctly processes a batch of vector pairs", () => {
    const a = [
      new Float32Array([1, 0, 0]),
      new Float32Array([0, 1, 0]),
      new Float32Array([1, 1, 1]),
    ];
    const b = [
      new Float32Array([1, 0, 0]),
      new Float32Array([0, 1, 0]),
      new Float32Array([1, 1, 1]),
    ];
    const result = dotProduct(a, b);
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(1, 5);  // unit x dot unit x
    expect(result[1]).toBeCloseTo(1, 5);  // unit y dot unit y
    expect(result[2]).toBeCloseTo(3, 5);  // (1,1,1)·(1,1,1) = 3
  });

  it("handles orthogonal vectors (result = 0)", () => {
    const a = [new Float32Array([1, 0, 0, 0])];
    const b = [new Float32Array([0, 1, 0, 0])];
    const result = dotProduct(a, b);
    expect(result[0]).toBeCloseTo(0, 5);
  });

  it("handles negative values", () => {
    const a = [new Float32Array([1, -2, 3])];
    const b = [new Float32Array([-1, 2, -3])];
    const result = dotProduct(a, b);
    // 1*(-1) + (-2)*2 + 3*(-3) = -1 - 4 - 9 = -14
    expect(result[0]).toBeCloseTo(-14, 4);
  });

  // ─── Dimensions across all unroll thresholds ────────────────────

  it("works with dims < 16 (unroll-4 path)", () => {
    const dims = 7;
    const aData = randomArray(dims);
    const bData = randomArray(dims);
    const expected = naiveDot(aData, bData);
    const result = dotProduct(
      [new Float32Array(aData)],
      [new Float32Array(bData)],
    );
    expect(result[0]).toBeCloseTo(expected, 2);
  });

  it("works with dims 16-63 (unroll-8 path)", () => {
    const dims = 33;
    const aData = randomArray(dims);
    const bData = randomArray(dims);
    const expected = naiveDot(aData, bData);
    const result = dotProduct(
      [new Float32Array(aData)],
      [new Float32Array(bData)],
    );
    expect(result[0]).toBeCloseTo(expected, 1);
  });

  it("works with dims >= 64 (unroll-16 path)", () => {
    const dims = 128;
    const aData = randomArray(dims);
    const bData = randomArray(dims);
    const expected = naiveDot(aData, bData);
    const result = dotProduct(
      [new Float32Array(aData)],
      [new Float32Array(bData)],
    );
    expect(result[0]).toBeCloseTo(expected, 0);
  });

  it("handles 768-dim vectors (embedding-size)", () => {
    const dims = 768;
    const aData = randomArray(dims);
    const bData = randomArray(dims);
    const expected = naiveDot(aData, bData);
    const result = dotProduct(
      [new Float32Array(aData)],
      [new Float32Array(bData)],
    );
    expect(result[0]).toBeCloseTo(expected, -1); // Float32 precision
  });

  // ─── Force unroll factor via options ──────────────────────────────

  it("respects explicit unroll option", () => {
    const dims = 768;
    const a = [randomF32(dims)];
    const b = [randomF32(dims)];
    const expected = naiveDot(Array.from(a[0]), Array.from(b[0]));

    for (const unroll of [4, 8, 16] as const) {
      const result = dotProduct(a, b, { unroll });
      expect(result[0]).toBeCloseTo(expected, -1);
    }
  });

  // ─── Large batch ──────────────────────────────────────────────────

  it("handles batch of 100 vector pairs", () => {
    const dims = 64;
    const count = 100;
    const aVecs = Array.from({ length: count }, () => randomF32(dims));
    const bVecs = Array.from({ length: count }, () => randomF32(dims));

    const results = dotProduct(aVecs, bVecs);
    expect(results.length).toBe(count);

    for (let i = 0; i < count; i++) {
      const expected = naiveDot(Array.from(aVecs[i]), Array.from(bVecs[i]));
      expect(results[i]).toBeCloseTo(expected, 0);
    }
  });

  // ─── TypedArray types ─────────────────────────────────────────────

  it("works with Float64Array", () => {
    const a = [new Float64Array([1.5, 2.5, 3.5, 4.5])];
    const b = [new Float64Array([2, 2, 2, 2])];
    const result = dotProduct(a, b);
    // 1.5*2 + 2.5*2 + 3.5*2 + 4.5*2 = 3+5+7+9 = 24
    expect(result[0]).toBeCloseTo(24, 10);
  });

  it("works with Int32Array", () => {
    const a = [new Int32Array([1, 2, 3, 4])];
    const b = [new Int32Array([5, 6, 7, 8])];
    const result = dotProduct(a, b);
    // 5 + 12 + 21 + 32 = 70
    expect(result[0]).toBe(70);
  });

  it("works with Uint8Array", () => {
    const a = [new Uint8Array([1, 2, 3, 4])];
    const b = [new Uint8Array([10, 20, 30, 40])];
    const result = dotProduct(a, b);
    // 10 + 40 + 90 + 160 = 300
    expect(result[0]).toBe(300);
  });

  it("works with number[] arrays", () => {
    const a = [[1, 2, 3, 4]];
    const b = [[4, 3, 2, 1]];
    const result = dotProduct(a, b);
    expect(result[0]).toBe(20);
  });

  // ─── Edge cases ───────────────────────────────────────────────────

  it("returns empty Float32Array for empty input", () => {
    const result = dotProduct([], []);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(0);
  });

  it("returns Float32Array", () => {
    const result = dotProduct(
      [new Float32Array([1, 2])],
      [new Float32Array([3, 4])],
    );
    expect(result).toBeInstanceOf(Float32Array);
  });

  // ─── Error handling ───────────────────────────────────────────────

  it("throws RangeError when vector counts differ", () => {
    expect(() =>
      dotProduct(
        [new Float32Array([1, 2]), new Float32Array([3, 4])],
        [new Float32Array([5, 6])],
      ),
    ).toThrow(RangeError);
  });
});
