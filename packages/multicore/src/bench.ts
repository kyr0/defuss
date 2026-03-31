#!/usr/bin/env tsx
/**
 * Benchmark script for defuss-multicore.
 *
 * Verifies the performance claims in README.md by running:
 *   1. Loop-unrolled ops vs naive baseline (single-thread)
 *   2. Multicore workers vs single-thread (worker_threads in Node)
 *
 * Run:     bun run bench
 * Browser: bun run bench:browser
 */
import { multicore, getPoolSize } from "./index.js";
import { dotProduct } from "./ops/dotproduct.js";
import { matmul } from "./ops/matmul.js";
import { matadd } from "./ops/matadd.js";
import { matsub } from "./ops/matsub.js";
import { matdiv } from "./ops/matdiv.js";

// --- Helpers --------------------------------------------------------

const seededRandom = (n: number, seed: number): Float64Array => {
  const out = new Float64Array(n);
  let s = seed | 0;
  for (let i = 0; i < n; i++) {
    s = (s * 1664525 + 1013904223) | 0;
    out[i] = (s >>> 0) / 4294967296;
  }
  return out;
};

const toMatrix = (flat: Float64Array, rows: number, cols: number): Float64Array[] => {
  const mat: Float64Array[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    mat[i] = flat.subarray(i * cols, (i + 1) * cols);
  }
  return mat;
};

// --- Naive baselines ------------------------------------------------

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

const fnv1a32 = (buf: Uint8Array): number => {
  let h = 0x811C9DC5;
  for (let i = 0; i < buf.length; i++) {
    h ^= buf[i];
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

const stretchKey = (seed: number, rounds: number): number => {
  let h = seed >>> 0;
  for (let r = 0; r < rounds; r++) {
    h ^= (h << 13);
    h = Math.imul(h, 0x01000193);
    h ^= (h >>> 7);
    h = Math.imul(h, 0x5BD1E995);
    h ^= (h >>> 15);
  }
  return h >>> 0;
};

const generateMessage = (seed: number, size: number): Uint8Array => {
  const buf = new Uint8Array(size);
  let s = (seed * 2654435761) >>> 0;
  for (let j = 0; j < size; j++) {
    s = (s * 1664525 + 1013904223) | 0;
    buf[j] = (s >>> 24) & 0xFF;
  }
  return buf;
};

// --- Timing ---------------------------------------------------------

const WARMUP_RUNS = 2;
const BENCH_RUNS = 5;

/** Run fn multiple times; return median timing in ms */
const timedMedian = (fn: () => void, runs = BENCH_RUNS, warmup = WARMUP_RUNS): number => {
  for (let i = 0; i < warmup; i++) fn();
  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    fn();
    timings.push(performance.now() - t0);
  }
  timings.sort((a, b) => a - b);
  return timings[Math.floor(timings.length / 2)];
};

const timedMedianAsync = async (fn: () => Promise<void>, runs = BENCH_RUNS, warmup = WARMUP_RUNS): Promise<number> => {
  for (let i = 0; i < warmup; i++) await fn();
  const timings: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    await fn();
    timings.push(performance.now() - t0);
  }
  timings.sort((a, b) => a - b);
  return timings[Math.floor(timings.length / 2)];
};

// --- Result collection ----------------------------------------------

interface BenchResult {
  section: string;
  operation: string;
  size: string;
  baselineMs: number;
  optimizedMs: number;
  speedup: number;
  readmeClaim: number | null; // claimed speedup from README, null if no claim
}

const results: BenchResult[] = [];

const record = (
  section: string, operation: string, size: string,
  baselineMs: number, optimizedMs: number, readmeClaim: number | null,
) => {
  const speedup = baselineMs / optimizedMs;
  results.push({ section, operation, size, baselineMs, optimizedMs, speedup, readmeClaim });
};

// --- Section 1: Loop-Unrolled Ops -----------------------------------

