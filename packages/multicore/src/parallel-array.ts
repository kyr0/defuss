import type { CallOptions, ParallelResult } from "./types.js";
import { multicore } from "./multicore.js";

/**
 * Parallel `Array.prototype.map` — distributes work across CPU cores.
 *
 * @example
 * ```ts
 * const doubled = await map(hugeArray, (x) => x * 2);
 * ```
 */
export const map = <T, U>(
  array: T[],
  fn: (item: T) => U,
  options?: CallOptions,
): ParallelResult<U[]> => {
  // Build a self-contained chunk processor that embeds fn
  const fnStr = fn.toString();
  // We create the worker function as a string that will be eval'd during serialization
  const chunkFn = new Function(
    "chunk",
    `const __mapFn = ${fnStr}; return chunk.map(__mapFn);`,
  ) as (chunk: T[]) => U[];

  const parallel = multicore(chunkFn, { threshold: 1024, ...options });
  const result = parallel(array, options) as any;

  // Wrap to flatten chunk results into a single array
  return {
    then(onfulfilled, onrejected) {
      return result.then(
        (chunks: U[][]) => (chunks as any).flat ? (chunks as any).flat() : ([] as U[]).concat(...chunks),
        undefined,
      ).then(onfulfilled, onrejected);
    },
    [Symbol.asyncIterator]() {
      return result[Symbol.asyncIterator]();
    },
  } as ParallelResult<U[]>;
};

/**
 * Parallel `Array.prototype.filter` — distributes predicate across CPU cores.
 *
 * @example
 * ```ts
 * const evens = await filter(hugeArray, (x) => x % 2 === 0);
 * ```
 */
export const filter = <T>(
  array: T[],
  fn: (item: T) => boolean,
  options?: CallOptions,
): ParallelResult<T[]> => {
  const fnStr = fn.toString();
  const chunkFn = new Function(
    "chunk",
    `const __filterFn = ${fnStr}; return chunk.filter(__filterFn);`,
  ) as (chunk: T[]) => T[];

  const parallel = multicore(chunkFn, { threshold: 1024, ...options });
  const result = parallel(array, options) as any;

  return {
    then(onfulfilled, onrejected) {
      return result.then(
        (chunks: T[][]) => (chunks as any).flat ? (chunks as any).flat() : ([] as T[]).concat(...chunks),
        undefined,
      ).then(onfulfilled, onrejected);
    },
    [Symbol.asyncIterator]() {
      return result[Symbol.asyncIterator]();
    },
  } as ParallelResult<T[]>;
};

/**
 * Parallel `Array.prototype.reduce` — each worker reduces its chunk,
 * then main thread reduces the partial results.
 *
 * @example
 * ```ts
 * const total = await reduce(hugeArray, (a, b) => a + b, 0);
 * ```
 */
export const reduce = <T>(
  array: T[],
  fn: (a: T, b: T) => T,
  initial: T,
  options?: CallOptions,
): Promise<T> => {
  const fnStr = fn.toString();
  const chunkFn = new Function(
    "chunk",
    `const __reduceFn = ${fnStr}; return chunk.reduce(__reduceFn);`,
  ) as (chunk: T[]) => T;

  const parallel = multicore(chunkFn, { threshold: 1024, ...options });
  const result = parallel(array, options) as any;

  return result.then((partials: T[]) => {
    // Reduce partial results on main thread
    return partials.reduce(fn, initial);
  });
};
