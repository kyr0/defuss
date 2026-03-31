// defuss-multicore — Isomorphic multicore execution + linear algebra
//
// Public API:
//   multicore(fn, opts?)  — HOF wrapping pure functions for parallel execution
//   map, filter, reduce   — parallel array methods
//   dotProduct, matmul, matadd, matsub, matdiv — JIT-optimized vector/matrix ops
//   getPoolSize()         — number of available CPU cores

// Core HOF
export { multicore, getPoolSize } from "./multicore.js";

// Parallel array methods
export { map, filter, reduce } from "./parallel-array.js";

// Vector/matrix ops
export {
  dotProduct,
  matmul,
  matadd,
  matsub,
  matdiv,
} from "./ops/index.js";

// Types
export type {
  MulticoreOptions,
  CallOptions,
  ParallelResult,
  ReducedParallelResult,
  ParallelFn,
  ReducedParallelFn,
  NumericArray,
  TypedArray,
  Matrix,
  Vectors,
  OpOptions,
  WorkerPool,
  PoolConfig,
} from "./types.js";
