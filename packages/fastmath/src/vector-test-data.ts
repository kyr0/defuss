/**
 * Test data generation utilities for vector and matrix operations
 * Provides seeded random generation for reproducible benchmarking
 */

export interface VectorTestData {
  vectorsA: Float32Array[];
  vectorsB: Float32Array[];
  dims: number;
}

export interface MatrixTestData {
  matricesA: Float32Array[][];
  matricesB: Float32Array[][];
  rows: number;
  cols: number;
}

// Type aliases for convenience
export type Vectors = Float32Array[];
export type Matrix = Float32Array[];

// a simple PRNG based on a seed
export const seededRandom = (seed: number) => () => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export const seededShuffle = (array: Array<number>, seed: number) => {
  const random = seededRandom(seed);
  let currentIndex = array.length;
  const shuffledArray = array.slice();

  while (currentIndex !== 0) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    [shuffledArray[currentIndex], shuffledArray[randomIndex]] = [
      shuffledArray[randomIndex],
      shuffledArray[currentIndex],
    ];
  }
  return shuffledArray;
};

/* generate sample vectors with specified dimensions and count, seeded random */
export const generateSampleData = (
  seed = 31337,
  dims = 1024,
  size = 100000,
): VectorTestData => {
  const rngA = seededRandom(seed);
  const rngB = seededRandom(seed + 1000);
  
  const vectorsA: Float32Array[] = [];
  const vectorsB: Float32Array[] = [];
  
  for (let i = 0; i < size; i++) {
    const vecA = new Float32Array(dims);
    const vecB = new Float32Array(dims);
    
    for (let j = 0; j < dims; j++) {
      vecA[j] = (rngA() - 0.5) * 2; // Range [-1, 1]
      vecB[j] = (rngB() - 0.5) * 2; // Range [-1, 1]
    }
    
    vectorsA.push(vecA);
    vectorsB.push(vecB);
  }
  
  return {
    vectorsA,
    vectorsB,
    dims,
  };
};

// Example pre-computed vector data for consistent testing
export const vectorAData = [
  -0.780411229178082, -0.2971447287288456, -0.6203027888345916,
  -0.2146756379713065, 0.12370596132501348, 0.8571300801836536,
  0.700197236824388, -0.8952043103331487, -0.2408484030090125,
  -0.5203499275413298, -0.3987430726805989, 0.9897652801763758,
  0.42166675924118935, 0.1099943550144372, -0.6511802896475318,
  -0.06107186740040303, -0.8841627808795018, 0.8376765542818863,
  0.3456789012345678, -0.9876543210987654, 0.1234567890123456,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  0.9012345678901234, -0.0987654321098765, 0.1234567890987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  0.9012345678901234, -0.0987654321098765, 0.1234567890987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  // Extend to 1024+ values using seeded generation
  ...Array.from({ length: 1000 }, (_, i) => {
    const rng = seededRandom(31337 + i);
    return (rng() - 0.5) * 2;
  })
];

export const vectorBData = [
  -0.3039059463561491, -0.2396020321553145, -0.12137561612252523,
  -0.3734650236096284, -0.29216868361640813, 0.2192298640398569,
  0.2875011069416651, -0.8245146743515999, -0.4388660628398804,
  0.7823456789012345, -0.1234567890123456, 0.9876543210987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  0.9012345678901234, -0.0987654321098765, 0.1234567890987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  0.9012345678901234, -0.0987654321098765, 0.1234567890987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  0.6789012345678901, -0.3210987654321098, 0.7890123456789012,
  -0.2109876543210987, 0.8901234567890123, -0.1098765432109876,
  0.9012345678901234, -0.0987654321098765, 0.1234567890987654,
  -0.8765432109876543, 0.2345678901234567, -0.7654321098765432,
  0.3456789012345678, -0.6543210987654321, 0.4567890123456789,
  -0.5432109876543210, 0.5678901234567890, -0.4321098765432109,
  // Extend to 1024+ values using seeded generation
  ...Array.from({ length: 1000 }, (_, i) => {
    const rng = seededRandom(42069 + i);
    return (rng() - 0.5) * 2;
  })
];

// Pre-computed sample datasets for common dimensions
const sampleData100kx1024dims = generateSampleData(
  31337 /* seed */,
  1024 /* dimensions */,
  100000 /* samples */,
);

const sampleData100kx384dims = generateSampleData(
  31337 /* seed */,
  384 /* dimensions */,
  100000 /* samples */,
);

const sampleData100kx4dims = generateSampleData(
  31337 /* seed */,
  4 /* dimensions */,
  100000 /* samples */,
);

export const samplesPerDimension = {
  4: sampleData100kx4dims,
  384: sampleData100kx384dims,
  1024: sampleData100kx1024dims,
};
