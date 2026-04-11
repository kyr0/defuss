import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearModelCache, inspectModelCache } from "./model-cache-management.js";
import {
  clearBrowserCacheApiForTests,
  clearBrowserPersistentCacheForTests,
} from "./model-cache.browser.js";
import { prefetchModel } from "./model-prefetch.js";

const MODEL_URL = "https://cdn.example.com/models/harrier";

describe("model cache management in browsers", () => {
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    await clearBrowserCacheApiForTests();
    await clearBrowserPersistentCacheForTests();
    globalThis.fetch = vi.fn(async () => {
      return new Response(Uint8Array.from([7, 8, 9, 10]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    }) as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearBrowserCacheApiForTests();
    await clearBrowserPersistentCacheForTests();
  });

  it("inspects and clears browser cache entries from both layers", async () => {
    await prefetchModel(MODEL_URL, { dtype: "q4" });

    const inspection = await inspectModelCache(MODEL_URL, { dtype: "q4" });
    expect(inspection.files.every((file) => file.locations.includes("browser-cache"))).toBe(true);
    expect(inspection.files.every((file) => file.locations.includes("browser-db"))).toBe(true);

    const cleared = await clearModelCache(MODEL_URL, { dtype: "q4" });
    expect(cleared.files.every((file) => file.removedFrom.includes("browser-cache"))).toBe(true);
    expect(cleared.files.every((file) => file.removedFrom.includes("browser-db"))).toBe(true);

    const reinspection = await inspectModelCache(MODEL_URL, { dtype: "q4" });
    expect(reinspection.files.every((file) => file.locations.length === 0)).toBe(true);
  });
});