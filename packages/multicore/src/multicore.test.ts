import { describe, it, expect } from "vitest";
import { multicore, getPoolSize } from "./multicore.js";

// ─── multicore HOF ──────────────────────────────────────────────────

describe("multicore", () => {
  // ─── Main-thread fallback path (small arrays < threshold) ───────

  describe("main-thread fallback", () => {
    it("executes on main thread for small arrays", async () => {
      const sum = multicore(
        (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
        { threshold: 1024 },
      );

      // 5 items < 1024 threshold → main-thread execution
      const result = await sum([1, 2, 3, 4, 5]);
      // Fallback wraps single result in array
      expect(result).toEqual([15]);
    });

    it("returns ParallelResult that is both PromiseLike and AsyncIterable", async () => {
      const identity = multicore(
        (x: number) => x * 2,
        { threshold: 1024 },
      );

      // Small input → fallback
      const result = identity(42);

      // PromiseLike
      const awaited = await result;
      expect(awaited).toEqual([84]);

      // AsyncIterable
      const collected: number[] = [];
      for await (const val of identity(42)) {
        collected.push(val);
      }
      expect(collected).toEqual([84]);
    });

    it("handles errors in fallback path", async () => {
      const failing = multicore(
        (_input: number[]) => { throw new Error("intentional"); },
        { threshold: 1024 },
      );

      await expect(failing([1, 2, 3])).rejects.toThrow("intentional");
    });

    it("applies reduce in fallback path", async () => {
      const sum = multicore(
        (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
        { threshold: 1024, reduce: (a: number, b: number) => a + b },
      );

      // Fallback with reduce → single value (not array)
      const result = await sum([1, 2, 3, 4, 5]);
      expect(result).toBe(15);
    });

    it("uses custom threshold", async () => {
      const fn = multicore(
        (chunk: number[]) => chunk.length,
        { threshold: 10 },
      );

      // 5 items < 10 → fallback
      const r = await fn([1, 2, 3, 4, 5]);
      expect(r).toEqual([5]);
    });
  });

  // ─── Worker path (large arrays) ──────────────────────────────────

  describe("worker execution", () => {
    it("distributes large array across workers and collects results", async () => {
      const chunkSum = multicore(
        (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
        { cores: 4, threshold: 10 },
      );

      // 100 items > 10 threshold → worker path
      const arr = Array.from({ length: 100 }, (_, i) => i + 1);
      const results = await chunkSum(arr);

      // Should get 4 partial sums
      expect(results.length).toBe(4);

      // Total should be 1+2+...+100 = 5050
      const total = (results as number[]).reduce((a, b) => a + b, 0);
      expect(total).toBe(5050);
    });

    it("reduce option collapses partial results", async () => {
      const totalSum = multicore(
        (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
        { cores: 4, threshold: 10, reduce: (a: number, b: number) => a + b },
      );

      const arr = Array.from({ length: 100 }, (_, i) => i + 1);
      const result = await totalSum(arr);
      expect(result).toBe(5050);
    });

    it("handles per-call cores override", async () => {
      const chunkLen = multicore(
        (chunk: number[]) => chunk.length,
        { cores: 8, threshold: 10 },
      );

      const arr = Array.from({ length: 100 }, (_, i) => i);
      // Override to 2 cores
      const results = await chunkLen(arr, { cores: 2 });
      expect(results.length).toBe(2);
      expect((results as number[]).reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("broadcasts scalar args to all workers", async () => {
      const scale = multicore(
        (chunk: number[], multiplier: number) =>
          chunk.map((x) => x * multiplier),
        { cores: 2, threshold: 10 },
      );

      const arr = Array.from({ length: 20 }, (_, i) => i + 1);
      const results = await scale(arr, 3);

      // Flatten all chunks
      const flat = (results as number[][]).flat();
      expect(flat.length).toBe(20);

      // Every element should be original * 3
      for (let i = 0; i < 20; i++) {
        expect(flat[i]).toBe((i + 1) * 3);
      }
    });

    it("streams results via AsyncIterable", async () => {
      const chunkSum = multicore(
        (chunk: number[]) => chunk.reduce((a, b) => a + b, 0),
        { cores: 4, threshold: 10 },
      );

      const arr = Array.from({ length: 100 }, (_, i) => i + 1);
      const collected: number[] = [];

      for await (const partial of chunkSum(arr)) {
        collected.push(partial as number);
      }

      expect(collected.length).toBe(4);
      expect(collected.reduce((a, b) => a + b, 0)).toBe(5050);
    });

    it("supports AbortController cancellation", async () => {
      const slowFn = multicore(
        (chunk: number[]) => {
          // Simulate slow work
          let sum = 0;
          for (let i = 0; i < 1e7; i++) sum += chunk[0] || 0;
          return sum;
        },
        { cores: 2, threshold: 10 },
      );

      const controller = new AbortController();
      const arr = Array.from({ length: 20 }, () => 1);

      // Abort immediately
      controller.abort();

      await expect(
        slowFn(arr, { signal: controller.signal }),
      ).rejects.toThrow();
    });
  });

  // ─── TypedArray handling ──────────────────────────────────────────

  describe("TypedArray support", () => {
    it("splits TypedArray using subarray (zero-copy)", async () => {
      const chunkLen = multicore(
        (chunk: Float32Array) => chunk.length,
        { cores: 2, threshold: 10 },
      );

      const arr = new Float32Array(20);
      const results = await chunkLen(arr);
      expect(results.length).toBe(2);
      expect((results as number[]).reduce((a, b) => a + b, 0)).toBe(20);
    });
  });
});

// ─── getPoolSize ────────────────────────────────────────────────────

describe("getPoolSize", () => {
  it("returns a positive integer", () => {
    const size = getPoolSize();
    expect(size).toBeGreaterThan(0);
    expect(Number.isInteger(size)).toBe(true);
  });
});
