import { describe, expect, it } from "vitest";
import {
  dotProduct,
  normalizeVector,
  searchTopK,
  searchTopKMulticore,
} from "./vector-search.js";

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

  it("matches single-thread results when multicore exact search is enabled", async () => {
    const haystack = Array.from({ length: 256 }, (_, index) =>
      normalizeVector(
        Float32Array.of(
          1,
          index / 256,
          ((index * 7) % 29) / 128,
          ((index * 11) % 17) / 256,
        ),
      ),
    );
    const needle = normalizeVector(Float32Array.of(1, 0.18, 0.04, 0.01));

    const singleThread = searchTopK(haystack, needle, 8);
    const multicore = await searchTopKMulticore(haystack, needle, 8, {
      cores: 4,
      threshold: 32,
    });

    expect(multicore).toEqual(singleThread);
  });
});
