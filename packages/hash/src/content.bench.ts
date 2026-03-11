import { createHash } from "node:crypto";
import { bench, describe } from "vitest";
import {
  contentHash,
  createContentHasher,
} from "./index";
import { createFixture } from "./test-fixture";

const sample = createFixture(256);
const skip = ["[*].distance", "[*].tsz", "[*].nteStart", "[*].nteEnde"];

const jsHasher = createContentHasher(skip);

/** Naive baseline: md5(JSON.stringify(data)) — no key-order stability, no skip. */
function naiveMd5Hash(value: unknown): string {
  return createHash("md5").update(JSON.stringify(value)).digest("hex");
}

/**
 * Stable-stringify with skip: sorts keys, filters skip paths, then md5.
 * This is the semantically equivalent JS-only baseline.
 */
function stableStringifyWithSkip(
  value: unknown,
  skipPaths: readonly string[] = [],
): string {
  const skipSet = new Set(skipPaths);

  function walk(val: unknown, path: string): unknown {
    if (val === null || typeof val !== "object") return val;

    if (Array.isArray(val)) {
      return val.map((item, i) => {
        const childPath = `${path}[${i}]`;
        // check both exact and wildcard
        const wildPath = `${path}[*]`;
        if (skipSet.has(childPath) || skipSet.has(wildPath)) return undefined;
        return walk(item, childPath);
      });
    }

    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(val).sort();
    for (const key of keys) {
      const childPath = path ? `${path}.${key}` : key;
      // check exact skip for child key under wildcard parent
      // e.g. "[*].distance" when path is "[0]" → childPath "[0].distance"
      const wildChildPath = path.replace(/\[\d+\]/g, "[*]") + `.${key}`;
      if (skipSet.has(childPath) || skipSet.has(wildChildPath)) continue;
      sorted[key] = walk((val as Record<string, unknown>)[key], childPath);
    }
    return sorted;
  }

  const cleaned = walk(value, "");
  return createHash("md5").update(JSON.stringify(cleaned)).digest("hex");
}

describe("baselines", () => {
  bench("naive md5(JSON.stringify()) — unstable, no skip", () => {
    naiveMd5Hash(sample);
  });

  bench("stable stringify + skip + md5 — JS-only equivalent", () => {
    stableStringifyWithSkip(sample, skip);
  });
});

describe("contentHash (pure TS, JIT-optimized)", () => {
  bench("contentHash (with skip)", () => {
    contentHash(sample, skip);
  });

  bench("contentHash (no skip)", () => {
    contentHash(sample);
  });

  bench("reused ContentHasher.hash (with skip)", () => {
    jsHasher.hash(sample);
  });
});
