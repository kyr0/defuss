import type {
  MulticoreOptions,
  CallOptions,
  ParallelResult,
  WorkerPool,
} from "./types.js";
import { isCallOptions } from "./types.js";
import { serializeFunction } from "./serialize.js";
import {
  partitionArgs,
  shouldFallback,
  detectTransferables,
  getCoreCount,
} from "./partition.js";

/** Detect environment: browser vs Node.js */
const isBrowser = (): boolean =>
  typeof globalThis !== "undefined" &&
  typeof (globalThis as any).Worker === "function";

/** Lazily import the correct pool backend */
let createPoolFn: ((script: string, config: any) => WorkerPool) | null = null;

const getPoolFactory = async (): Promise<(script: string, config: any) => WorkerPool> => {
  if (createPoolFn) return createPoolFn;

  if (isBrowser()) {
    const { createBrowserPool } = await import("./pool-browser.js");
    createPoolFn = createBrowserPool;
  } else {
    const { createNodePool } = await import("./pool-node.js");
    createPoolFn = createNodePool;
  }
  return createPoolFn!;
};

/**
 * Higher-order function that wraps a pure function for parallel execution.
 *
 * - Array/TypedArray args are auto-split across CPU cores
 * - Scalar args are broadcast to every worker
 * - Returns a function with the same arg types; return type becomes `ParallelResult<R>`
 *
 * @example
 * ```ts
 * const sum = multicore((chunk: number[]) => chunk.reduce((a, b) => a + b, 0));
 * const results = await sum(largeArray);           // number[]
 * for await (const r of sum(largeArray)) { ... }  // streaming
 * ```
 */
export const multicore = <T extends (...args: any[]) => any>(
  fn: T,
  options?: MulticoreOptions<ReturnType<T>>,
): ((...args: [...Parameters<T>, CallOptions?]) => ParallelResult<ReturnType<T>>) => {
  const defaultCores = options?.cores ?? getCoreCount();
  const threshold = options?.threshold ?? 1024;
  const reduceFn = options?.reduce;
  const eager = options?.eager ?? false;

  // Serialize once at wrap time
  const script = serializeFunction(fn);

  // Each multicore() invocation gets its own pool
  let pool: WorkerPool | null = null;

  const getPool = async (): Promise<WorkerPool> => {
    if (!pool) {
      const factory = await getPoolFactory();
      pool = factory(script, { maxWorkers: defaultCores });
    }
    return pool;
  };

  // Eager warmup: pre-spawn workers immediately
  if (eager) {
    getPool().then((p) => p.warmup(defaultCores));
  }

  const parallelFn = (...rawArgs: any[]): ParallelResult<ReturnType<T>> => {
    // Separate trailing CallOptions from real args
    let callOpts: CallOptions | undefined;
    let args: any[];

    if (rawArgs.length > 0 && isCallOptions(rawArgs[rawArgs.length - 1])) {
      callOpts = rawArgs[rawArgs.length - 1] as CallOptions;
      args = rawArgs.slice(0, -1);
    } else {
      args = rawArgs;
    }

    const cores = callOpts?.cores ?? defaultCores;
    const signal = callOpts?.signal;
    const transferOpt = callOpts?.transfer;

    // Main-thread fallback for small inputs
    if (shouldFallback(args, threshold)) {
      return createMainThreadResult(fn, args, reduceFn);
    }

    // Partition args across workers
    const partitioned = partitionArgs(args, cores);

    // Detect transferables (unless explicitly disabled)
    const shouldTransfer = transferOpt !== false;

    // Launch all workers (pool creation is async due to dynamic import)
    const workerPromises: Promise<ReturnType<T>>[] = partitioned.map((workerArgs) => {
      const transfer = shouldTransfer ? detectTransferables(workerArgs) : [];
      return getPool().then((p) => p.execute(workerArgs, transfer, signal)) as Promise<ReturnType<T>>;
    });

    return createParallelResult(workerPromises, reduceFn);
  };

  return parallelFn as any;
};

/** Creates a ParallelResult from already-launched worker promises */
const createParallelResult = <R>(
  promises: Promise<R>[],
  reduceFn?: (a: R, b: R) => R,
): ParallelResult<R> => {
  const result: ParallelResult<R> = {
    // PromiseLike: await resolves to R[] (or R if reduce is set)
    then(onfulfilled, onrejected) {
      const collected = Promise.all(promises).then((results) => {
        if (reduceFn && results.length > 0) {
          return (results as R[]).reduce(reduceFn) as any;
        }
        return results;
      });
      return collected.then(onfulfilled, onrejected);
    },

    // AsyncIterable: yields results as workers complete
    [Symbol.asyncIterator]() {
      let index = 0;
      // Resolve in submission order (worker 0 first, then 1, etc.)
      return {
        async next(): Promise<IteratorResult<R>> {
          if (index >= promises.length) {
            return { done: true, value: undefined };
          }
          const value = await promises[index++];
          return { done: false, value };
        },
      };
    },
  };

  return result;
};

/** Creates a ParallelResult that runs on the main thread (fallback) */
const createMainThreadResult = <R>(
  fn: (...args: any[]) => R,
  args: any[],
  reduceFn?: (a: R, b: R) => R,
): ParallelResult<R> => {
  // Execute synchronously, wrap in ParallelResult interface
  let resultValue: R;
  let error: Error | null = null;

  try {
    resultValue = fn(...args);
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
    resultValue = undefined as any;
  }

  const result: ParallelResult<R> = {
    then(onfulfilled, onrejected) {
      if (error) {
        return Promise.reject(error).then(onfulfilled, onrejected);
      }
      const val = reduceFn ? resultValue : ([resultValue] as any);
      return Promise.resolve(val).then(onfulfilled, onrejected);
    },

    [Symbol.asyncIterator]() {
      let yielded = false;
      return {
        async next(): Promise<IteratorResult<R>> {
          if (error) throw error;
          if (yielded) return { done: true, value: undefined };
          yielded = true;
          return { done: false, value: resultValue };
        },
      };
    },
  };

  return result;
};

/** Get the number of available CPU cores */
export { getCoreCount as getPoolSize } from "./partition.js";
