import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_ID } from "./model-source.js";
import { DefussEmbeddingServer } from "./server.js";
import { createMockFeatureExtractor, createMockTransformersModule } from "./test-utils.js";

describe("DefussEmbeddingServer", () => {
  it("defaults to the Harrier ONNX model id", async () => {
    const server = new DefussEmbeddingServer({
      moduleFactory: async () => createMockTransformersModule(24),
    });

    expect(server.model).toBe(DEFAULT_MODEL_ID);

    const vector = await server.embedOne("server-side");
    expect(vector).toHaveLength(24);
  });

  it("uses a stable filesystem cache dir by default in Node.js", async () => {
    const observedEnv: Record<string, unknown> = {};
    const server = new DefussEmbeddingServer({
      warmCacheOnLoad: false,
      moduleFactory: async () => ({
        env: observedEnv,
        pipeline: async () => createMockFeatureExtractor(8),
      }),
    });

    await server.embedOne("server-cache");

    expect(typeof observedEnv.cacheDir).toBe("string");
    expect(String(observedEnv.cacheDir)).toContain("defuss-embeddings");
  });
});
