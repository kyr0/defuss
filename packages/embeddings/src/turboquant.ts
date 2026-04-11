/* eslint-disable no-bitwise */
import {
  dotProduct,
  normalizeVector,
  normalizeVectors,
  searchTopK,
  topKFromScores,
  toFloat32,
} from "./vector-search.js";
import type {
  BuildTurboQuantIndexOptions,
  SearchHit,
  TurboQuantRerankedSearchHit,
  TurboQuantRerankResult,
  TurboQuantSearchIndex,
  Vectors,
} from "./types.js";

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(message);
};

const nextPowerOfTwo = (value: number): number => {
  let next = 1;
  while (next < value) {
    next <<= 1;
  }
  return next;
};

const mulberry32 = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const createRandomSigns = (dims: number, seed = 0x12345678): Int8Array => {
  const rng = mulberry32(seed);
  const signs = new Int8Array(dims);

  for (let i = 0; i < dims; i++) {
    signs[i] = rng() < 0.5 ? -1 : 1;
  }

  return signs;
};

const createUniformCodebook16 = (clip: number): Float32Array => {
  const codebook = new Float32Array(16);
  const step = (2 * clip) / 15;

  for (let i = 0; i < 16; i++) {
    codebook[i] = -clip + i * step;
  }

  return codebook;
};

const padToLength = (input: Float32Array, targetLength: number): Float32Array => {
  if (input.length === targetLength) {
    return input;
  }

  const out = new Float32Array(targetLength);
  out.set(input);
  return out;
};

const applySignsInPlace = (data: Float32Array, signs: Int8Array): void => {
  for (let i = 0; i < data.length; i++) {
    data[i] *= signs[i]!;
  }
};

const fwhtInPlace = (data: Float32Array): void => {
  const n = data.length;
  for (let len = 1; len < n; len <<= 1) {
    const step = len << 1;
    for (let i = 0; i < n; i += step) {
      for (let j = 0; j < len; j++) {
        const a = data[i + j]!;
        const b = data[i + j + len]!;
        data[i + j] = a + b;
        data[i + j + len] = a - b;
      }
    }
  }
};

const rotateCorpusVectorScaled = (input: Float32Array, signs: Int8Array): Float32Array => {
  const out = padToLength(normalizeVector(input), signs.length);
  applySignsInPlace(out, signs);
  fwhtInPlace(out);
  return out;
};

const rotateQueryForScoring = (query: Float32Array, signs: Int8Array): Float32Array => {
  const out = padToLength(normalizeVector(query), signs.length);
  applySignsInPlace(out, signs);
  fwhtInPlace(out);

  const invDims = 1.0 / out.length;
  for (let i = 0; i < out.length; i++) {
    out[i] *= invDims;
  }

  return out;
};

const quantizeScalarTo4Bit = (x: number, clip: number, invStep: number): number => {
  const clamped = x < -clip ? -clip : x > clip ? clip : x;
  let q = ((clamped + clip) * invStep + 0.5) | 0;
  if (q < 0) q = 0;
  else if (q > 15) q = 15;
  return q;
};

const packQuantized4Bit = (
  rotatedScaled: Float32Array,
  clip: number,
  out: Uint8Array,
  outOffset: number,
): void => {
  const dims = rotatedScaled.length;
  const invStep = 15.0 / (2.0 * clip);

  let k = outOffset;
  for (let j = 0; j < dims; j += 2) {
    const q0 = quantizeScalarTo4Bit(rotatedScaled[j]!, clip, invStep);
    const q1 = quantizeScalarTo4Bit(rotatedScaled[j + 1]!, clip, invStep);
    out[k++] = q0 | (q1 << 4);
  }
};

const buildPairByteLUT = (queryScore: Float32Array, codebook: Float32Array): Float32Array => {
  const codeBytes = queryScore.length >>> 1;
  const lut = new Float32Array(codeBytes << 8);

  for (let p = 0; p < codeBytes; p++) {
    const q0 = queryScore[p << 1]!;
    const q1 = queryScore[(p << 1) + 1]!;
    const base = p << 8;

    for (let byte = 0; byte < 256; byte++) {
      const lo = byte & 15;
      const hi = byte >>> 4;
      lut[base + byte] = q0 * codebook[lo]! + q1 * codebook[hi]!;
    }
  }

  return lut;
};

export const buildTurboQuantIndex = (
  vectors: Vectors,
  options: BuildTurboQuantIndexOptions = {},
): TurboQuantSearchIndex => {
  assert(vectors.length > 0, "vectors must be non-empty");

  const dims = vectors[0]!.length;
  assert(dims > 1, "dims must be at least 2");
  const rotatedDims = nextPowerOfTwo(dims);
  assert((rotatedDims & 1) === 0, "rotated dims must be even");

  for (let i = 1; i < vectors.length; i++) {
    assert(vectors[i]!.length === dims, "all vectors must have same dimensionality");
  }

  const size = vectors.length;
  const codeBytes = rotatedDims >>> 1;
  const clip = options.clip ?? 3.0;
  const signs = createRandomSigns(rotatedDims, options.seed ?? 0x12345678);
  const codebook = createUniformCodebook16(clip);
  const codes = new Uint8Array(size * codeBytes);

  let outOffset = 0;
  for (let i = 0; i < size; i++) {
    const rotatedScaled = rotateCorpusVectorScaled(vectors[i]!, signs);
    packQuantized4Bit(rotatedScaled, clip, codes, outOffset);
    outOffset += codeBytes;
  }

  return {
    size,
    dims,
    rotatedDims,
    codeBytes,
    clip,
    codebook,
    signs,
    codes,
  };
};

