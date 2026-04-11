import { describe, expect, it } from "vitest";
import { DefussEmbeddingClient } from "./client.js";
import { createMockTransformersModule } from "./test-utils.js";

describe("DefussEmbeddingClient", () => {
  it("loads a model from a URL base by configuring a synthetic cacheable model id", async () => {
    let observedModelId = "";
    const moduleEnv: Record<string, unknown> = {};

    const client = new DefussEmbeddingClient({
      moduleFactory: async () => ({
        env: moduleEnv,
        pipeline: async (_task, modelId) => {
          observedModelId = modelId;
          return async () => ({
            data: Float32Array.of(1, 0, 0, 0),
            dims: [1, 4],
            type: "float32",
          });
        },
      }),
    });

    await client.loadModel("https://cdn.example.com/models/harrier");

    expect(client.model).toBe("https://cdn.example.com/models/harrier");
    expect(observedModelId.startsWith("defuss-embeddings/")).toBe(true);
    expect(moduleEnv.remoteHost).toBe("https://cdn.example.com/");
    expect(moduleEnv.remotePathTemplate).toBe("models/harrier/");
  });

  it("formats retrieval queries with the Harrier instruction prompt", async () => {
    let observedInput = "";
    const client = new DefussEmbeddingClient({
      moduleFactory: async () => ({
        env: {},
        pipeline: async () => async (input: string | string[]) => {
          observedInput = Array.isArray(input) ? input[0] ?? "" : input;
          return {
            data: Float32Array.of(1, 0, 0, 0),
            dims: [1, 4],
            type: "float32",
          };
        },
      }),
    });

    await client.embedQuery("summit define");

    expect(observedInput).toBe(
      "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery: summit define",
    );
  });

  it("embeds one text with injected pipeline", async () => {
    const client = new DefussEmbeddingClient({
      moduleFactory: async () => createMockTransformersModule(32),
      dtype: "q4",
      device: "wasm",
    });

    const embedding = await client.embedOne("hello world");

    expect(embedding).toBeInstanceOf(Float32Array);
    expect(embedding).toHaveLength(32);
  });

  it("embeds a batch", async () => {
    const client = new DefussEmbeddingClient({
      moduleFactory: async () => createMockTransformersModule(16),
    });

    const embeddings = await client.embed(["a", "b", "c"]);

    expect(embeddings).toHaveLength(3);
    expect(embeddings[0]).toHaveLength(16);
    expect(embeddings[1]).not.toEqual(embeddings[0]);
  });
});
