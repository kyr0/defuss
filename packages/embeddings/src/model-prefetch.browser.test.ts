import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearBrowserCacheApiForTests,
  clearBrowserPersistentCacheForTests,
} from "./model-cache.browser.js";
import { prefetchModel } from "./model-prefetch.js";

const MODEL_URL = "https://cdn.example.com/models/harrier";
const EXPECTED_FILE_COUNT = 5;

describe("prefetchModel in browsers", () => {
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    await clearBrowserCacheApiForTests();
    await clearBrowserPersistentCacheForTests();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await clearBrowserCacheApiForTests();
    await clearBrowserPersistentCacheForTests();
  });

  it("restores model files from defuss-db after the Cache API was cleared", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(Uint8Array.from([7, 8, 9, 10]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    });

    globalThis.fetch = fetchSpy as typeof fetch;

    await prefetchModel(MODEL_URL, { dtype: "q4" });
    expect(fetchSpy).toHaveBeenCalledTimes(EXPECTED_FILE_COUNT);

    await clearBrowserCacheApiForTests();
    fetchSpy.mockClear();

    await prefetchModel(MODEL_URL, { dtype: "q4" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});