export const scoreTurboQuantIndex = (
  index: TurboQuantSearchIndex,
  query: ArrayLike<number>,
): Float32Array => {
  if (query.length !== index.dims) {
    throw new Error(`Query dims mismatch: ${query.length} !== ${index.dims}`);
  }

  const queryScore = rotateQueryForScoring(toFloat32(query), index.signs);
  const lut = buildPairByteLUT(queryScore, index.codebook);

  const { size, codeBytes, codes } = index;
  const scores = new Float32Array(size);
  const unroll = 8;
  const limit = Math.floor(codeBytes / unroll) * unroll;

  for (let i = 0, off = 0; i < size; i++, off += codeBytes) {
    let acc0 = 0.0;
    let acc1 = 0.0;
    let acc2 = 0.0;
    let acc3 = 0.0;

    let j = 0;
    for (; j < limit; j += unroll) {
      const base = j << 8;
      acc0 += lut[base + codes[off + j]!]!;
      acc1 += lut[base + 256 + codes[off + j + 1]!]!;
      acc2 += lut[base + 512 + codes[off + j + 2]!]!;
      acc3 += lut[base + 768 + codes[off + j + 3]!]!;
      acc0 += lut[base + 1024 + codes[off + j + 4]!]!;
      acc1 += lut[base + 1280 + codes[off + j + 5]!]!;
      acc2 += lut[base + 1536 + codes[off + j + 6]!]!;
      acc3 += lut[base + 1792 + codes[off + j + 7]!]!;
    }

    let score = acc0 + acc1 + acc2 + acc3;
    for (; j < codeBytes; j++) {
      score += lut[(j << 8) + codes[off + j]!]!;
    }

    scores[i] = score;
  }

  return scores;
};

export const rerankSearchHits = (
  haystack: Vectors,
  query: ArrayLike<number>,
  approximateHits: readonly SearchHit[],
  k: number,
): TurboQuantRerankedSearchHit[] => {
  const kk = Math.min(k, approximateHits.length);
  if (kk === 0) {
    return [];
  }

  const reranked = approximateHits.map((hit) => ({
    index: hit.index,
    score: dotProduct(haystack[hit.index]!, query),
    approximateScore: hit.score,
  }));

  reranked.sort((a, b) => b.score - a.score);
  return reranked.slice(0, kk);
};

export const searchTurboQuantIndex = (
  index: TurboQuantSearchIndex,
  query: ArrayLike<number>,
  k: number,
): SearchHit[] => {
  const scores = scoreTurboQuantIndex(index, query);
  return topKFromScores(scores, k);
};

export const searchTurboQuantIndexRerank = (
  index: TurboQuantSearchIndex,
  haystack: Vectors,
  query: ArrayLike<number>,
  approximateK: number,
  rerankK: number,
): TurboQuantRerankResult => {
  assert(haystack.length === index.size, "haystack length must match index size");

  const approximateTopK = searchTurboQuantIndex(index, query, approximateK);
  const rerankedTopK = rerankSearchHits(haystack, query, approximateTopK, rerankK);

  return {
    approximateTopK,
    rerankedTopK,
  };
};

export const selfCheckTurboQuant = (
  corpus: Vectors,
  query: ArrayLike<number>,
  k = 10,
): {
  exactTopK: SearchHit[];
  approxTopK: SearchHit[];
  overlap: number;
  exactScores: Float32Array;
  approxScores: Float32Array;
} => {
  const normalizedCorpus = normalizeVectors(corpus);
  const normalizedQuery = normalizeVector(query);
  const index = buildTurboQuantIndex(normalizedCorpus);
  const approxScores = scoreTurboQuantIndex(index, normalizedQuery);
  const exactScores = new Float32Array(normalizedCorpus.length);

  for (let i = 0; i < normalizedCorpus.length; i++) {
    exactScores[i] = dotProduct(normalizedCorpus[i]!, normalizedQuery);
  }

  const exactTopK = searchTopK(normalizedCorpus, normalizedQuery, k);
  const approxTopK = searchTurboQuantIndex(index, normalizedQuery, k);

  let overlapCount = 0;
  for (const exact of exactTopK) {
    if (approxTopK.some((candidate) => candidate.index === exact.index)) {
      overlapCount++;
    }
  }

  return {
    exactTopK,
    approxTopK,
    overlap: overlapCount / Math.max(1, Math.min(exactTopK.length, approxTopK.length)),
    exactScores,
    approxScores,
  };
};
