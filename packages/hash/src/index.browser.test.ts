import { beforeAll, describe, expect, it } from "vitest";
import { contentHash, createContentHasher, init, isReady } from "./index";
import { createFixture } from "./test-fixture";

beforeAll(async () => {
  await init();
});

describe("defuss-hash in browser", () => {
  it("initializes and hashes in chromium", () => {
    expect(isReady()).toBe(true);

    const left = { b: 2, a: 1, nested: { x: [1, 2, 3] } };
    const right = { nested: { x: [1, 2, 3] }, a: 1, b: 2 };

    expect(contentHash(left)).toBe(contentHash(right));
  });

  it("respects skip paths in browser", () => {
    const skip = ["[*].distance", "[*].tsz"];
    const base = createFixture(4);
    const mutated = structuredClone(base) as any[];
    mutated[0].distance = 5000;
    mutated[0].tsz[0].d = "2099-12-31";

    const hasher = createContentHasher(skip);
    expect(hasher.hash(base)).toBe(hasher.hash(mutated));
  });
});
