import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearModelCache, inspectModelCache } from "./model-cache-management.js";
import { prefetchModel } from "./model-prefetch.js";

const MODEL_URL = "https://cdn.example.com/models/harrier";

describe("model cache management in Node.js", () => {
  let cacheDir = "";
  let originalFetch: typeof fetch;

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.join(os.tmpdir(), "defuss-embeddings-cache-mgmt-"));
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () => {
      return new Response(Uint8Array.from([1, 2, 3, 4]), {
        status: 200,
        headers: { "Content-Type": "application/octet-stream" },
      });
    }) as typeof fetch;
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await fs.rm(cacheDir, { recursive: true, force: true });
  });

  it("inspects and clears filesystem cached model files", async () => {
    await prefetchModel(MODEL_URL, { dtype: "q4", cacheDir });

    const inspection = await inspectModelCache(MODEL_URL, { dtype: "q4", cacheDir });
    expect(inspection.files.every((file) => file.locations.includes("filesystem"))).toBe(true);

    const cleared = await clearModelCache(MODEL_URL, { dtype: "q4", cacheDir });
    expect(cleared.files.every((file) => file.removedFrom.includes("filesystem"))).toBe(true);

    const reinspection = await inspectModelCache(MODEL_URL, { dtype: "q4", cacheDir });
    expect(reinspection.files.every((file) => file.locations.length === 0)).toBe(true);
  });
});
