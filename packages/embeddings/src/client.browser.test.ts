import { describe, expect, it } from "vitest";
import { DefussEmbeddingClient } from "./client.js";
import { buildTurboQuantIndex, scoreTurboQuantIndex } from "./turboquant.js";
import { createMockTransformersModule } from "./test-utils.js";
import { normalizeVector } from "./vector-search.js";

describe("browser compatibility", () => {
  it("embeds in chromium with an injected pipeline", async () => {
    const client = new DefussEmbeddingClient({
      moduleFactory: async () => createMockTransformersModule(12),
      device: "wasm",
    });

    const vectors = await client.embed(["browser", "runtime"]);

    expect(vectors).toHaveLength(2);
    expect(vectors[0]).toHaveLength(12);
  });

  it("runs turboquant search in chromium", () => {
    const corpus = [
      normalizeVector(Float32Array.of(1, 0, 0, 0, 0, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 1, 0, 0, 0, 0, 0, 0)),
      normalizeVector(Float32Array.of(0.9, 0.1, 0, 0, 0, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 0, 1, 0, 0, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 0, 0, 1, 0, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 0, 0, 0, 1, 0, 0, 0)),
      normalizeVector(Float32Array.of(0, 0, 0, 0, 0, 1, 0, 0)),
      normalizeVector(Float32Array.of(0, 0, 0, 0, 0, 0, 1, 0)),
    ];

    const index = buildTurboQuantIndex(corpus, { seed: 9 });
    const scores = scoreTurboQuantIndex(index, corpus[0]!);

    expect(scores[0]!).toBeGreaterThan(scores[1]!);
  });
});
