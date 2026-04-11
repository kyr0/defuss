import { performance } from "node:perf_hooks";
import { beforeAll, describe, expect, it } from "vitest";
import {
  corpus,
  LIVE_CACHE_DIR,
  LIVE_MODEL_ID,
  LIVE_TIMEOUT_MS,
} from "./live-retrieval.fixtures.js";
import { formatInstructionQuery } from "./prompts.js";
import { createEmbeddingServer } from "./server.js";
import {
  buildTurboQuantIndex,
  rerankSearchHits,
  searchTurboQuantIndex,
} from "./turboquant.js";
import { attachRecords, searchTopK } from "./vector-search.js";

interface LiveTimingSample {
  readonly label: string;
  readonly exactHit: boolean;
  readonly approximateHit: boolean;
  readonly exactRank: number;
  readonly rerankedRank: number;
  readonly rerankedHit: boolean;
  readonly queryEmbedMs: number;
  readonly exactMs: number;
  readonly approximateMs: number;
  readonly rerankMs: number;
  readonly totalApproximateMs: number;
  readonly endToEndApproximateMs: number;
}

interface LiveNeedleCase {
  readonly id: string;
  readonly query: string;
  readonly text: string;
}

interface RetrievalDoc {
  readonly id: string;
  readonly text: string;
}

const getFixtureDoc = (id: string): RetrievalDoc => {
  const doc = corpus.find((entry) => entry.id === id);
  if (!doc) {
    throw new Error(`Unknown retrieval fixture id: ${id}`);
  }
  return doc;
};

const round = (value: number): number => Number(value.toFixed(3));

const summarizeMetric = (values: readonly number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = sorted[Math.floor(sorted.length / 2)] ?? 0;

  return {
    min: round(sorted[0] ?? 0),
    median: round(middle),
    avg: round(average),
    max: round(sorted[sorted.length - 1] ?? 0),
  };
};

const measureSync = <T>(fn: () => T): { readonly result: T; readonly ms: number } => {
  const startedAt = performance.now();
  const result = fn();
  return { result, ms: performance.now() - startedAt };
};

const measureAsync = async <T>(
  fn: () => Promise<T>,
): Promise<{ readonly result: T; readonly ms: number }> => {
  const startedAt = performance.now();
  const result = await fn();
  return { result, ms: performance.now() - startedAt };
};

const LIVE_NEEDLE_CASES = [
  {
    id: "protein-guideline",
    query: "How much protein should a woman eat each day?",
    text: getFixtureDoc("protein-guideline").text,
  },
  {
    id: "summit-definition",
    query: "What does the word summit mean in English?",
    text: getFixtureDoc("summit-definition").text,
  },
  {
    id: "css-center-div",
    query: "How can I center a div with CSS flexbox?",
    text: getFixtureDoc("css-center-div").text,
  },
  {
    id: "python-virtualenv",
    query: "How do I create a Python virtual environment?",
    text: getFixtureDoc("python-virtualenv").text,
  },
] as const satisfies readonly LiveNeedleCase[];

const buildLiveHaystack = (needle: LiveNeedleCase, size = 512): RetrievalDoc[] => {
  if (size <= 1) {
    throw new Error("Live haystack size must exceed 1");
  }

  const distractorPool = corpus.filter((entry) => entry.id !== needle.id);
  if (distractorPool.length === 0) {
    throw new Error("Live haystack requires at least one distractor document");
  }

  const haystack: RetrievalDoc[] = [];
  for (let index = 0; index < size - 1; index++) {
    const base = distractorPool[index % distractorPool.length]!;

    haystack.push({
      id: `archive-${needle.id}-${index}`,
      text:
        `Library archive copy ${index}. ${base.text} This catalog entry is stored as part of a larger retrieval benchmark archive for search evaluation.`,
    });
  }

  haystack.splice(Math.floor(size / 2), 0, {
    id: needle.id,
    text: needle.text,
  });

  return haystack;
};

