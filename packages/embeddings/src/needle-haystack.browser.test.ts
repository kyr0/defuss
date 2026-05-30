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
  readonly exactDirectHit: boolean;
  readonly exactRerankedHit: boolean;
  readonly turboCandidateHit: boolean;
  readonly turboRerankedHit: boolean;
  readonly exactDirectMs: number;
  readonly exactCandidateMs: number;
  readonly exactRerankMs: number;
  readonly exactTotalMs: number;
  readonly exactMulticoreDirectMs: number;
  readonly exactMulticoreCandidateMs: number;
  readonly exactMulticoreRerankMs: number;
  readonly exactMulticoreTotalMs: number;
  readonly turboCandidateMs: number;
  readonly turboRerankMs: number;
  readonly turboTotalMs: number;
  readonly exactDirectDocsPerSecond: number;
  readonly exactCandidateDocsPerSecond: number;
  readonly exactMulticoreDirectDocsPerSecond: number;
  readonly exactMulticoreCandidateDocsPerSecond: number;
  readonly turboCandidateDocsPerSecond: number;
  readonly exactMulticoreDirectSpeedup: number;
  readonly exactMulticoreCandidateSpeedup: number;
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

const hitIndexes = <THit extends { index: number }>(hits: readonly THit[]): number[] => {
  return hits.map((hit) => hit.index);
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
    "compares exact+rerank and TurboQuant+rerank in chromium",
    async () => {
      const corpusSize = 8_000;
      const dims = 384;
      const candidateK = 100;
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
      searchTopK(haystack, cases[0]!.query, candidateK);
      await searchTopKMulticore(haystack, cases[0]!.query, rerankK, exactMulticoreOptions);
      await searchTopKMulticore(haystack, cases[0]!.query, candidateK, exactMulticoreOptions);
      searchTurboQuantIndex(turboIndex, cases[0]!.query, candidateK);

      const timings: TimingSample[] = [];

      for (const testCase of cases) {
        const { result: exactDirectTopK, ms: exactDirectMs } = measureSync(() =>
          searchTopK(haystack, testCase.query, rerankK),
        );
        const { result: exactCandidateTopK, ms: exactCandidateMs } = measureSync(() =>
          searchTopK(haystack, testCase.query, candidateK),
        );
        const { result: exactRerankedTopK, ms: exactRerankMs } = measureSync(() =>
          rerankSearchHits(haystack, testCase.query, exactCandidateTopK, rerankK),
        );
        const { result: exactMulticoreDirectTopK, ms: exactMulticoreDirectMs } =
          await measureAsync(() =>
            searchTopKMulticore(haystack, testCase.query, rerankK, exactMulticoreOptions),
          );
        const { result: exactMulticoreCandidateTopK, ms: exactMulticoreCandidateMs } =
          await measureAsync(() =>
            searchTopKMulticore(haystack, testCase.query, candidateK, exactMulticoreOptions),
          );
        const { result: exactMulticoreRerankedTopK, ms: exactMulticoreRerankMs } = measureSync(
          () => rerankSearchHits(haystack, testCase.query, exactMulticoreCandidateTopK, rerankK),
        );
        const { result: turboCandidateTopK, ms: turboCandidateMs } = measureSync(() =>
          searchTurboQuantIndex(turboIndex, testCase.query, candidateK),
        );
        const { result: turboRerankedTopK, ms: turboRerankMs } = measureSync(() =>
          rerankSearchHits(haystack, testCase.query, turboCandidateTopK, rerankK),
        );

        const exactDirectHit = exactDirectTopK[0]?.index === testCase.expectedIndex;
        const exactRerankedHit = exactRerankedTopK[0]?.index === testCase.expectedIndex;
        const turboCandidateHit = turboCandidateTopK.some(
          (hit) => hit.index === testCase.expectedIndex,
        );
        const turboRerankedHit = turboRerankedTopK[0]?.index === testCase.expectedIndex;

        timings.push({
          label: testCase.label,
          exactDirectHit,
          exactRerankedHit,
          turboCandidateHit,
          turboRerankedHit,
          exactDirectMs,
          exactCandidateMs,
          exactRerankMs,
          exactTotalMs: exactCandidateMs + exactRerankMs,
          exactMulticoreDirectMs,
          exactMulticoreCandidateMs,
          exactMulticoreRerankMs,
          exactMulticoreTotalMs: exactMulticoreCandidateMs + exactMulticoreRerankMs,
          turboCandidateMs,
          turboRerankMs,
          turboTotalMs: turboCandidateMs + turboRerankMs,
          exactDirectDocsPerSecond: (corpusSize / exactDirectMs) * 1000,
          exactCandidateDocsPerSecond: (corpusSize / exactCandidateMs) * 1000,
          exactMulticoreDirectDocsPerSecond: (corpusSize / exactMulticoreDirectMs) * 1000,
          exactMulticoreCandidateDocsPerSecond:
            (corpusSize / exactMulticoreCandidateMs) * 1000,
          turboCandidateDocsPerSecond: (corpusSize / turboCandidateMs) * 1000,
          exactMulticoreDirectSpeedup: exactDirectMs / exactMulticoreDirectMs,
          exactMulticoreCandidateSpeedup: exactCandidateMs / exactMulticoreCandidateMs,
        });

        expect(exactDirectHit).toBe(true);
        expect(exactRerankedHit).toBe(true);
        expect(hitIndexes(exactRerankedTopK)).toEqual(hitIndexes(exactDirectTopK));
        expect(hitIndexes(exactMulticoreDirectTopK)).toEqual(hitIndexes(exactDirectTopK));
        expect(hitIndexes(exactMulticoreRerankedTopK)).toEqual(hitIndexes(exactRerankedTopK));
        expect(turboCandidateHit).toBe(true);
        expect(turboRerankedHit).toBe(true);
      }

      const summary = {
        corpusSize,
        dims,
        candidateK,
        rerankK,
        indexBuildMs: round(indexBuildMs),
        exactDirectHitCount: timings.filter((entry) => entry.exactDirectHit).length,
        exactRerankedHitCount: timings.filter((entry) => entry.exactRerankedHit).length,
        turboCandidateHitCount: timings.filter((entry) => entry.turboCandidateHit).length,
        turboRerankedHitCount: timings.filter((entry) => entry.turboRerankedHit).length,
        exactDirectMs: summarizeMetric(timings.map((entry) => entry.exactDirectMs)),
        exactCandidateMs: summarizeMetric(timings.map((entry) => entry.exactCandidateMs)),
        exactRerankMs: summarizeMetric(timings.map((entry) => entry.exactRerankMs)),
        exactTotalMs: summarizeMetric(timings.map((entry) => entry.exactTotalMs)),
        exactMulticoreDirectMs: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreDirectMs),
        ),
        exactMulticoreCandidateMs: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreCandidateMs),
        ),
        exactMulticoreRerankMs: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreRerankMs),
        ),
        exactMulticoreTotalMs: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreTotalMs),
        ),
        turboCandidateMs: summarizeMetric(timings.map((entry) => entry.turboCandidateMs)),
        turboRerankMs: summarizeMetric(timings.map((entry) => entry.turboRerankMs)),
        turboTotalMs: summarizeMetric(timings.map((entry) => entry.turboTotalMs)),
        exactDirectDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactDirectDocsPerSecond),
        ),
        exactCandidateDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactCandidateDocsPerSecond),
        ),
        exactMulticoreDirectDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreDirectDocsPerSecond),
        ),
        exactMulticoreCandidateDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreCandidateDocsPerSecond),
        ),
        turboCandidateDocsPerSecond: summarizeMetric(
          timings.map((entry) => entry.turboCandidateDocsPerSecond),
        ),
        exactMulticoreDirectSpeedup: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreDirectSpeedup),
        ),
        exactMulticoreCandidateSpeedup: summarizeMetric(
          timings.map((entry) => entry.exactMulticoreCandidateSpeedup),
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
      expect(summary.exactRerankedHitCount).toBe(cases.length);
      expect(summary.turboRerankedHitCount).toBe(cases.length);
      expect(summary.exactDirectMs.avg).toBeGreaterThan(0);
      expect(summary.exactCandidateMs.avg).toBeGreaterThan(0);
      expect(summary.exactRerankMs.avg).toBeGreaterThan(0);
      expect(summary.exactTotalMs.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreDirectMs.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreCandidateMs.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreRerankMs.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreTotalMs.avg).toBeGreaterThan(0);
      expect(summary.turboCandidateMs.avg).toBeGreaterThan(0);
      expect(summary.turboRerankMs.avg).toBeGreaterThan(0);
      expect(summary.turboTotalMs.avg).toBeGreaterThan(0);
      expect(summary.exactDirectDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactCandidateDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreDirectDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreCandidateDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.turboCandidateDocsPerSecond.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreDirectSpeedup.avg).toBeGreaterThan(0);
      expect(summary.exactMulticoreCandidateSpeedup.avg).toBeGreaterThan(0);
    },
    120_000,
  );
});