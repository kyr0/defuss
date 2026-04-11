import { describe, expect, it } from "vitest";
import {
  buildTurboQuantIndex,
  rerankSearchHits,
  searchTurboQuantIndex,
} from "./turboquant.js";
import { normalizeVector, searchTopK, searchTopKMulticore } from "./vector-search.js";

interface SyntheticNeedleCase {
  readonly label: string;
  readonly expectedIndex: number;
  readonly query: Float32Array;
}

interface TimingSample {
  readonly label: string;
  readonly exactSingleMs: number;
  readonly exactMulticoreMs: number;
  readonly approximateMs: number;
  readonly rerankMs: number;
  readonly totalApproximateMs: number;
  readonly exactSingleDocsPerSecond: number;
  readonly exactMulticoreDocsPerSecond: number;
  readonly approximateDocsPerSecond: number;
  readonly exactMulticoreSpeedup: number;
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

const measureAsync = async <T>(
  fn: () => Promise<T>,
): Promise<{ readonly result: T; readonly ms: number }> => {
  const startedAt = performance.now();
  const result = await fn();
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
    makeSeededUnitVector(20_000 + index, dims),
  );

  const cases = Array.from({ length: queryCount }, (_, index) => {
    const query = makeSeededUnitVector(2_000 + index, dims);
    const expectedIndex = Math.floor(((index + 1) * corpusSize) / (queryCount + 1));

    haystack[expectedIndex] = makeNeedleVector(query, 60_000 + index);

    return {
      label: `browser-needle-${index + 1}`,
      expectedIndex,
      query,
    };
  });

  return { haystack, cases };
};

describe("needle in haystack browser benchmark", () => {
  it(
    "compares single-thread exact, multicore exact, and TurboQuant search in chromium",
    async () => {
      const corpusSize = 8_000;
      const dims = 384;
      const approximateK = 100;
      const rerankK = 10;
      const exactMulticoreOptions = {
        cores: 4,
        threshold: 2_048,
      };
      const { haystack, cases } = buildSyntheticNeedleHaystack(corpusSize, dims, 3);

      const { result: turboIndex, ms: indexBuildMs } = measureSync(() =>
        buildTurboQuantIndex(haystack, { seed: 1337 }),
      );

      searchTopK(haystack, cases[0]!.query, rerankK);
      await searchTopKMulticore(haystack, cases[0]!.query, rerankK, exactMulticoreOptions);
      searchTurboQuantIndex(turboIndex, cases[0]!.query, approximateK);

      const timings: TimingSample[] = [];

      for (const testCase of cases) {
        const { result: exactSingleTopK, ms: exactSingleMs } = measureSync(() =>
          searchTopK(haystack, testCase.query, rerankK),
        );
        const { result: exactMulticoreTopK, ms: exactMulticoreMs } = await measureAsync(() =>
          searchTopKMulticore(haystack, testCase.query, rerankK, exactMulticoreOptions),
        );
        const { result: approximateTopK, ms: approximateMs } = measureSync(() =>
          searchTurboQuantIndex(turboIndex, testCase.query, approximateK),
        );
        const { result: rerankedTopK, ms: rerankMs } = measureSync(() =>
          rerankSearchHits(haystack, testCase.query, approximateTopK, rerankK),
        );

        timings.push({
          label: testCase.label,
          exactSingleMs,
          exactMulticoreMs,
          approximateMs,
          rerankMs,
          totalApproximateMs: approximateMs + rerankMs,
          exactSingleDocsPerSecond: (corpusSize / exactSingleMs) * 1000,
          exactMulticoreDocsPerSecond: (corpusSize / exactMulticoreMs) * 1000,
          approximateDocsPerSecond: (corpusSize / approximateMs) * 1000,
          exactMulticoreSpeedup: exactSingleMs / exactMulticoreMs,
        });

        expect(exactSingleTopK[0]?.index).toBe(testCase.expectedIndex);
        expect(exactMulticoreTopK).toEqual(exactSingleTopK);
        expect(approximateTopK.some((hit) => hit.index === testCase.expectedIndex)).toBe(true);
        expect(rerankedTopK[0]?.index).toBe(testCase.expectedIndex);
      }

      const summary = {
        corpusSize,
        dims,
        approximateK,
        rerankK,
        indexBuildMs: round(indexBuildMs),
        exactSingleMs: summarizeMetric(timings.map((entry) => entry.exactSingleMs)),
        exactMulticoreMs: summarizeMetric(timings.map((entry) => entry.exactMulticoreMs)),
        approximateMs: summarizeMetric(timings.map((entry) => entry.approximateMs)),
        rerankMs: summarizeMetric(timings.map((entry) => entry.rerankMs)),
        totalApproximateMs: summarizeMetric(timings.map((entry) => entry.totalApproximateMs)),
        exactSingleDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactSingleDocsPerSecond),
        ),
        exactMulticoreDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreDocsPerSecond),
        ),
        approximateDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.approximateDocsPerSecond),
        ),
        exactMulticoreSpeedup: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreSpeedup),
        ),
      };

      console.info(
        `[needle-haystack-browser] synthetic benchmark\n${JSON.stringify(
          { summary, timings },
          null,
          2,
        )}`,
      );

      expect(summary.indexBuildMs).toBeGreaterThan(0);
      expect(summary.exactSingleMs.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreMs.avg).toBeGreaterThan(0);
      expect(summary.approximateMs.avg).toBeGreaterThan(0);
      expect(summary.rerankMs.avg).toBeGreaterThan(0);
      expect(summary.totalApproximateMs.avg).toBeGreaterThan(0);
      expect(summary.exactSingleDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.approximateDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreSpeedup.avg).toBeGreaterThan(0);
    },
    120_000,
  );
});