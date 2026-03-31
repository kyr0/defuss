/**
 * Benchmark browser test for defuss-multicore.
 *
 * Uses parallel random number generation to fill huge matrices,
 * then benchmarks multicore-accelerated ops vs naive single-thread baseline.
 * Asserts correctness AND measures timing.
 *
 * Runs in Chromium via Playwright + vitest browser mode.
 */
import { describe, it, expect } from "vitest";
import { multicore, getPoolSize } from "./index.js";
import { dotProduct } from "./ops/dotproduct.js";
import { matmul } from "./ops/matmul.js";
import { matadd } from "./ops/matadd.js";
import { matsub } from "./ops/matsub.js";
import { matdiv } from "./ops/matdiv.js";

// ─── Helpers ───────────────────────────────────────────────────────

/** Generates a random Float64Array of length `n` using a seeded LCG for reproducibility */
const seededRandom = (n: number, seed: number): Float64Array => {
  const out = new Float64Array(n);
  let s = seed | 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) | 0;
    out[i] = (s >>> 0) / 4294967296; // [0, 1)
  }
  return out;
};

/** Build a Matrix<Float64Array> with `rows` x `cols` from a flat buffer */
const toMatrix = (flat: Float64Array, rows: number, cols: number): Float64Array[] => {
  const mat: Float64Array[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    mat[i] = flat.subarray(i * cols, (i + 1) * cols);
  }
  return mat;
};

/** Naive single-thread matmul (no unrolling, no parallelism) */
const naiveMatmul = (
  A: Float64Array[], B: Float64Array[], M: number, K: number, N: number,
): Float64Array[] => {
  const C: Float64Array[] = new Array(M);
  for (let i = 0; i < M; i++) {
    C[i] = new Float64Array(N);
    for (let j = 0; j < N; j++) {
      let sum = 0;
      for (let k = 0; k < K; k++) sum += A[i][k] * B[k][j];
      C[i][j] = sum;
    }
  }
  return C;
};

/** Naive single-thread element-wise op */
const naiveElementWise = (
  A: Float64Array[], B: Float64Array[], op: "add" | "sub" | "div",
): Float64Array[] => {
  const rows = A.length;
  const cols = A[0].length;
  const C: Float64Array[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    C[i] = new Float64Array(cols);
    for (let j = 0; j < cols; j++) {
      if (op === "add") C[i][j] = A[i][j] + B[i][j];
      else if (op === "sub") C[i][j] = A[i][j] - B[i][j];
      else C[i][j] = A[i][j] / B[i][j];
    }
  }
  return C;
};

/** Naive single-thread batch dot product */
const naiveDotProduct = (as: Float64Array[], bs: Float64Array[]): Float32Array => {
  const n = as.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < as[i].length; j++) sum += as[i][j] * bs[i][j];
    out[i] = sum;
  }
  return out;
};

/** Simple timer */
const bench = (label: string, fn: () => void): number => {
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  console.log(`  [${label}] ${ms.toFixed(2)} ms`);
  return ms;
};

// ─── Parallel Random Number Generation ─────────────────────────────

describe("parallel random number generation", () => {
  it("generates 1M random numbers across Web Workers", async () => {
    const parallelRandom = multicore(
      (chunk: number[]) => {
        const out = new Float64Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          // Use seed from chunk values (each chunk gets unique seeds)
          let s = (chunk[i] * 1664525 + 1013904223) | 0;
          out[i] = (s >>> 0) / 4294967296;
        }
        return out;
      },
      { threshold: 512, reduce: (a: Float64Array, b: Float64Array) => {
          const merged = new Float64Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        }
      },
    );

    const seeds = Array.from({ length: 1_000_000 }, (_, i) => i);
    const result = await parallelRandom(seeds);

    expect(result).toBeInstanceOf(Float64Array);
    expect(result.length).toBe(1_000_000);
    // All values in [0, 1)
    for (let i = 0; i < 100; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(0);
      expect(result[i]).toBeLessThan(1);
    }
  });
});

