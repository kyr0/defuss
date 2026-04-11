import { beforeAll, describe, expect, it } from "vitest";
import {
  corpus,
  LIVE_MODEL_ID,
  LIVE_TIMEOUT_MS,
  scenarios,
} from "./live-retrieval.fixtures.js";
import { createEmbeddingClient } from "./client.js";
import { buildTurboQuantIndex, searchTurboQuantIndexRerank } from "./turboquant.js";
import { attachRecords, searchTopK } from "./vector-search.js";

describe("live Harrier retrieval in browsers", () => {
  const embedder = createEmbeddingClient({
    model: LIVE_MODEL_ID,
    device: "wasm",
    warmCacheOnLoad: false,
  });

  let documentVectors: Float32Array[] = [];
  let turboIndex: ReturnType<typeof buildTurboQuantIndex> | null = null;

  beforeAll(async () => {
    await embedder.loadModel(LIVE_MODEL_ID);
    documentVectors = await embedder.embedDocuments(corpus.map((doc) => doc.text));
    turboIndex = buildTurboQuantIndex(documentVectors, { seed: 1337 });
  }, LIVE_TIMEOUT_MS);

  it("builds a corpus large enough for top-100 retrieval", () => {
    expect(corpus.length).toBeGreaterThanOrEqual(100);
  });

  it(
    `retrieves ${scenarios[0]!.expectedId} via exact search and TurboQuant reranking in chromium`,
    async () => {
      const scenario = scenarios[0]!;
      const queryVector = await embedder.embedQuery(scenario.query);
      const exactTopK = attachRecords(searchTopK(documentVectors, queryVector, 10), corpus);
      const reranked = searchTurboQuantIndexRerank(
        turboIndex!,
        documentVectors,
        queryVector,
        100,
        10,
      );
      const rerankedTopK = attachRecords(reranked.rerankedTopK, corpus);

      expect(reranked.approximateTopK).toHaveLength(100);
      expect(rerankedTopK).toHaveLength(10);
      expect(exactTopK[0]?.record?.id).toBe(scenario.expectedId);
      expect(rerankedTopK[0]?.record?.id).toBe(scenario.expectedId);
    },
    LIVE_TIMEOUT_MS,
  );
});