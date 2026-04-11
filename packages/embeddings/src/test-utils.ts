import type { FeatureExtractorLike, TransformersModuleLike } from "./types.js";

const hashText = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const makeVector = (seed: number, dims: number): Float32Array => {
  const out = new Float32Array(dims);
  let state = seed >>> 0;

  for (let i = 0; i < dims; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    out[i] = ((state & 0xffff) / 0x8000) - 1;
  }

  let sumSq = 0;
  for (let i = 0; i < dims; i++) sumSq += out[i]! * out[i]!;
  const invNorm = 1 / Math.sqrt(sumSq || 1);
  for (let i = 0; i < dims; i++) out[i] *= invNorm;
  return out;
};

export const createMockFeatureExtractor = (dims = 640): FeatureExtractorLike => {
  return async (input: string | string[]) => {
    const texts = Array.isArray(input) ? input : [input];
    const data = new Float32Array(texts.length * dims);

    for (let row = 0; row < texts.length; row++) {
      const vector = makeVector(hashText(texts[row]!), dims);
      data.set(vector, row * dims);
    }

    return {
      data,
      dims: [texts.length, dims],
      type: "float32",
    };
  };
};

export const createMockTransformersModule = (dims = 640): TransformersModuleLike => {
  return {
    env: {},
    pipeline: async () => createMockFeatureExtractor(dims),
  };
};
