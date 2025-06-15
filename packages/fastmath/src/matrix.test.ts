import { describe, it, expect, beforeAll } from "vitest";
import init, {
  matrix_multiply,
  matrix_add,
  matrix_subtract,
  matrix_transpose,
  matrix_scale,
} from "../pkg/defuss_fastmath.js";

describe("Matrix Operations", () => {
  beforeAll(async () => {
    await init();
  });

  it("should multiply matrices correctly", () => {
    // 2x3 matrix A
    const a = new Float32Array([1, 2, 3, 4, 5, 6]);

    // 3x2 matrix B
    const b = new Float32Array([7, 8, 9, 10, 11, 12]);

    // Result should be 2x2 matrix
    const c = new Float32Array(4);

    matrix_multiply(a, b, c, 2, 3, 2);

    // Expected result:
    // [1*7 + 2*9 + 3*11, 1*8 + 2*10 + 3*12] = [58, 64]
    // [4*7 + 5*9 + 6*11, 4*8 + 5*10 + 6*12] = [139, 154]
    expect(Array.from(c)).toEqual([58, 64, 139, 154]);
  });

  it("should add matrices correctly", () => {
    const a = new Float32Array([1, 2, 3, 4]);
    const b = new Float32Array([5, 6, 7, 8]);
    const c = new Float32Array(4);

    matrix_add(a, b, c, 2, 2);

    expect(Array.from(c)).toEqual([6, 8, 10, 12]);
  });

  it("should subtract matrices correctly", () => {
    const a = new Float32Array([10, 9, 8, 7]);
    const b = new Float32Array([1, 2, 3, 4]);
    const c = new Float32Array(4);

    matrix_subtract(a, b, c, 2, 2);

    expect(Array.from(c)).toEqual([9, 7, 5, 3]);
  });

  it("should transpose matrices correctly", () => {
    // 2x3 matrix A
    const a = new Float32Array([1, 2, 3, 4, 5, 6]);

    // Result should be 3x2 matrix
    const b = new Float32Array(6);

    matrix_transpose(a, b, 2, 3);

    // Expected result (3x2):
    // [1, 4]
    // [2, 5]
    // [3, 6]
    // Row-major: [1, 4, 2, 5, 3, 6]
    expect(Array.from(b)).toEqual([1, 4, 2, 5, 3, 6]);
  });

  it("should scale matrices correctly", () => {
    const a = new Float32Array([1, 2, 3, 4]);
    const b = new Float32Array(4);

    matrix_scale(a, 2.5, b, 2, 2);

    expect(Array.from(b)).toEqual([2.5, 5, 7.5, 10]);
  });

  it("should handle identity matrix multiplication", () => {
    // 2x2 identity matrix
    const identity = new Float32Array([1, 0, 0, 1]);
    const a = new Float32Array([3, 4, 5, 6]);
    const result = new Float32Array(4);

    matrix_multiply(identity, a, result, 2, 2, 2);

    expect(Array.from(result)).toEqual([3, 4, 5, 6]);
  });

  it("should handle single element matrix operations", () => {
    const a = new Float32Array([5]);
    const b = new Float32Array([3]);
    const result = new Float32Array(1);

    matrix_multiply(a, b, result, 1, 1, 1);

    expect(Array.from(result)).toEqual([15]);
  });
});
