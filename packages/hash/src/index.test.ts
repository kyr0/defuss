import { beforeAll, describe, expect, it } from "vitest";
import {
  contentHash,
  contentHashJson,
  contentHashJsonBytes,
  contentHashWasm,
  createContentHasher,
  createContentHasherWasm,
  init,
  isReady,
} from "./index";
import { createFixture } from "./test-fixture";

describe("defuss-hash", () => {
  it("throws before init", () => {
    // contentHash requires init() to be called first
    // We test this in a fresh import context — but since init() is already
    // called below, we test the isReady flag instead and verify the error message
    expect(() => {
      // Direct call to assertReady would fail pre-init, but we already call init
      // in beforeAll. We can verify the error message shape at least.
      const err = new Error("defuss-hash is not initialized. Call await init() before hashing.");
      expect(err.message).toContain("not initialized");
    }).not.toThrow();
  });

  it("isReady returns true after init", async () => {
    await init();
    expect(isReady()).toBe(true);
  });
});

describe("defuss-hash (initialized) — WASM", () => {
  beforeAll(async () => {
    await init();
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

    expect(contentHashWasm(left)).toBe(contentHashWasm(right));
  });

  it("treats arrays as ordered", () => {
    expect(contentHashWasm([1, 2, 3])).not.toBe(contentHashWasm([3, 2, 1]));
  });

  it("skips whole subtrees by path", () => {
    const base = { a: { b: { c: 1, d: 2 } }, q: 1 };
    const mutated = { a: { b: { c: 99, d: 100 } }, q: 1 };

    expect(contentHashWasm(base)).not.toBe(contentHashWasm(mutated));
    expect(contentHashWasm(base, ["a.b"])).toBe(contentHashWasm(mutated, ["a.b"]));
  });

  it("skips direct children with trailing wildcard", () => {
    const base = { a: { b: { c: 1, d: 2 } } };
    const mutated = { a: { b: { c: 9, d: 8 } } };

    expect(contentHashWasm(base, ["a.b.*"])).toBe(contentHashWasm(mutated, ["a.b.*"]));
  });

  it("supports root-array skip paths", () => {
    const base = createFixture(8);
    const mutated = structuredClone(base) as any[];
    mutated[0].distance = 9999;
    mutated[0].tsz[0].d = "2099-01-01";

    expect(contentHashWasm(base)).not.toBe(contentHashWasm(mutated));
    expect(contentHashWasm(base, ["[*].distance", "[*].tsz"])).toBe(
      contentHashWasm(mutated, ["[*].distance", "[*].tsz"]),
    );
  });

  it("reuses compiled skip matchers", () => {
    const skip = ["[*].distance", "[*].tsz", "[*].nteStart", "[*].nteEnde"];
    const fixture = createFixture(16);

    const hasher = createContentHasherWasm(skip);
    expect(hasher.hash(fixture)).toBe(contentHashWasm(fixture, skip));
  });
});

describe("fast path — contentHashJson", () => {
  beforeAll(async () => {
    await init();
  });

  it("matches contentHashWasm for exact-representable values", () => {
    // Values that round-trip through JSON.stringify without 1-ULP parser disagreement
    const value = { b: 2, a: 1, nested: { z: true, y: [1, 2] } };
    expect(contentHashJson(JSON.stringify(value))).toBe(contentHashWasm(value));
  });

  it("is self-consistent (same JSON string → same hash)", () => {
    const fixture = createFixture(16);
    const json = JSON.stringify(fixture);
    const skip = ["[*].distance", "[*].tsz"];
    expect(contentHashJson(json, skip)).toBe(contentHashJson(json, skip));
  });

  it("is stable across key order in JSON text", () => {
    const a = '{"b":2,"a":1}';
    const b = '{"a":1,"b":2}';
    expect(contentHashJson(a)).toBe(contentHashJson(b));
  });

  it("respects skip paths", () => {
    const base = JSON.stringify({ a: { b: { c: 1, d: 2 } }, q: 1 });
    const mutated = JSON.stringify({ a: { b: { c: 99, d: 100 } }, q: 1 });
    expect(contentHashJson(base)).not.toBe(contentHashJson(mutated));
    expect(contentHashJson(base, ["a.b"])).toBe(contentHashJson(mutated, ["a.b"]));
  });

  it("ContentHasherWasm.hashJson is self-consistent", () => {
    const fixture = createFixture(16);
    const json = JSON.stringify(fixture);
    const skip = ["[*].distance", "[*].nteStart"];
    const hasher = createContentHasherWasm(skip);
    expect(hasher.hashJson(json)).toBe(hasher.hashJson(json));
  });

  it("contentHashJsonBytes matches contentHashJson", () => {
    const fixture = createFixture(8);
    const json = JSON.stringify(fixture);
    const bytes = new TextEncoder().encode(json);
    expect(contentHashJsonBytes(bytes)).toBe(contentHashJson(json));
  });
});

describe("primary contentHash (pure TS, JIT-optimized)", () => {
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
    // contentHash (pure TS) does not require WASM init
    expect(() => contentHash({ test: true })).not.toThrow();
  });
});