describe("live needle in haystack retrieval", () => {
  const embedder = createEmbeddingServer({
    model: LIVE_MODEL_ID,
    dtype: "fp32",
    cacheDir: LIVE_CACHE_DIR,
  });

  let benchmarkCases: Array<{
    readonly needle: (typeof LIVE_NEEDLE_CASES)[number];
    readonly haystack: RetrievalDoc[];
    readonly documentVectors: Float32Array[];
    readonly turboIndex: ReturnType<typeof buildTurboQuantIndex>;
  }> = [];

  beforeAll(async () => {
    await embedder.loadModel(LIVE_MODEL_ID);

    benchmarkCases = [];
    for (const needle of LIVE_NEEDLE_CASES) {
      const haystack = buildLiveHaystack(needle, 512);
      const documentVectors = await embedder.embedDocuments(haystack.map((doc) => doc.text));

      benchmarkCases.push({
        needle,
        haystack,
        documentVectors,
        turboIndex: buildTurboQuantIndex(documentVectors, { seed: 1337 }),
      });
    }
  }, LIVE_TIMEOUT_MS);

  it("builds a live haystack large enough to act like a retrieval benchmark", () => {
    expect(benchmarkCases).toHaveLength(LIVE_NEEDLE_CASES.length);
    expect(benchmarkCases.every((entry) => entry.haystack.length >= 512)).toBe(true);
  });

  it("formats live benchmark queries with the Harrier instruction template", () => {
    for (const needle of LIVE_NEEDLE_CASES) {
      const formatted = formatInstructionQuery(needle.query);

      expect(formatted.startsWith("Instruct: ")).toBe(true);
      expect(formatted.includes("\nQuery: ")).toBe(true);
    }
  });

  it(
    "retrieves live needles and reports end-to-end latency",
    async () => {
      const exactK = 100;
      const approximateK = 100;
      const rerankK = 10;
      const timings: LiveTimingSample[] = [];

      for (const benchmarkCase of benchmarkCases) {
        const { needle, haystack, documentVectors, turboIndex } = benchmarkCase;
        const formattedQuery = formatInstructionQuery(needle.query);
        expect(formattedQuery.startsWith("Instruct: ")).toBe(true);
        expect(formattedQuery.includes("\nQuery: ")).toBe(true);

        // Harrier retrieval queries must use the instructed query format.
        const { result: queryVector, ms: queryEmbedMs } = await measureAsync(() =>
          embedder.embedQuery(needle.query),
        );
        const { result: exactTopK, ms: exactMs } = measureSync(() =>
          attachRecords(searchTopK(documentVectors, queryVector, exactK), haystack),
        );
        const { result: approximateTopK, ms: approximateMs } = measureSync(() =>
          searchTurboQuantIndex(turboIndex, queryVector, approximateK),
        );
        const { result: rerankedTopK, ms: rerankMs } = measureSync(() =>
          attachRecords(
            rerankSearchHits(documentVectors, queryVector, approximateTopK, rerankK),
            haystack,
          ),
        );
        const exactRank = exactTopK.findIndex((hit) => hit.record?.id === needle.id) + 1;
        const rerankedRank = rerankedTopK.findIndex((hit) => hit.record?.id === needle.id) + 1;
        const exactHit = exactRank > 0;
        const approximateHit = approximateTopK.some((hit) => haystack[hit.index]?.id === needle.id);
        const rerankedHit = rerankedRank > 0;

        timings.push({
          label: needle.id,
          exactHit,
          approximateHit,
          exactRank,
          rerankedRank,
          rerankedHit,
          queryEmbedMs,
          exactMs,
          approximateMs,
          rerankMs,
          totalApproximateMs: approximateMs + rerankMs,
          endToEndApproximateMs: queryEmbedMs + approximateMs + rerankMs,
        });

        console.info(
          `[needle-haystack] live case ${needle.id} ${JSON.stringify({
            exactHit,
            exactRank,
            rerankedRank,
            approximateHit,
          })}`,
        );
      }

      const summary = {
        corpusSize: benchmarkCases[0]?.haystack.length ?? 0,
        scenarios: benchmarkCases.length,
        exactK,
        approximateK,
        rerankK,
        exactHitCount: timings.filter((entry) => entry.exactHit).length,
        approximateHitCount: timings.filter((entry) => entry.approximateHit).length,
        exactRank: summarizeMetric(timings.map((entry) => entry.exactRank)),
        rerankedRank: summarizeMetric(timings.map((entry) => entry.rerankedRank)),
        rerankedHitCount: timings.filter((entry) => entry.rerankedHit).length,
        queryEmbedMs: summarizeMetric(timings.map((entry) => entry.queryEmbedMs)),
        exactMs: summarizeMetric(timings.map((entry) => entry.exactMs)),
        approximateMs: summarizeMetric(timings.map((entry) => entry.approximateMs)),
        rerankMs: summarizeMetric(timings.map((entry) => entry.rerankMs)),
        totalApproximateMs: summarizeMetric(timings.map((entry) => entry.totalApproximateMs)),
        endToEndApproximateMs: summarizeMetric(
          timings.map((entry) => entry.endToEndApproximateMs),
        ),
      };

      console.info(
        `[needle-haystack] live Harrier benchmark\n${JSON.stringify({ summary, timings }, null, 2)}`,
      );

      expect(summary.queryEmbedMs.avg).toBeGreaterThan(0);
      expect(summary.exactMs.avg).toBeGreaterThan(0);
      expect(summary.approximateMs.avg).toBeGreaterThan(0);
      expect(summary.rerankMs.avg).toBeGreaterThan(0);
      expect(summary.totalApproximateMs.avg).toBeGreaterThan(0);
      expect(summary.endToEndApproximateMs.avg).toBeGreaterThan(0);
    },
    LIVE_TIMEOUT_MS,
  );
});