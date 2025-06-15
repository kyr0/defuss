import { describe, it, expect, beforeAll } from "vitest";
import init, {
  vector_add,
  vector_multiply,
  vector_subtract,
  vector_scale,
  vector_dot_product,
  vector_normalize,
  vector_magnitude,
} from "../pkg/defuss_fastmath.js";

describe("Vector Operations", () => {
  beforeAll(async () => {
    await init();
  });

  it("should add vectors correctly", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([4, 5, 6]);
    const result = new Float32Array(3);

    vector_add(a, b, result);

    expect(Array.from(result)).toEqual([5, 7, 9]);
  });

  it("should multiply vectors element-wise", () => {
    const a = new Float32Array([2, 3, 4]);
    const b = new Float32Array([5, 6, 7]);
    const result = new Float32Array(3);

    vector_multiply(a, b, result);

    expect(Array.from(result)).toEqual([10, 18, 28]);
  });

  it("should subtract vectors correctly", () => {
    const a = new Float32Array([10, 8, 6]);
    const b = new Float32Array([3, 2, 1]);
    const result = new Float32Array(3);

    vector_subtract(a, b, result);

    expect(Array.from(result)).toEqual([7, 6, 5]);
  });

  it("should scale vectors by scalar", () => {
    const a = new Float32Array([1, 2, 3]);
    const result = new Float32Array(3);

    vector_scale(a, 2.5, result);

    expect(Array.from(result)).toEqual([2.5, 5, 7.5]);
  });

  it("should calculate dot product", () => {
    const a = new Float32Array([1, 2, 3]);
    const b = new Float32Array([4, 5, 6]);

    const dotProduct = vector_dot_product(a, b);

    expect(dotProduct).toBe(32); // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
  });

  it("should calculate vector magnitude", () => {
    const a = new Float32Array([3, 4, 0]);

    const magnitude = vector_magnitude(a);

    expect(magnitude).toBe(5); // sqrt(3^2 + 4^2 + 0^2) = sqrt(9 + 16) = 5
  });

  it("should normalize vectors", () => {
    const a = new Float32Array([3, 4, 0]);
    const result = new Float32Array(3);

    vector_normalize(a, result);

    // Expected: [3/5, 4/5, 0] = [0.6, 0.8, 0]
    expect(result[0]).toBeCloseTo(0.6, 5);
    expect(result[1]).toBeCloseTo(0.8, 5);
    expect(result[2]).toBeCloseTo(0, 5);
  });

  it("should handle zero vector normalization", () => {
    const a = new Float32Array([0, 0, 0]);
    const result = new Float32Array(3);

    vector_normalize(a, result);

    expect(Array.from(result)).toEqual([0, 0, 0]);
  });
});