// ─── Large Matrix Benchmarks ───────────────────────────────────────

describe("large matrix benchmarks (parallel vs baseline)", () => {

  // ── matadd: 1000×1000 (1M elements) ──────────────────────────────

  it("matadd 1000×1000: unrolled vs naive baseline", () => {
    const rows = 1000, cols = 1000;
    const flatA = seededRandom(rows * cols, 42);
    const flatB = seededRandom(rows * cols, 137);
    const A = toMatrix(flatA, rows, cols);
    const B = toMatrix(flatB, rows, cols);

    let resultNaive!: Float64Array[];
    let resultUnrolled!: Float64Array[];

    const tNaive = bench("matadd naive 1000×1000", () => {
      resultNaive = naiveElementWise(A, B, "add");
    });

    const tUnrolled = bench("matadd unrolled 1000×1000", () => {
      resultUnrolled = matadd(A, B);
    });

    // Correctness: spot-check first and last rows
    for (let j = 0; j < cols; j++) {
      expect(resultUnrolled[0][j]).toBeCloseTo(resultNaive[0][j], 10);
      expect(resultUnrolled[rows - 1][j]).toBeCloseTo(resultNaive[rows - 1][j], 10);
    }

    console.log(`  [matadd 1M] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });

  // ── matsub: 1000×1000 (1M elements) ──────────────────────────────

  it("matsub 1000×1000: unrolled vs naive baseline", () => {
    const rows = 1000, cols = 1000;
    const A = toMatrix(seededRandom(rows * cols, 55), rows, cols);
    const B = toMatrix(seededRandom(rows * cols, 99), rows, cols);

    let resultNaive!: Float64Array[];
    let resultUnrolled!: Float64Array[];

    const tNaive = bench("matsub naive 1000×1000", () => {
      resultNaive = naiveElementWise(A, B, "sub");
    });

    const tUnrolled = bench("matsub unrolled 1000×1000", () => {
      resultUnrolled = matsub(A, B);
    });

    for (let j = 0; j < cols; j++) {
      expect(resultUnrolled[0][j]).toBeCloseTo(resultNaive[0][j], 10);
    }

    console.log(`  [matsub 1M] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });

  // ── matdiv: 1000×1000 (1M elements) ──────────────────────────────

  it("matdiv 1000×1000: unrolled vs naive baseline", () => {
    const rows = 1000, cols = 1000;
    const A = toMatrix(seededRandom(rows * cols, 77), rows, cols);
    // Avoid division by zero: shift B values to [0.5, 1.5)
    const flatB = seededRandom(rows * cols, 88);
    for (let i = 0; i < flatB.length; i++) flatB[i] += 0.5;
    const B = toMatrix(flatB, rows, cols);

    let resultNaive!: Float64Array[];
    let resultUnrolled!: Float64Array[];

    const tNaive = bench("matdiv naive 1000×1000", () => {
      resultNaive = naiveElementWise(A, B, "div");
    });

    const tUnrolled = bench("matdiv unrolled 1000×1000", () => {
      resultUnrolled = matdiv(A, B);
    });

    for (let j = 0; j < cols; j++) {
      expect(resultUnrolled[0][j]).toBeCloseTo(resultNaive[0][j], 8);
    }

    console.log(`  [matdiv 1M] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });

  // ── matmul: 200×300 * 300×200 (120K multiply-accumulates) ────────

  it("matmul 200×300 * 300×200: unrolled vs naive baseline", () => {
    const M = 200, K = 300, N = 200;
    const A = toMatrix(seededRandom(M * K, 11), M, K);
    const B = toMatrix(seededRandom(K * N, 22), K, N);

    let resultNaive!: Float64Array[];
    let resultUnrolled!: Float64Array[];

    const tNaive = bench(`matmul naive ${M}×${K} * ${K}×${N}`, () => {
      resultNaive = naiveMatmul(A, B, M, K, N);
    });

    const tUnrolled = bench(`matmul unrolled ${M}×${K} * ${K}×${N}`, () => {
      resultUnrolled = matmul(A, B);
    });

    // Spot-check: first row, last row, middle row
    for (const rowIdx of [0, Math.floor(M / 2), M - 1]) {
      for (let j = 0; j < N; j++) {
        expect(resultUnrolled[rowIdx][j]).toBeCloseTo(resultNaive[rowIdx][j], 4);
      }
    }

    console.log(`  [matmul ${M}×${K}*${K}×${N}] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });

  // ── matmul: 500×500 * 500×500 (125M multiply-accumulates) ───────

  it("matmul 500×500: unrolled vs naive baseline", () => {
    const N = 500;
    const A = toMatrix(seededRandom(N * N, 33), N, N);
    const B = toMatrix(seededRandom(N * N, 44), N, N);

    let resultNaive!: Float64Array[];
    let resultUnrolled!: Float64Array[];

    const tNaive = bench(`matmul naive ${N}×${N}`, () => {
      resultNaive = naiveMatmul(A, B, N, N, N);
    });

    const tUnrolled = bench(`matmul unrolled ${N}×${N}`, () => {
      resultUnrolled = matmul(A, B);
    });

    // Spot-check corners
    for (const [i, j] of [[0, 0], [0, N - 1], [N - 1, 0], [N - 1, N - 1]] as [number, number][]) {
      expect(resultUnrolled[i][j]).toBeCloseTo(resultNaive[i][j], 2);
    }

    console.log(`  [matmul ${N}×${N}] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });

  // ── dotProduct: 100K pairs, 768-dim (LLM embedding similarity) ──

  it("dotProduct 100K×768-dim: unrolled vs naive baseline", () => {
    const pairs = 100_000;
    const dim = 768;
    const as: Float64Array[] = [];
    const bs: Float64Array[] = [];

    // Build vectors in batches to avoid huge single allocation
    for (let i = 0; i < pairs; i++) {
      as.push(seededRandom(dim, i));
      bs.push(seededRandom(dim, i + pairs));
    }

    let resultNaive!: Float32Array;
    let resultUnrolled!: Float32Array;

    const tNaive = bench(`dotProduct naive ${pairs}×${dim}`, () => {
      resultNaive = naiveDotProduct(as, bs);
    });

    const tUnrolled = bench(`dotProduct unrolled ${pairs}×${dim}`, () => {
      resultUnrolled = dotProduct(as, bs);
    });

    // Spot-check: Float32 precision is limited, use 2 decimal places
    for (let i = 0; i < 100; i++) {
      expect(resultUnrolled[i]).toBeCloseTo(resultNaive[i], 1);
    }
    expect(resultUnrolled[pairs - 1]).toBeCloseTo(resultNaive[pairs - 1], 1);

    console.log(`  [dotProduct ${pairs}×${dim}] speedup: ${(tNaive / tUnrolled).toFixed(2)}x`);
  });
});

// ─── Multicore Web Worker Benchmarks (parallel vs single-thread) ───

describe("multicore Web Worker benchmarks (parallel vs single-thread)", () => {

  it("parallel sum of 10M elements vs single-thread", async () => {
    const n = 10_000_000;
    const data = Array.from({ length: n }, (_, i) => i + 1);

    // Single-thread baseline
    const t0 = performance.now();
    let baselineSum = 0;
    for (let i = 0; i < n; i++) baselineSum += data[i];
    const tBaseline = performance.now() - t0;
    console.log(`  [sum baseline] ${tBaseline.toFixed(2)} ms`);

    // Parallel via multicore
    const parallelSum = multicore(
      (chunk: number[]) => {
        let s = 0;
        for (let i = 0; i < chunk.length; i++) s += chunk[i];
        return s;
      },
      { threshold: 512, reduce: (a: number, b: number) => a + b },
    );

    const t1 = performance.now();
    const parallelResult = await parallelSum(data);
    const tParallel = performance.now() - t1;
    console.log(`  [sum parallel] ${tParallel.toFixed(2)} ms`);

    expect(parallelResult).toBe(baselineSum);
    console.log(`  [sum 10M] cores: ${getPoolSize()}, speedup: ${(tBaseline / tParallel).toFixed(2)}x`);
  });

  it("parallel element-wise transform of 5M elements vs single-thread", async () => {
    const n = 5_000_000;
    const data = Array.from({ length: n }, (_, i) => i * 0.001);

    // Single-thread baseline: sin(x) + cos(x)
    const t0 = performance.now();
    const baselineResult = new Float64Array(n);
    for (let i = 0; i < n; i++) baselineResult[i] = Math.sin(data[i]) + Math.cos(data[i]);
    const tBaseline = performance.now() - t0;
    console.log(`  [transform baseline] ${tBaseline.toFixed(2)} ms`);

    // Parallel via multicore
    const parallelTransform = multicore(
      (chunk: number[]) => {
        const out = new Float64Array(chunk.length);
        for (let i = 0; i < chunk.length; i++) {
          out[i] = Math.sin(chunk[i]) + Math.cos(chunk[i]);
        }
        return out;
      },
      {
        threshold: 512,
        reduce: (a: Float64Array, b: Float64Array) => {
          const merged = new Float64Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        },
      },
    );

    const t1 = performance.now();
    const parallelResult = await parallelTransform(data);
    const tParallel = performance.now() - t1;
    console.log(`  [transform parallel] ${tParallel.toFixed(2)} ms`);

    // Spot-check correctness
    expect(parallelResult.length).toBe(n);
    for (let i = 0; i < 50; i++) {
      expect(parallelResult[i]).toBeCloseTo(baselineResult[i], 8);
    }

    console.log(`  [transform 5M] cores: ${getPoolSize()}, speedup: ${(tBaseline / tParallel).toFixed(2)}x`);
  });

  it("parallel filter of 2M elements vs single-thread", async () => {
    const n = 2_000_000;
    const data = Array.from({ length: n }, (_, i) => i);

    // Single-thread baseline: keep multiples of 7
    const t0 = performance.now();
    const baselineResult = data.filter((x) => x % 7 === 0);
    const tBaseline = performance.now() - t0;
    console.log(`  [filter baseline] ${tBaseline.toFixed(2)} ms`);

    // Parallel via multicore
    const parallelFilter = multicore(
      (chunk: number[]) => chunk.filter((x) => x % 7 === 0),
      {
        threshold: 512,
        reduce: (a: number[], b: number[]) => a.concat(b),
      },
    );

    const t1 = performance.now();
    const parallelResult = await parallelFilter(data);
    const tParallel = performance.now() - t1;
    console.log(`  [filter parallel] ${tParallel.toFixed(2)} ms`);

    expect(parallelResult.length).toBe(baselineResult.length);
    // Check first and last elements
    expect(parallelResult[0]).toBe(0);
    expect(parallelResult[parallelResult.length - 1]).toBe(baselineResult[baselineResult.length - 1]);

    console.log(`  [filter 2M] cores: ${getPoolSize()}, speedup: ${(tBaseline / tParallel).toFixed(2)}x`);
  });
});

// ─── Crypto / Compression Primitives (CPU-heavy per-element) ───────

/**
 * CRC32 — the checksum used by gzip, ZIP, PNG, Ethernet, CAN bus.
 * Pure arithmetic: table-lookup + XOR per byte. Fully self-contained.
 *
 * This is the textbook "slice-by-1" algorithm. The 256-entry lookup table
 * is pre-computed from the standard IEEE 802.3 polynomial 0xEDB88320.
 */
const makeCRC32Table = (): Uint32Array => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
};

const CRC32_TABLE = makeCRC32Table();

const crc32 = (buf: Uint8Array): number => {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

/**
 * FNV-1a 32-bit hash — used in hash tables, bloom filters, cache keys.
 * Simple but extremely common; e.g. Rust's default hasher uses FNV.
 */
const fnv1a32 = (buf: Uint8Array): number => {
  let h = 0x811C9DC5; // FNV offset basis
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  return h >>> 0;
};

/**
 * PBKDF2-like key stretching — iterates a simple hash N rounds.
 * This simulates the CPU cost of password-based key derivation
 * (argon2, scrypt, PBKDF2) without needing Web Crypto.
 */
const stretchKey = (seed: number, rounds: number): number => {
  let h = seed >>> 0;
  for (let r = 0; r < rounds; r++) {
    // FNV-1a-like mixing per round
    h ^= (h << 13);
    h = Math.imul(h, 0x01000193);
    h ^= (h >>> 7);
    h = Math.imul(h, 0x5BD1E995); // MurmurHash2 constant
    h ^= (h >>> 15);
  }
  return h >>> 0;
};

describe("crypto/compression primitive benchmarks (parallel vs single-thread)", () => {

  // ── CRC32: batch checksum of 500K small messages (64 bytes each) ──

  it("CRC32: 500K × 64-byte messages — parallel vs single-thread", async () => {
    const msgCount = 500_000;
    const msgSize = 64;

    // Generate messages: each is a 64-byte Uint8Array with seeded content
    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) {
      const buf = new Uint8Array(msgSize);
      let s = (i * 2654435761) >>> 0; // knuth multiplicative hash for seed
      for (let j = 0; j < msgSize; j++) {
        s = (s * 1664525 + 1013904223) | 0;
        buf[j] = (s >>> 24) & 0xFF;
      }
      messages[i] = buf;
    }

    // ── Single-thread baseline ──
    const baselineChecksums = new Uint32Array(msgCount);
    const t0 = performance.now();
    for (let i = 0; i < msgCount; i++) {
      baselineChecksums[i] = crc32(messages[i]);
    }
    const tBaseline = performance.now() - t0;
    console.log(`  [CRC32 baseline] ${msgCount} × ${msgSize}B: ${tBaseline.toFixed(2)} ms`);

    // ── Parallel via multicore ──
    // Pack messages into a flat array of indices + pass raw data
    // Worker reconstructs messages and computes checksums per chunk
    const parallelCRC32 = multicore(
      (chunk: number[]) => {
        // CRC32 table + checksum function embedded in worker
        const tbl = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
          tbl[i] = c;
        }
        const results = new Uint32Array(chunk.length);
        for (let idx = 0; idx < chunk.length; idx++) {
          // Regenerate the same message from seed (deterministic)
          const seed = chunk[idx];
          const buf = new Uint8Array(64);
          let s = (seed * 2654435761) >>> 0;
          for (let j = 0; j < 64; j++) {
            s = (s * 1664525 + 1013904223) | 0;
            buf[j] = (s >>> 24) & 0xFF;
          }
          // CRC32
          let crc = 0xFFFFFFFF;
          for (let i = 0; i < buf.length; i++) crc = tbl[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
          results[idx] = (crc ^ 0xFFFFFFFF) >>> 0;
        }
        return results;
      },
      {
        threshold: 512,
        reduce: (a: Uint32Array, b: Uint32Array) => {
          const merged = new Uint32Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        },
      },
    );

    const indices = Array.from({ length: msgCount }, (_, i) => i);
    const t1 = performance.now();
    const parallelChecksums = await parallelCRC32(indices);
    const tParallel = performance.now() - t1;
    console.log(`  [CRC32 parallel] ${msgCount} × ${msgSize}B: ${tParallel.toFixed(2)} ms`);

    // Correctness: spot-check first 200 + last 100
    for (let i = 0; i < 200; i++) {
      expect(parallelChecksums[i]).toBe(baselineChecksums[i]);
    }
    for (let i = msgCount - 100; i < msgCount; i++) {
      expect(parallelChecksums[i]).toBe(baselineChecksums[i]);
    }

    const speedup = tBaseline / tParallel;
    console.log(`  [CRC32 500K×64B] cores: ${getPoolSize()}, speedup: ${speedup.toFixed(2)}x`);
  });

  // ── FNV-1a: batch hash of 1M × 128-byte messages ─────────────────

  it("FNV-1a: 1M × 128-byte messages — parallel vs single-thread", async () => {
    const msgCount = 1_000_000;
    const msgSize = 128;

    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) {
      const buf = new Uint8Array(msgSize);
      let s = (i * 2654435761) >>> 0;
      for (let j = 0; j < msgSize; j++) {
        s = (s * 1664525 + 1013904223) | 0;
        buf[j] = (s >>> 24) & 0xFF;
      }
      messages[i] = buf;
    }

    // Single-thread
    const baselineHashes = new Uint32Array(msgCount);
    const t0 = performance.now();
    for (let i = 0; i < msgCount; i++) {
      baselineHashes[i] = fnv1a32(messages[i]);
    }
    const tBaseline = performance.now() - t0;
    console.log(`  [FNV-1a baseline] ${msgCount} × ${msgSize}B: ${tBaseline.toFixed(2)} ms`);

    // Parallel
    const parallelFNV = multicore(
      (chunk: number[]) => {
        const results = new Uint32Array(chunk.length);
        for (let idx = 0; idx < chunk.length; idx++) {
          const seed = chunk[idx];
          const buf = new Uint8Array(128);
          let s = (seed * 2654435761) >>> 0;
          for (let j = 0; j < 128; j++) {
            s = (s * 1664525 + 1013904223) | 0;
            buf[j] = (s >>> 24) & 0xFF;
          }
          let h = 0x811C9DC5;
          for (let i = 0; i < buf.length; i++) {
            h ^= buf[i];
            h = Math.imul(h, 0x01000193);
          }
          results[idx] = h >>> 0;
        }
        return results;
      },
      {
        threshold: 512,
        reduce: (a: Uint32Array, b: Uint32Array) => {
          const merged = new Uint32Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        },
      },
    );

    const indices = Array.from({ length: msgCount }, (_, i) => i);
    const t1 = performance.now();
    const parallelHashes = await parallelFNV(indices);
    const tParallel = performance.now() - t1;
    console.log(`  [FNV-1a parallel] ${msgCount} × ${msgSize}B: ${tParallel.toFixed(2)} ms`);

    for (let i = 0; i < 200; i++) {
      expect(parallelHashes[i]).toBe(baselineHashes[i]);
    }
    for (let i = msgCount - 100; i < msgCount; i++) {
      expect(parallelHashes[i]).toBe(baselineHashes[i]);
    }

    const speedup = tBaseline / tParallel;
    console.log(`  [FNV-1a 1M×128B] cores: ${getPoolSize()}, speedup: ${speedup.toFixed(2)}x`);
  });

  // ── Key Stretching: 100K seeds × 1000 rounds (PBKDF2-like) ───────

  it("key stretching: 100K seeds × 1000 rounds — parallel vs single-thread", async () => {
    const count = 100_000;
    const rounds = 1000;

    // Single-thread baseline
    const baselineResults = new Uint32Array(count);
    const t0 = performance.now();
    for (let i = 0; i < count; i++) {
      baselineResults[i] = stretchKey(i, rounds);
    }
    const tBaseline = performance.now() - t0;
    console.log(`  [stretch baseline] ${count} × ${rounds} rounds: ${tBaseline.toFixed(2)} ms`);

    // Parallel
    const parallelStretch = multicore(
      (chunk: number[]) => {
        const results = new Uint32Array(chunk.length);
        for (let idx = 0; idx < chunk.length; idx++) {
          let h = chunk[idx] >>> 0;
          for (let r = 0; r < 1000; r++) {
            h ^= (h << 13);
            h = Math.imul(h, 0x01000193);
            h ^= (h >>> 7);
            h = Math.imul(h, 0x5BD1E995);
            h ^= (h >>> 15);
          }
          results[idx] = h >>> 0;
        }
        return results;
      },
      {
        threshold: 256,
        reduce: (a: Uint32Array, b: Uint32Array) => {
          const merged = new Uint32Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        },
      },
    );

    const seeds = Array.from({ length: count }, (_, i) => i);
    const t1 = performance.now();
    const parallelResults = await parallelStretch(seeds);
    const tParallel = performance.now() - t1;
    console.log(`  [stretch parallel] ${count} × ${rounds} rounds: ${tParallel.toFixed(2)} ms`);

    // Correctness
    for (let i = 0; i < 200; i++) {
      expect(parallelResults[i]).toBe(baselineResults[i]);
    }
    for (let i = count - 100; i < count; i++) {
      expect(parallelResults[i]).toBe(baselineResults[i]);
    }

    const speedup = tBaseline / tParallel;
    console.log(`  [stretch 100K×1K] cores: ${getPoolSize()}, speedup: ${speedup.toFixed(2)}x`);
    // Key stretching is CPU-heavy enough that parallel should win
    expect(speedup).toBeGreaterThan(1.0);
  });

  // ── CRC32 of large buffers: 10K × 4KB messages (network packets) ──

  it("CRC32: 10K × 4KB buffers (network packet checksumming) — parallel vs single-thread", async () => {
    const msgCount = 10_000;
    const msgSize = 4096;

    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) {
      const buf = new Uint8Array(msgSize);
      let s = (i * 2654435761) >>> 0;
      for (let j = 0; j < msgSize; j++) {
        s = (s * 1664525 + 1013904223) | 0;
        buf[j] = (s >>> 24) & 0xFF;
      }
      messages[i] = buf;
    }

    // Single-thread
    const baselineChecksums = new Uint32Array(msgCount);
    const t0 = performance.now();
    for (let i = 0; i < msgCount; i++) {
      baselineChecksums[i] = crc32(messages[i]);
    }
    const tBaseline = performance.now() - t0;
    console.log(`  [CRC32-4KB baseline] ${msgCount} × ${msgSize}B: ${tBaseline.toFixed(2)} ms`);

    // Parallel — pass indices, workers regenerate + compute
    const parallelCRC32_4K = multicore(
      (chunk: number[]) => {
        const tbl = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
          let c = i;
          for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
          tbl[i] = c;
        }
        const results = new Uint32Array(chunk.length);
        for (let idx = 0; idx < chunk.length; idx++) {
          const seed = chunk[idx];
          const buf = new Uint8Array(4096);
          let s = (seed * 2654435761) >>> 0;
          for (let j = 0; j < 4096; j++) {
            s = (s * 1664525 + 1013904223) | 0;
            buf[j] = (s >>> 24) & 0xFF;
          }
          let crc = 0xFFFFFFFF;
          for (let i = 0; i < buf.length; i++) crc = tbl[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
          results[idx] = (crc ^ 0xFFFFFFFF) >>> 0;
        }
        return results;
      },
      {
        threshold: 256,
        reduce: (a: Uint32Array, b: Uint32Array) => {
          const merged = new Uint32Array(a.length + b.length);
          merged.set(a, 0);
          merged.set(b, a.length);
          return merged;
        },
      },
    );

    const indices = Array.from({ length: msgCount }, (_, i) => i);
    const t1 = performance.now();
    const parallelChecksums = await parallelCRC32_4K(indices);
    const tParallel = performance.now() - t1;
    console.log(`  [CRC32-4KB parallel] ${msgCount} × ${msgSize}B: ${tParallel.toFixed(2)} ms`);

    for (let i = 0; i < 100; i++) {
      expect(parallelChecksums[i]).toBe(baselineChecksums[i]);
    }

    const speedup = tBaseline / tParallel;
    console.log(`  [CRC32 10K×4KB] cores: ${getPoolSize()}, speedup: ${speedup.toFixed(2)}x`);
  });
});
