import { describe, it, expect, vi } from "vitest";
import { partitionArgs, shouldFallback, detectTransferables, getCoreCount } from "./partition.js";

// ─── partitionArgs ──────────────────────────────────────────────────

describe("partitionArgs", () => {
  it("splits a plain Array evenly across cores", () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const result = partitionArgs([arr], 4);
    expect(result.length).toBe(4);
    expect(result[0]).toEqual([[1, 2]]);
    expect(result[1]).toEqual([[3, 4]]);
    expect(result[2]).toEqual([[5, 6]]);
    expect(result[3]).toEqual([[7, 8]]);
  });

  it("handles uneven splits (extra elements go to first chunks)", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = partitionArgs([arr], 3);
    // 5/3 = 1 base + 2 remainder → first 2 get 2 items, last gets 1
    expect(result[0]).toEqual([[1, 2]]);
    expect(result[1]).toEqual([[3, 4]]);
    expect(result[2]).toEqual([[5]]);
  });

  it("splits TypedArray using subarray (zero-copy)", () => {
    const arr = new Float32Array([10, 20, 30, 40]);
    const result = partitionArgs([arr], 2);
    expect(result.length).toBe(2);
    // Check it's a Float32Array (subarray view)
    expect(result[0][0]).toBeInstanceOf(Float32Array);
    expect(result[1][0]).toBeInstanceOf(Float32Array);
    expect(Array.from(result[0][0] as Float32Array)).toEqual([10, 20]);
    expect(Array.from(result[1][0] as Float32Array)).toEqual([30, 40]);
    // Verify they share the same underlying buffer (zero-copy)
    expect((result[0][0] as Float32Array).buffer).toBe(arr.buffer);
    expect((result[1][0] as Float32Array).buffer).toBe(arr.buffer);
  });

  it("broadcasts scalar args to all workers", () => {
    const arr = [1, 2, 3, 4];
    const scalar = 42;
    const result = partitionArgs([arr, scalar], 2);
    expect(result[0]).toEqual([[1, 2], 42]);
    expect(result[1]).toEqual([[3, 4], 42]);
  });

  it("broadcasts object args to all workers", () => {
    const arr = [1, 2, 3, 4];
    const opts = { mode: "fast" };
    const result = partitionArgs([arr, opts], 2);
    expect(result[0][1]).toBe(opts); // same reference
    expect(result[1][1]).toBe(opts);
  });

  it("handles multiple array args (each split independently)", () => {
    const a = [1, 2, 3, 4];
    const b = [10, 20, 30, 40];
    const result = partitionArgs([a, b], 2);
    expect(result[0]).toEqual([[1, 2], [10, 20]]);
    expect(result[1]).toEqual([[3, 4], [30, 40]]);
  });

  it("handles single core (no splitting)", () => {
    const arr = [1, 2, 3];
    const result = partitionArgs([arr], 1);
    expect(result.length).toBe(1);
    expect(result[0]).toEqual([[1, 2, 3]]);
  });

  it("handles empty array", () => {
    const arr: number[] = [];
    const result = partitionArgs([arr], 4);
    expect(result.length).toBe(4);
    // Each worker gets empty chunk
    for (const workerArgs of result) {
      expect((workerArgs[0] as number[]).length).toBe(0);
    }
  });

  it("handles no args", () => {
    const result = partitionArgs([], 4);
    expect(result.length).toBe(4);
    // Each worker gets empty arg list
    for (const workerArgs of result) {
      expect(workerArgs.length).toBe(0);
    }
  });

  it("handles mixed Array + TypedArray + scalar", () => {
    const plainArr = [1, 2, 3, 4];
    const typedArr = new Float64Array([10, 20, 30, 40]);
    const scalar = "hello";
    const result = partitionArgs([plainArr, typedArr, scalar], 2);

    expect(result.length).toBe(2);
    // Plain array split
    expect(result[0][0]).toEqual([1, 2]);
    expect(result[1][0]).toEqual([3, 4]);
    // TypedArray split
    expect(Array.from(result[0][1] as Float64Array)).toEqual([10, 20]);
    expect(Array.from(result[1][1] as Float64Array)).toEqual([30, 40]);
    // Scalar broadcast
    expect(result[0][2]).toBe("hello");
    expect(result[1][2]).toBe("hello");
  });
});

