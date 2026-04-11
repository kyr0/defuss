import { describe, expect, it } from "vitest";
import { DefussEmbeddingClient } from "./client.js";
import { buildTurboQuantIndex, scoreTurboQuantIndex } from "./turboquant.js";
import { createMockTransformersModule } from "./test-utils.js";
import { normalizeVector, searchTopK, searchTopKMulticore } from "./vector-search.js";

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

  it("runs multicore exact search in chromium", async () => {
    const haystack = Array.from({ length: 192 }, (_, index) =>
      normalizeVector(
        Float32Array.of(
          1,
          index / 192,
          ((index * 5) % 23) / 96,
          ((index * 13) % 19) / 192,
        ),
      ),
    );
    const needle = normalizeVector(Float32Array.of(1, 0.2, 0.05, 0.01));

    const singleThread = searchTopK(haystack, needle, 6);
    const multicore = await searchTopKMulticore(haystack, needle, 6, {
      cores: 4,
      threshold: 24,
    });

    expect(multicore).toEqual(singleThread);
  });
});