const benchLoopUnrolled = () => {
  console.log("\n--- Loop-Unrolled Ops vs Naive Baseline (single-thread) ---\n");

  // dotProduct: 100K x 768-dim
  {
    const pairs = 100_000, dim = 768;
    const as: Float64Array[] = [];
    const bs: Float64Array[] = [];
    for (let i = 0; i < pairs; i++) {
      as.push(seededRandom(dim, i));
      bs.push(seededRandom(dim, i + pairs));
    }

    const tNaive = timedMedian(() => { naiveDotProduct(as, bs); });
    const tOpt = timedMedian(() => { dotProduct(as, bs); });
    record("Loop-Unrolled", "dotProduct", `${pairs / 1000}K x ${dim}-dim`, tNaive, tOpt, 5.20);
  }

  // matmul: 500x500
  {
    const N = 500;
    const A = toMatrix(seededRandom(N * N, 33), N, N);
    const B = toMatrix(seededRandom(N * N, 44), N, N);

    const tNaive = timedMedian(() => { naiveMatmul(A, B, N, N, N); });
    const tOpt = timedMedian(() => { matmul(A, B); });
    record("Loop-Unrolled", "matmul", `${N}x${N}`, tNaive, tOpt, 2.24);
  }

  // matmul: 200x300 * 300x200
  {
    const M = 200, K = 300, N = 200;
    const A = toMatrix(seededRandom(M * K, 11), M, K);
    const B = toMatrix(seededRandom(K * N, 22), K, N);

    const tNaive = timedMedian(() => { naiveMatmul(A, B, M, K, N); });
    const tOpt = timedMedian(() => { matmul(A, B); });
    record("Loop-Unrolled", "matmul", `${M}x${K} x ${K}x${N}`, tNaive, tOpt, 1.96);
  }

  // matadd: 1000x1000
  {
    const rows = 1000, cols = 1000;
    const A = toMatrix(seededRandom(rows * cols, 42), rows, cols);
    const B = toMatrix(seededRandom(rows * cols, 137), rows, cols);

    const tNaive = timedMedian(() => { naiveElementWise(A, B, "add"); });
    const tOpt = timedMedian(() => { matadd(A, B); });
    record("Loop-Unrolled", "matadd", `${rows}x${cols}`, tNaive, tOpt, 1.63);
  }

  // matsub: 1000x1000
  {
    const rows = 1000, cols = 1000;
    const A = toMatrix(seededRandom(rows * cols, 55), rows, cols);
    const B = toMatrix(seededRandom(rows * cols, 99), rows, cols);

    const tNaive = timedMedian(() => { naiveElementWise(A, B, "sub"); });
    const tOpt = timedMedian(() => { matsub(A, B); });
    record("Loop-Unrolled", "matsub", `${rows}x${cols}`, tNaive, tOpt, 0.51);
  }

  // matdiv: 1000x1000
  {
    const rows = 1000, cols = 1000;
    const A = toMatrix(seededRandom(rows * cols, 77), rows, cols);
    const flatB = seededRandom(rows * cols, 88);
    for (let i = 0; i < flatB.length; i++) flatB[i] += 0.5;
    const B = toMatrix(flatB, rows, cols);

    const tNaive = timedMedian(() => { naiveElementWise(A, B, "div"); });
    const tOpt = timedMedian(() => { matdiv(A, B); });
    record("Loop-Unrolled", "matdiv", `${rows}x${cols}`, tNaive, tOpt, 0.76);
  }
};

// --- Section 2: Multicore Workers -----------------------------------

