import { generateSampleData, type SampleData } from "./math";

// 2 x 1024 float32 vectors with 1024 dimensions, seeded random
let sampleData20kx1024dims: SampleData | null = null;

export const shuffleSampleData = (size: number): SampleData => {
  if (!sampleData20kx1024dims) {
    sampleData20kx1024dims = generateSampleData(
      31337 /* seed */,
      1024 /* dimensions */,
      100000 /* samples */,
    );
  }

  // shuffle the vectors to get a random sample
  const vectorsA = sampleData20kx1024dims.vectorsA;
  const vectorsB = sampleData20kx1024dims.vectorsB;
  const dims = sampleData20kx1024dims.dims;
  const numVectors = vectorsA.length;
  // Create an array of indices and shuffle them
  const indices = Array.from({ length: numVectors }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // Take the first 'size' indices after shuffling
  const outA = new Array<Float32Array>(size);
  const outB = new Array<Float32Array>(size);
  for (let i = 0; i < size; i++) {
    outA[i] = vectorsA[indices[i]];
    outB[i] = vectorsB[indices[i]];
  }
  return { vectorsA: outA, vectorsB: outB, dims };
};
