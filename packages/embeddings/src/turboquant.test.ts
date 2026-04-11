import { describe, expect, it } from "vitest";
import {
  buildTurboQuantIndex,
  scoreTurboQuantIndex,
  searchTurboQuantIndexRerank,
  selfCheckTurboQuant,
} from "./turboquant.js";
import { searchTopK } from "./vector-search.js";
import { normalizeVector } from "./vector-search.js";

const makeCorpus = (size: number, dims: number): Float32Array[] => {
  const corpus: Float32Array[] = [];
  for (let i = 0; i < size; i++) {
    const vector = new Float32Array(dims);
    vector[i % dims] = 1;
    vector[(i * 13) % dims] += 0.25;
    corpus.push(normalizeVector(vector));
  }
  return corpus;
};

describe("turboquant", () => {
  it("builds a compact index", () => {
    const corpus = makeCorpus(32, 128);
    const index = buildTurboQuantIndex(corpus, { seed: 1 });

    expect(index.size).toBe(32);
    expect(index.dims).toBe(128);
    expect(index.rotatedDims).toBe(128);
    expect(index.codes.byteLength).toBe(32 * 64);
  });

  it("pads Harrier-sized vectors to the next power of two", () => {
    const corpus = makeCorpus(8, 640);
    const index = buildTurboQuantIndex(corpus, { seed: 7 });

    expect(index.dims).toBe(640);
    expect(index.rotatedDims).toBe(1024);
    expect(index.codeBytes).toBe(512);
  });

  it("preserves ranking signal reasonably well", () => {
    const corpus = makeCorpus(128, 128);
    const query = corpus[7]!;
    const report = selfCheckTurboQuant(corpus, query, 10);

    expect(report.overlap).toBeGreaterThanOrEqual(0.6);
    expect(report.approxTopK[0]?.index).toBe(7);
  });

  it("scores without reconstructing dense vectors", () => {
    const corpus = makeCorpus(16, 128);
    const index = buildTurboQuantIndex(corpus, { seed: 42 });
    const scores = scoreTurboQuantIndex(index, corpus[0]!);

    expect(scores).toHaveLength(16);
    expect(scores[0]!).toBeGreaterThan(0.5);
  });

  it("searches top-100 and reranks down to top-10", () => {
    const corpus = makeCorpus(256, 128);
    const query = corpus[37]!;
    const index = buildTurboQuantIndex(corpus, { seed: 19 });

    const exactTopK = searchTopK(corpus, query, 10);
    const reranked = searchTurboQuantIndexRerank(index, corpus, query, 100, 10);

    expect(reranked.approximateTopK).toHaveLength(100);
    expect(reranked.rerankedTopK).toHaveLength(10);
    expect(reranked.rerankedTopK[0]?.index).toBe(exactTopK[0]?.index);
  });
});
