import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import {
  buildTurboQuantIndex,
  rerankSearchHits,
  searchTurboQuantIndex,
} from "./turboquant.js";
import { normalizeVector, searchTopK } from "./vector-search.js";

interface SyntheticNeedleCase {
  readonly label: string;
  readonly expectedIndex: number;
  readonly query: Float32Array;
}

interface TimingSample {
  readonly label: string;
  readonly exactMs: number;
  readonly approximateMs: number;
  readonly rerankMs: number;
  readonly totalApproximateMs: number;
  readonly exactDocsPerSecond: number;
  readonly approximateDocsPerSecond: number;
  readonly rerankCandidatesPerSecond: number;
}

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

const makeSeededUnitVector = (seed: number, dims: number): Float32Array => {
  let state = seed >>> 0;
  const vector = new Float32Array(dims);

  for (let index = 0; index < dims; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    vector[index] = ((state & 0xffff) / 0x8000) - 1;
  }

  return normalizeVector(vector);
};

const makeNeedleVector = (query: Float32Array, seed: number): Float32Array => {
  let state = seed >>> 0;
  const vector = new Float32Array(query.length);

  for (let index = 0; index < query.length; index++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const noise = (((state >>> 8) & 0xffff) / 0x8000 - 1) * 0.015;
    vector[index] = query[index]! + noise;
  }

  return normalizeVector(vector);
};

const buildSyntheticNeedleHaystack = (
  corpusSize: number,
  dims: number,
  queryCount: number,
): {
  readonly haystack: Float32Array[];
  readonly cases: SyntheticNeedleCase[];
} => {
  const haystack = Array.from({ length: corpusSize }, (_, index) =>
    makeSeededUnitVector(10_000 + index, dims),
  );

  const cases = Array.from({ length: queryCount }, (_, index) => {
    const query = makeSeededUnitVector(1_000 + index, dims);
    const expectedIndex = Math.floor(((index + 1) * corpusSize) / (queryCount + 1));

    haystack[expectedIndex] = makeNeedleVector(query, 50_000 + index);

    return {
      label: `needle-${index + 1}`,
      expectedIndex,
      query,
    };
  });

  return { haystack, cases };
};

describe("needle in haystack retrieval benchmark", () => {
  it(
    "retrieves planted needles and reports exact versus TurboQuant latency",
    () => {
      const corpusSize = 25_000;
      const dims = 640;
      const approximateK = 100;
      const rerankK = 10;
      const { haystack, cases } = buildSyntheticNeedleHaystack(corpusSize, dims, 4);

      const { result: turboIndex, ms: indexBuildMs } = measureSync(() =>
        buildTurboQuantIndex(haystack, { seed: 1337 }),
      );

      searchTopK(haystack, cases[0]!.query, rerankK);
      searchTurboQuantIndex(turboIndex, cases[0]!.query, approximateK);

      const timings: TimingSample[] = [];

      for (const testCase of cases) {
        const { result: exactTopK, ms: exactMs } = measureSync(() =>
          searchTopK(haystack, testCase.query, rerankK),
        );
        const { result: approximateTopK, ms: approximateMs } = measureSync(() =>
          searchTurboQuantIndex(turboIndex, testCase.query, approximateK),
        );
        const { result: rerankedTopK, ms: rerankMs } = measureSync(() =>
          rerankSearchHits(haystack, testCase.query, approximateTopK, rerankK),
        );

        timings.push({
          label: testCase.label,
          exactMs,
          approximateMs,
          rerankMs,
          totalApproximateMs: approximateMs + rerankMs,
          exactDocsPerSecond: (corpusSize / exactMs) * 1000,
          approximateDocsPerSecond: (corpusSize / approximateMs) * 1000,
          rerankCandidatesPerSecond: (approximateK / rerankMs) * 1000,
        });

        expect(exactTopK[0]?.index).toBe(testCase.expectedIndex);
        expect(approximateTopK.some((hit) => hit.index === testCase.expectedIndex)).toBe(true);
        expect(rerankedTopK[0]?.index).toBe(testCase.expectedIndex);
      }

      const summary = {
        corpusSize,
        dims,
        approximateK,
        rerankK,
        indexBuildMs: round(indexBuildMs),
        exactMs: summarizeMetric(timings.map((entry) => entry.exactMs)),
        approximateMs: summarizeMetric(timings.map((entry) => entry.approximateMs)),
        rerankMs: summarizeMetric(timings.map((entry) => entry.rerankMs)),
        totalApproximateMs: summarizeMetric(timings.map((entry) => entry.totalApproximateMs)),
        exactDocsPerSecond: summarizeMetric(timings.map((entry) => entry.exactDocsPerSecond)),
        approximateDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.approximateDocsPerSecond),
        ),
        rerankCandidatesPerSecond: summarizeMetric(
          timings.map((entry) => entry.rerankCandidatesPerSecond),
        ),
      };

      console.info(
        `[needle-haystack] synthetic benchmark\n${JSON.stringify({ summary, timings }, null, 2)}`,
      );

      expect(summary.indexBuildMs).toBeGreaterThan(0);
      expect(summary.exactMs.avg).toBeGreaterThan(0);
      expect(summary.approximateMs.avg).toBeGreaterThan(0);
      expect(summary.rerankMs.avg).toBeGreaterThan(0);
      expect(summary.totalApproximateMs.avg).toBeGreaterThan(0);
      expect(summary.exactDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.approximateDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.rerankCandidatesPerSecond.avg).toBeGreaterThan(0);
    },
    120_000,
  );
});