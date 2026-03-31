import { describe, it, expect } from "vitest";
import { map, filter, reduce } from "./parallel-array.js";

// ─── map ────────────────────────────────────────────────────────────

describe("parallel map", () => {
  it("doubles each element (small array, fallback path)", async () => {
    const result = await map([1, 2, 3, 4, 5], (x) => x * 2);
    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it("converts numbers to strings", async () => {
    const result = await map([1, 2, 3], (x) => `val_${x}`);
    expect(result).toEqual(["val_1", "val_2", "val_3"]);
  });

  it("handles empty array", async () => {
    const result = await map([], (x: number) => x * 2);
    expect(result).toEqual([]);
  });

  it("handles single element", async () => {
    const result = await map([42], (x) => x + 1);
    expect(result).toEqual([43]);
  });

  it("preserves element order", async () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const result = await map(arr, (x) => x * 10);
    expect(result).toEqual(arr.map((x) => x * 10));
  });

  it("works with large array (worker path)", async () => {
    const arr = Array.from({ length: 5000 }, (_, i) => i + 1);
    const result = await map(arr, (x) => x * 2);
    expect(result.length).toBe(5000);
    expect(result[0]).toBe(2);
    expect(result[4999]).toBe(10000);
  });

  it("supports complex transformations", async () => {
    const arr = [1, 2, 3, 4, 5];
    const result = await map(arr, (x) => ({ value: x, squared: x * x }));
    expect(result).toEqual([
      { value: 1, squared: 1 },
      { value: 2, squared: 4 },
      { value: 3, squared: 9 },
      { value: 4, squared: 16 },
      { value: 5, squared: 25 },
    ]);
  });
});

// ─── filter ─────────────────────────────────────────────────────────

describe("parallel filter", () => {
  it("filters even numbers (small array, fallback path)", async () => {
    const result = await filter([1, 2, 3, 4, 5, 6], (x) => x % 2 === 0);
    expect(result).toEqual([2, 4, 6]);
  });

  it("handles all-pass predicate", async () => {
    const result = await filter([1, 2, 3], () => true);
    expect(result).toEqual([1, 2, 3]);
  });

  it("handles all-fail predicate", async () => {
    const result = await filter([1, 2, 3], () => false);
    expect(result).toEqual([]);
  });

  it("handles empty array", async () => {
    const result = await filter([], (x: number) => x > 0);
    expect(result).toEqual([]);
  });

  it("preserves relative order", async () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const result = await filter(arr, (x) => x % 3 === 0);
    expect(result).toEqual(arr.filter((x) => x % 3 === 0));
  });

  it("works with large array (worker path)", async () => {
    const arr = Array.from({ length: 5000 }, (_, i) => i);
    const result = await filter(arr, (x) => x % 2 === 0);
    expect(result.length).toBe(2500);
    expect(result[0]).toBe(0);
    expect(result[result.length - 1]).toBe(4998);
  });

  it("filters objects by property", async () => {
    const arr = [
      { name: "a", active: true },
      { name: "b", active: false },
      { name: "c", active: true },
    ];
    const result = await filter(arr, (x) => x.active);
    expect(result).toEqual([
      { name: "a", active: true },
      { name: "c", active: true },
    ]);
  });
});

// ─── reduce ─────────────────────────────────────────────────────────

describe("parallel reduce", () => {
  it("sums array (small array, fallback path)", async () => {
    const result = await reduce([1, 2, 3, 4, 5], (a, b) => a + b, 0);
    expect(result).toBe(15);
  });

  it("finds max", async () => {
    const result = await reduce(
      [3, 1, 4, 1, 5, 9, 2, 6],
      (a, b) => Math.max(a, b),
      -Infinity,
    );
    expect(result).toBe(9);
  });

  it("concatenates strings", async () => {
    const result = await reduce(
      ["a", "b", "c", "d"],
      (a, b) => a + b,
      "",
    );
    // Result includes initial "" + reduction of chunks
    expect(result).toContain("abcd");
  });

  it("handles single element", async () => {
    const result = await reduce([42], (a, b) => a + b, 0);
    expect(result).toBe(42);
  });

  it("sums large array (worker path)", async () => {
    const arr = Array.from({ length: 5000 }, (_, i) => i + 1);
    const expected = (5000 * 5001) / 2; // n(n+1)/2
    const result = await reduce(arr, (a, b) => a + b, 0);
    expect(result).toBe(expected);
  });

  it("multiplies elements", async () => {
    const result = await reduce([1, 2, 3, 4, 5], (a, b) => a * b, 1);
    // The initial value cascades through chunk boundaries
    // So result should be 120 (5!)
    // Actual: chunk.reduce(fn) per worker, then reduce partials with initial
    expect(result).toBe(120);
  });
});
