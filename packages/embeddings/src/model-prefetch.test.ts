import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prefetchModel } from "./model-prefetch.js";

const MODEL_URL = "https://cdn.example.com/models/harrier";
const EXPECTED_FILE_COUNT = 5;

describe("prefetchModel in Node.js", () => {
  let cacheDir = "";
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "defuss-embeddings-prefetch-"));
    originalFetch = globalThis.fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it("reuses the filesystem cache instead of downloading files twice", async () => {
    const fetchSpy = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    });

    globalThis.fetch = fetchSpy as typeof fetch;

    await prefetchModel(MODEL_URL, { dtype: "q4", cacheDir });
    expect(fetchSpy).toHaveBeenCalledTimes(EXPECTED_FILE_COUNT);

    fetchSpy.mockClear();

    await prefetchModel(MODEL_URL, { dtype: "q4", cacheDir });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
