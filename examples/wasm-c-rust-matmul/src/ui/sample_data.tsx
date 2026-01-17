import { shuffleSampleData } from "../utils/random_sample";

export let vectorsA: Float32Array<ArrayBufferLike>[];
export let vectorsB: Float32Array<ArrayBufferLike>[];
export let size = 100000;

export let vectorsAFlat: Float32Array;
export let vectorsBFlat: Float32Array;

export const updateSize = (e: Event) => {
  size = Number.parseInt((e.target as HTMLInputElement).value, 10);
  console.log("Size updated to:", size);
  shuffle();
};

export const shuffle = () => {
  console.log("Shuffling sample data...");
  const sampleData = shuffleSampleData(size);
  const flatSampleData = generateBenchmarkVectorsFlat(1024, size);
  vectorsA = sampleData.vectorsA;
  vectorsB = sampleData.vectorsB;
  vectorsAFlat = flatSampleData.vectorsA;
  vectorsBFlat = flatSampleData.vectorsB;
};

export const SampleData = () => {
  return (
    <>
      <input type="number" value={size} onChange={updateSize} style={{ marginRight: "0.5rem" }} />
      <button type="button" onClick={shuffle}>
        🎲 Shuffle
      </button>
    </>
  );
};

/**
 * Generate test arrays for batch dot product benchmarking
 */
export function generateBenchmarkVectorsFlat(
  vectorLength: number,
  numPairs: number,
): { vectorsA: Float32Array; vectorsB: Float32Array } {
  console.log(
    `🎯 Generating test vectors: vectorLength=${vectorLength}, numPairs=${numPairs}`,
  );

  const totalElements = vectorLength * numPairs;
  const estimatedMemoryMB = (totalElements * 2 * 4) / (1024 * 1024); // 2 arrays, 4 bytes per float

  // Check if workload exceeds practical JavaScript memory limits (~2GB ArrayBuffer limit)
  const maxJSMemoryMB = 2000; // Conservative limit for ArrayBuffer allocation
  if (estimatedMemoryMB > maxJSMemoryMB) {
    throw new Error(
      `Workload too large for JavaScript: ${estimatedMemoryMB.toFixed(1)}MB exceeds JS ArrayBuffer limit (~${maxJSMemoryMB}MB). Consider reducing vector size or pair count.`,
    );
  }

  let vectorsA: Float32Array;
  let vectorsB: Float32Array;

  try {
    vectorsA = new Float32Array(totalElements);
    vectorsB = new Float32Array(totalElements);
  } catch (error) {
    throw new Error(
      `JavaScript memory allocation failed for ${estimatedMemoryMB.toFixed(1)}MB workload: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }

  // Generate test data with patterns that create verifiable results
  for (let i = 0; i < totalElements; i++) {
    vectorsA[i] = (i % vectorLength) + 1;
    vectorsB[i] = 2.0;
  }

  console.log(`📤 Generated JS workload: ${totalElements} elements`);

  return { vectorsA, vectorsB };
}
