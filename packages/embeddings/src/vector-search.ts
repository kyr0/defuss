import type {
  ExactSearchMulticoreOptions,
  SearchHit,
  SearchResult,
  Vector,
  Vectors,
} from "./types.js";

const DEFAULT_MULTICORE_THRESHOLD = 8_192;

type MulticoreModule = typeof import("defuss-multicore");

type MulticoreChunkSearcher = (
  haystackChunk: ArrayLike<number>[],
  needlePayload: { values: ArrayLike<number> },
  k: number,
  callOptions?: {
    cores?: number;
    transfer?: boolean;
  },
) => PromiseLike<SearchHit[][]>;

const multicoreChunkSearcherCache = new Map<string, Promise<MulticoreChunkSearcher>>();
let multicoreModulePromise: Promise<MulticoreModule> | null = null;

const loadMulticoreModule = (): Promise<MulticoreModule> => {
  if (!multicoreModulePromise) {
    multicoreModulePromise = import("defuss-multicore");
  }

  return multicoreModulePromise;
};

const assertSameLength = (a: ArrayLike<number>, b: ArrayLike<number>): void => {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} !== ${b.length}`);
  }
};

export const toFloat32 = (values: ArrayLike<number>): Float32Array => {
  return values instanceof Float32Array ? values : Float32Array.from(values);
};

export const normalizeVector = (input: ArrayLike<number>): Float32Array => {
  const vector = toFloat32(input);
  let sumSq = 0.0;

  for (let i = 0; i < vector.length; i++) {
    const value = vector[i]!;
    sumSq += value * value;
  }

  if (sumSq === 0) {
    return new Float32Array(vector.length);
  }

  const out = new Float32Array(vector.length);
  const invNorm = 1.0 / Math.sqrt(sumSq);

  for (let i = 0; i < vector.length; i++) {
    out[i] = vector[i]! * invNorm;
  }

  return out;
};

export const normalizeVectors = (vectors: Vectors): Float32Array[] => {
  return Array.from(vectors, (vector) => normalizeVector(vector));
};

export const dotProduct = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  assertSameLength(a, b);

  let result = 0.0;
  let i = 0;
  const length = a.length;
  const unrollFactor = 8;
  const limit = Math.floor(length / unrollFactor) * unrollFactor;

  for (; i < limit; i += unrollFactor) {
    result +=
      a[i]! * b[i]! +
      a[i + 1]! * b[i + 1]! +
      a[i + 2]! * b[i + 2]! +
      a[i + 3]! * b[i + 3]! +
      a[i + 4]! * b[i + 4]! +
      a[i + 5]! * b[i + 5]! +
      a[i + 6]! * b[i + 6]! +
      a[i + 7]! * b[i + 7]!;
  }

  for (; i < length; i++) {
    result += a[i]! * b[i]!;
  }

  return result;
};

export const dotProductJS = (vectorsA: Vectors, vectorsB: Vectors): Float32Array => {
  if (vectorsA.length !== vectorsB.length) {
    throw new Error(`Batch size mismatch: ${vectorsA.length} !== ${vectorsB.length}`);
  }
  if (vectorsA.length === 0) {
    return new Float32Array(0);
  }

  const dims = vectorsA[0]!.length;
  const size = vectorsA.length;
  const results = new Float32Array(size);

  for (let i = 0; i < size; i++) {
    const vectorA = vectorsA[i]!;
    const vectorB = vectorsB[i]!;

    if (vectorA.length !== dims || vectorB.length !== dims) {
      throw new Error("All vectors must share the same dimensionality");
    }

    let result = 0.0;
    let j = 0;
    const unrollFactor = 4;
    const limit = Math.floor(dims / unrollFactor) * unrollFactor;

    for (; j < limit; j += unrollFactor) {
      result +=
        vectorA[j]! * vectorB[j]! +
        vectorA[j + 1]! * vectorB[j + 1]! +
        vectorA[j + 2]! * vectorB[j + 2]! +
        vectorA[j + 3]! * vectorB[j + 3]!;
    }

    for (; j < dims; j++) {
      result += vectorA[j]! * vectorB[j]!;
    }

    results[i] = result;
  }

  return results;
};

export const topKFromScores = (scores: ArrayLike<number>, k: number): SearchHit[] => {
  const kk = Math.min(k, scores.length);
  if (kk === 0) {
    return [];
  }

  const values = new Float32Array(kk);
  const indices = new Int32Array(kk);

  for (let i = 0; i < kk; i++) {
    values[i] = -Infinity;
    indices[i] = -1;
  }

  for (let i = 0; i < scores.length; i++) {
    const score = scores[i]!;
    if (score <= values[kk - 1]!) continue;

    let pos = kk - 1;
    while (pos > 0 && score > values[pos - 1]!) {
      values[pos] = values[pos - 1]!;
      indices[pos] = indices[pos - 1]!;
      pos--;
    }

    values[pos] = score;
    indices[pos] = i;
  }

  const results: SearchHit[] = [];
  for (let i = 0; i < kk; i++) {
    if (indices[i] >= 0) {
      results.push({ index: indices[i]!, score: values[i]! });
    }
  }

  return results;
};

const mergeTopKHits = (hits: readonly SearchHit[], k: number): SearchHit[] => {
  return [...hits]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .slice(0, Math.min(k, hits.length));
};

const buildChunkOffsets = (length: number, cores: number): Int32Array => {
  const offsets = new Int32Array(cores);
  const base = Math.floor(length / cores);
  const remainder = length % cores;

  let offset = 0;

  for (let workerIndex = 0; workerIndex < cores; workerIndex++) {
    offsets[workerIndex] = offset;
    offset += base + (workerIndex < remainder ? 1 : 0);
  }

  return offsets;
};

const searchChunkTopK = (
  haystackChunk: ArrayLike<number>[],
  needlePayload: { values: ArrayLike<number> },
  k: number,
): SearchHit[] => {
  const needle = needlePayload.values;
  const kk = Math.min(k, haystackChunk.length);
  if (kk === 0) {
    return [];
  }

  const values = new Float32Array(kk);
  const indices = new Int32Array(kk);

  for (let i = 0; i < kk; i++) {
    values[i] = -Infinity;
    indices[i] = -1;
  }

  for (let vectorIndex = 0; vectorIndex < haystackChunk.length; vectorIndex++) {
    const vector = haystackChunk[vectorIndex]!;

    if (vector.length !== needle.length) {
      throw new Error(`Vector length mismatch: ${vector.length} !== ${needle.length}`);
    }

    let score = 0.0;
    let dimIndex = 0;
    const unrollFactor = 8;
    const limit = Math.floor(vector.length / unrollFactor) * unrollFactor;

    for (; dimIndex < limit; dimIndex += unrollFactor) {
      score +=
        vector[dimIndex]! * needle[dimIndex]! +
        vector[dimIndex + 1]! * needle[dimIndex + 1]! +
        vector[dimIndex + 2]! * needle[dimIndex + 2]! +
        vector[dimIndex + 3]! * needle[dimIndex + 3]! +
        vector[dimIndex + 4]! * needle[dimIndex + 4]! +
        vector[dimIndex + 5]! * needle[dimIndex + 5]! +
        vector[dimIndex + 6]! * needle[dimIndex + 6]! +
        vector[dimIndex + 7]! * needle[dimIndex + 7]!;
    }

    for (; dimIndex < vector.length; dimIndex++) {
      score += vector[dimIndex]! * needle[dimIndex]!;
    }

    if (score <= values[kk - 1]!) {
      continue;
    }

    let insertAt = kk - 1;
    while (insertAt > 0 && score > values[insertAt - 1]!) {
      values[insertAt] = values[insertAt - 1]!;
      indices[insertAt] = indices[insertAt - 1]!;
      insertAt--;
    }

    values[insertAt] = score;
    indices[insertAt] = vectorIndex;
  }

  const hits: SearchHit[] = [];
  for (let i = 0; i < kk; i++) {
    if (indices[i] >= 0) {
      hits.push({ index: indices[i]!, score: values[i]! });
    }
  }

  return hits;
};

const getMulticoreChunkSearcher = async (
  options: ExactSearchMulticoreOptions,
): Promise<MulticoreChunkSearcher> => {
  const threshold = options.threshold ?? DEFAULT_MULTICORE_THRESHOLD;
  const eager = options.eager ?? false;
  const cacheKey = `${threshold}:${eager}`;
  const existing = multicoreChunkSearcherCache.get(cacheKey);

  if (existing) {
    return await existing;
  }

  const pendingSearcher = loadMulticoreModule().then(
    ({ multicore }) =>
      multicore(searchChunkTopK, { threshold, eager }) as MulticoreChunkSearcher,
  );
  multicoreChunkSearcherCache.set(cacheKey, pendingSearcher);

  return await pendingSearcher;
};

export const searchTopK = (
  haystack: Vectors,
  needle: ArrayLike<number>,
  k: number,
): SearchHit[] => {
  const scores = new Float32Array(haystack.length);
  for (let i = 0; i < haystack.length; i++) {
    scores[i] = dotProduct(haystack[i]!, needle);
  }
  return topKFromScores(scores, k);
};

export const searchTopKMulticore = async (
  haystack: Vectors,
  needle: ArrayLike<number>,
  k: number,
  options: ExactSearchMulticoreOptions = {},
): Promise<SearchHit[]> => {
  const kk = Math.min(k, haystack.length);
  if (kk <= 0 || haystack.length === 0) {
    return [];
  }

  const threshold = options.threshold ?? DEFAULT_MULTICORE_THRESHOLD;
  const { getPoolSize } = await loadMulticoreModule();
  const cores = Math.max(1, Math.floor(options.cores ?? getPoolSize()));

  if (cores === 1 || haystack.length < threshold) {
    return searchTopK(haystack, needle, kk);
  }

  const searcher = await getMulticoreChunkSearcher(options);
  const offsets = buildChunkOffsets(haystack.length, cores);
  const partialHits = await searcher(haystack as ArrayLike<number>[], { values: needle }, kk, {
    cores,
    transfer: options.transfer ?? false,
  });

  const mergedHits = partialHits.flatMap((hits, workerIndex) => {
    const chunkOffset = offsets[workerIndex] ?? 0;

    return hits.map((hit) => ({
      index: hit.index + chunkOffset,
      score: hit.score,
    }));
  });

  return mergeTopKHits(mergedHits, kk);
};

export const attachRecords = <TRecord>(
  hits: readonly SearchHit[],
  records: readonly TRecord[],
): SearchResult<TRecord>[] => {
  return hits.map((hit) => ({
    ...hit,
    record: records[hit.index],
  }));
};

export type { Vector, Vectors };