// ─── shouldFallback ─────────────────────────────────────────────────

describe("shouldFallback", () => {
  it("returns true when largest array < threshold", () => {
    expect(shouldFallback([[1, 2, 3]], 1024)).toBe(true);
  });

  it("returns false when largest array >= threshold", () => {
    const big = new Array(2000).fill(0);
    expect(shouldFallback([big], 1024)).toBe(false);
  });

  it("checks all args for largest array", () => {
    const small = [1, 2, 3];
    const big = new Array(5000).fill(0);
    expect(shouldFallback([small, 42, big], 1024)).toBe(false);
  });

  it("checks TypedArray length too", () => {
    const typed = new Float32Array(2000);
    expect(shouldFallback([typed], 1024)).toBe(false);
  });

  it("returns true when args have no arrays at all", () => {
    expect(shouldFallback([42, "hello", { x: 1 }], 1024)).toBe(true);
  });

  it("returns true for empty args", () => {
    expect(shouldFallback([], 1024)).toBe(true);
  });

  it("returns true when threshold is very large", () => {
    const arr = new Array(1000).fill(0);
    expect(shouldFallback([arr], 10000)).toBe(true);
  });

  it("returns false when threshold is 0", () => {
    expect(shouldFallback([[1]], 0)).toBe(false);
  });
});

// ─── detectTransferables ────────────────────────────────────────────

describe("detectTransferables", () => {
  it("detects ArrayBuffer references from TypedArray args", () => {
    const f32 = new Float32Array(10);
    const result = detectTransferables([f32]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(f32.buffer);
  });

  it("detects plain ArrayBuffer args", () => {
    const buf = new ArrayBuffer(64);
    const result = detectTransferables([buf]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(buf);
  });

  it("detects multiple TypedArrays", () => {
    const f32 = new Float32Array(10);
    const i32 = new Int32Array(20);
    const result = detectTransferables([f32, i32]);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(f32.buffer);
    expect(result[1]).toBe(i32.buffer);
  });

  it("ignores non-array args", () => {
    const result = detectTransferables([42, "hello", { x: 1 }, null, undefined]);
    expect(result.length).toBe(0);
  });

  it("handles mixed args", () => {
    const f32 = new Float32Array(5);
    const result = detectTransferables(["hello", f32, 42]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(f32.buffer);
  });

  it("returns empty for no args", () => {
    expect(detectTransferables([]).length).toBe(0);
  });

  it("ignores DataView (not a TypedArray for our purposes)", () => {
    const buf = new ArrayBuffer(16);
    const dv = new DataView(buf);
    const result = detectTransferables([dv]);
    // DataView is ArrayBuffer.isView but we exclude it via isTypedArray
    expect(result.length).toBe(0);
  });

  it("skips TypedArray subarrays (shared parent buffer cannot be transferred)", () => {
    const parent = new Float32Array(100);
    const sub = parent.subarray(10, 50);
    const result = detectTransferables([sub]);
    expect(result.length).toBe(0);
  });

  it("includes standalone TypedArray but skips subarray in same call", () => {
    const standalone = new Float32Array(16);
    const parent = new Int32Array(100);
    const sub = parent.subarray(5, 20);
    const result = detectTransferables([standalone, sub]);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(standalone.buffer);
  });
});

// ─── getCoreCount ───────────────────────────────────────────────────

describe("getCoreCount", () => {
  it("returns a positive integer", () => {
    const cores = getCoreCount();
    expect(cores).toBeGreaterThan(0);
    expect(Number.isInteger(cores)).toBe(true);
  });

  it("returns at least 1 core", () => {
    expect(getCoreCount()).toBeGreaterThanOrEqual(1);
  });
});