const benchMulticore = async () => {
  console.log("\n--- Multicore Workers vs Single-Thread ---\n");

  const cores = getPoolSize();
  console.log(`  CPU cores: ${cores}\n`);

  // Key stretching: 100K x 1000 rounds
  {
    const count = 100_000, rounds = 1000;
    const seeds = Array.from({ length: count }, (_, i) => i);

    const tBaseline = timedMedian(() => {
      for (let i = 0; i < count; i++) stretchKey(i, rounds);
    });

    const parallelStretch = multicore(
      (chunk: number[]) => {
        const out = new Uint32Array(chunk.length);
        for (let idx = 0; idx < chunk.length; idx++) {
          let h = chunk[idx] >>> 0;
          for (let r = 0; r < 1000; r++) {
            h ^= (h << 13);
            h = Math.imul(h, 0x01000193);
            h ^= (h >>> 7);
            h = Math.imul(h, 0x5BD1E995);
            h ^= (h >>> 15);
          }
          out[idx] = h >>> 0;
        }
        return out;
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

    const tOpt = await timedMedianAsync(async () => { await parallelStretch(seeds); });
    record("Multicore", "Key stretching (PBKDF2-like)", `${count / 1000}K x ${rounds} rounds`, tBaseline, tOpt, 4.52);
  }

  // CRC32: 500K x 64B
  {
    const msgCount = 500_000, msgSize = 64;
    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) messages[i] = generateMessage(i, msgSize);

    const tBaseline = timedMedian(() => {
      for (let i = 0; i < msgCount; i++) crc32(messages[i]);
    });

    const parallelCRC32 = multicore(
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
          const buf = new Uint8Array(64);
          let s = (seed * 2654435761) >>> 0;
          for (let j = 0; j < 64; j++) {
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
    const tOpt = await timedMedianAsync(async () => { await parallelCRC32(indices); });
    record("Multicore", "CRC32 (small messages)", `${msgCount / 1000}K x ${msgSize}B`, tBaseline, tOpt, 2.34);
  }

  // CRC32: 10K x 4KB
  {
    const msgCount = 10_000, msgSize = 4096;
    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) messages[i] = generateMessage(i, msgSize);

    const tBaseline = timedMedian(() => {
      for (let i = 0; i < msgCount; i++) crc32(messages[i]);
    });

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
    const tOpt = await timedMedianAsync(async () => { await parallelCRC32_4K(indices); });
    record("Multicore", "CRC32 (network packets)", `${msgCount / 1000}K x ${msgSize / 1024}KB`, tBaseline, tOpt, 1.26);
  }

  // FNV-1a: 1M x 128B
  {
    const msgCount = 1_000_000, msgSize = 128;
    const messages: Uint8Array[] = new Array(msgCount);
    for (let i = 0; i < msgCount; i++) messages[i] = generateMessage(i, msgSize);

    const tBaseline = timedMedian(() => {
      for (let i = 0; i < msgCount; i++) fnv1a32(messages[i]);
    });

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
    const tOpt = await timedMedianAsync(async () => { await parallelFNV(indices); });
    record("Multicore", "FNV-1a hash", `1M x ${msgSize}B`, tBaseline, tOpt, 0.82);
  }

  // Filter: 2M items
  {
    const n = 2_000_000;
    const data = Array.from({ length: n }, (_, i) => i);

    const tBaseline = timedMedian(() => { data.filter((x) => x % 7 === 0); });

    const parallelFilter = multicore(
      (chunk: number[]) => chunk.filter((x) => x % 7 === 0),
      {
        threshold: 512,
        reduce: (a: number[], b: number[]) => a.concat(b),
      },
    );

    const tOpt = await timedMedianAsync(async () => { await parallelFilter(data); });
    record("Multicore", "Filter elements", `${n / 1_000_000}M items`, tBaseline, tOpt, 0.43);
  }

  // Transform: 5M items (sin+cos)
  {
    const n = 5_000_000;
    const data = Array.from({ length: n }, (_, i) => i * 0.001);

    const tBaseline = timedMedian(() => {
      const out = new Float64Array(n);
      for (let i = 0; i < n; i++) out[i] = Math.sin(data[i]) + Math.cos(data[i]);
    });

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

    const tOpt = await timedMedianAsync(async () => { await parallelTransform(data); });
    record("Multicore", "Transform (sin+cos)", `${n / 1_000_000}M items`, tBaseline, tOpt, 0.28);
  }

  // Sum: 10M items
  {
    const n = 10_000_000;
    const data = Array.from({ length: n }, (_, i) => i + 1);

    const tBaseline = timedMedian(() => {
      let s = 0;
      for (let i = 0; i < n; i++) s += data[i];
    });

    const parallelSum = multicore(
      (chunk: number[]) => {
        let s = 0;
        for (let i = 0; i < chunk.length; i++) s += chunk[i];
        return s;
      },
      { threshold: 512, reduce: (a: number, b: number) => a + b },
    );

    const tOpt = await timedMedianAsync(async () => { await parallelSum(data); });
    record("Multicore", "Sum (accumulate)", `${n / 1_000_000}M items`, tBaseline, tOpt, 0.06);
  }
};

// --- Report ---------------------------------------------------------

const printReport = () => {
  const pad = (s: string, n: number) => s.padEnd(n);
  const rpad = (s: string, n: number) => s.padStart(n);

  const SEP = "-".repeat(100);
  const HEADER = `${pad("Operation", 32)} ${pad("Size", 24)} ${rpad("Baseline", 10)} ${rpad("Optimized", 10)} ${rpad("Speedup", 9)} ${rpad("README", 9)} ${rpad("Δ", 6)}`;

  let lastSection = "";

  console.log(`\n${"-".repeat(100)}`);
  console.log("  defuss-multicore benchmark results (median of 5 runs, 2 warmup)");
  console.log(`${"-".repeat(100)}`);

  for (const r of results) {
    if (r.section !== lastSection) {
      console.log(`\n${SEP}`);
      console.log(`  ${r.section}`);
      console.log(SEP);
      console.log(HEADER);
      console.log(SEP);
      lastSection = r.section;
    }

    const baseline = `${r.baselineMs.toFixed(1)}ms`;
    const optimized = `${r.optimizedMs.toFixed(1)}ms`;
    const speedup = `${r.speedup.toFixed(2)}x`;
    const readme = r.readmeClaim !== null ? `${r.readmeClaim.toFixed(2)}x` : "-";
    const delta = r.readmeClaim !== null
      ? `${r.speedup >= r.readmeClaim ? "+" : ""}${((r.speedup / r.readmeClaim - 1) * 100).toFixed(0)}%`
      : "-";

    console.log(
      `${pad(r.operation, 32)} ${pad(r.size, 24)} ${rpad(baseline, 10)} ${rpad(optimized, 10)} ${rpad(speedup, 9)} ${rpad(readme, 9)} ${rpad(delta, 6)}`,
    );
  }

  console.log(`\n${"-".repeat(100)}`);
  console.log("  Δ = measured vs README claim. Positive = faster than claimed.");
  console.log(`  Environment: ${typeof process !== "undefined" ? `Node.js ${process.version}` : "Browser"} on ${typeof process !== "undefined" ? process.arch : "unknown"}`);
  console.log(`  CPU cores: ${getPoolSize()}`);
  console.log(`${"-".repeat(100)}\n`);
};

// --- Main -----------------------------------------------------------

const main = async () => {
  console.log("\ndefuss-multicore benchmark");
  console.log(`Cores: ${getPoolSize()}`);

  benchLoopUnrolled();
  await benchMulticore();
  printReport();

  process.exit(0);
};

main().catch((err) => {
  console.error("Benchmark failed:", err);
  process.exit(1);
});
