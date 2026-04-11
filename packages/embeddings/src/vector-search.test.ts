import { describe, expect, it } from "vitest";
import { dotProduct, normalizeVector, searchTopK } from "./vector-search.js";

describe("vector-search", () => {
  it("computes normalized dot products", () => {
    const a = normalizeVector(Float32Array.of(1, 2, 3, 4));
    const b = normalizeVector(Float32Array.of(1, 2, 3, 4));
    const c = normalizeVector(Float32Array.of(-1, -2, -3, -4));

    expect(dotProduct(a, b)).toBeCloseTo(1, 6);
    expect(dotProduct(a, c)).toBeCloseTo(-1, 6);
  });

  it("returns top-k in descending score order", () => {
    const haystack = [
      normalizeVector(Float32Array.of(1, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 1, 0, 0)),
      normalizeVector(Float32Array.of(0.9, 0.1, 0, 0)),
    ];
    const needle = normalizeVector(Float32Array.of(1, 0, 0, 0));

    const hits = searchTopK(haystack, needle, 2);

    expect(hits).toHaveLength(2);
    expect(hits[0]?.index).toBe(0);
    expect(hits[1]?.index).toBe(2);
    expect(hits[0]!.score).toBeGreaterThanOrEqual(hits[1]!.score);
  });
});
