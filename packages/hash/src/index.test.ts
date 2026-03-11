import { describe, expect, it } from "vitest";
import {
  contentHash,
  createContentHasher,
} from "./index";
import { createFixture } from "./test-fixture";

describe("contentHash (pure TS, JIT-optimized)", () => {
  it("returns a 32-char hex string", () => {
    const h = contentHash({ a: 1 });
    expect(h).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is stable across object key order", () => {
    const left = {
      b: 2,
      a: 1,
      nested: {
        z: true,
        y: [1, 2, { c: "x", d: "y" }],
      },
    };

    const right = {
      nested: {
        y: [1, 2, { d: "y", c: "x" }],
        z: true,
      },
      a: 1,
      b: 2,
    };

    expect(contentHash(left)).toBe(contentHash(right));
  });

  it("treats arrays as ordered", () => {
    expect(contentHash([1, 2, 3])).not.toBe(contentHash([3, 2, 1]));
  });

  it("is self-consistent (same value → same hash)", () => {
    const fixture = createFixture(16);
    expect(contentHash(fixture)).toBe(contentHash(fixture));
  });

  it("skips whole subtrees by path", () => {
    const base = { a: { b: { c: 1, d: 2 } }, q: 1 };
    const mutated = { a: { b: { c: 99, d: 100 } }, q: 1 };

    expect(contentHash(base)).not.toBe(contentHash(mutated));
    expect(contentHash(base, ["a.b"])).toBe(contentHash(mutated, ["a.b"]));
  });

  it("skips direct children with trailing wildcard", () => {
    const base = { a: { b: { c: 1, d: 2 } } };
    const mutated = { a: { b: { c: 9, d: 8 } } };

    expect(contentHash(base, ["a.b.*"])).toBe(contentHash(mutated, ["a.b.*"]));
  });

  it("supports root-array skip paths", () => {
    const base = createFixture(8);
    const mutated = structuredClone(base) as any[];
    mutated[0].distance = 9999;
    mutated[0].tsz[0].d = "2099-01-01";

    expect(contentHash(base)).not.toBe(contentHash(mutated));
    expect(contentHash(base, ["[*].distance", "[*].tsz"])).toBe(
      contentHash(mutated, ["[*].distance", "[*].tsz"]),
    );
  });

  it("reuses compiled hasher with skip", () => {
    const skip = ["[*].distance", "[*].tsz", "[*].nteStart", "[*].nteEnde"];
    const fixture = createFixture(16);

    const hasher = createContentHasher(skip);
    expect(hasher.hash(fixture)).toBe(contentHash(fixture, skip));
  });

  it("produces different hashes for different values", () => {
    const hashes = new Set([
      contentHash(null),
      contentHash(true),
      contentHash(false),
      contentHash(0),
      contentHash(1),
      contentHash(""),
      contentHash("a"),
      contentHash([]),
      contentHash({}),
      contentHash([1]),
      contentHash({ a: 1 }),
    ]);
    expect(hashes.size).toBe(11);
  });

  it("no init() needed — works immediately", () => {
    expect(() => contentHash({ test: true })).not.toThrow();
  });
});
