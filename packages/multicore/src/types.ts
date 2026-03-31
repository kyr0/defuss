// ─── Numeric Types ──────────────────────────────────────────────────

/** Union of all typed array constructors supported for parallel ops */
export type TypedArray =
  | Float32Array
  | Float64Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Uint8Array
  | Uint16Array
  | Uint32Array;

/** Any array-like container of numbers */
export type NumericArray = number[] | TypedArray;

/** A matrix is an array of row vectors (each row is a NumericArray) */
export type Matrix<T extends NumericArray = Float32Array> = T[];

/** Batch of vectors (same shape as Matrix — alias for clarity) */
export type Vectors<T extends NumericArray = Float32Array> = T[];

// ─── Worker Message Protocol ────────────────────────────────────────

export type WorkerMessage =
  | WorkerExecuteMessage
  | WorkerResultMessage
  | WorkerErrorMessage
  | WorkerAbortMessage;

export interface WorkerExecuteMessage {
  type: "execute";
  id: string;
  args: unknown[];
  transfer?: ArrayBuffer[];
}

export interface WorkerResultMessage {
  type: "result";
  id: string;
  value: unknown;
  transfer?: ArrayBuffer[];
}

export interface WorkerErrorMessage {
  type: "error";
  id: string;
  error: string;
  stack?: string;
}

export interface WorkerAbortMessage {
  type: "abort";
  id: string;
}

// ─── Pool Configuration ─────────────────────────────────────────────

export interface PoolConfig {
  /** Maximum number of workers in the pool (default: core count) */
  maxWorkers?: number;
  /** Kill idle workers after this many ms (default: 30 000) */
  idleTimeoutMs?: number;
}

/** Opaque handle to a pool-managed worker */
export interface WorkerHandle {
  id: number;
  busy: boolean;
  terminated: boolean;
  /** Platform worker reference (Worker | worker_threads.Worker) */
  raw: unknown;
  /** Idle timer handle */
  idleTimer?: ReturnType<typeof setTimeout>;
}

/** Abstract interface implemented by pool-browser and pool-node */
export interface WorkerPool {
  readonly size: number;
  execute(args: unknown[], transfer?: ArrayBuffer[], signal?: AbortSignal): Promise<unknown>;
  warmup(count?: number): void;
  terminate(): Promise<void>;
}

// ─── Multicore Options ──────────────────────────────────────────────

export interface MulticoreOptions<R = unknown> {
  /** Override core count (default: all available cores) */
  cores?: number;
  /** Combine partial results into a single value on the main thread */
  reduce?: (a: R, b: R) => R;
  /** Pre-spawn worker pool at definition time (default: lazy) */
  eager?: boolean;
  /** Minimum array length to use workers; below this, run on main thread (default: 1024) */
  threshold?: number;
}

/** Per-call overrides passed as trailing argument */
export interface CallOptions {
  /** Override core count for this call */
  cores?: number;
  /** AbortSignal to cancel in-flight workers */
  signal?: AbortSignal;
  /** Force or disable Transferable detection (default: auto) */
  transfer?: boolean;
}

// ─── Parallel Result ────────────────────────────────────────────────

/**
 * Dual interface: use as `PromiseLike` (await → R[]) or as `AsyncIterable`
 * (for-await-of → yields each R as workers complete).
 */
export interface ParallelResult<R> extends AsyncIterable<R>, PromiseLike<R[]> {}

/**
 * Same as ParallelResult but when `reduce` is set, await resolves to a single R.
 */
export interface ReducedParallelResult<R> extends AsyncIterable<R>, PromiseLike<R> {}

// ─── Parallel Function ──────────────────────────────────────────────

/** The callable returned by `multicore(fn)` — same arg types, parallel return */
export type ParallelFn<T extends (...args: unknown[]) => unknown> = (
  ...args: [...Parameters<T>, CallOptions?]
) => ParallelResult<ReturnType<T>>;

export type ReducedParallelFn<T extends (...args: unknown[]) => unknown> = (
  ...args: [...Parameters<T>, CallOptions?]
) => ReducedParallelResult<ReturnType<T>>;

// ─── Op Options ─────────────────────────────────────────────────────

export interface OpOptions extends CallOptions {
  /** Force a specific unroll factor (default: auto-select by dimension) */
  unroll?: 4 | 8 | 16;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Check if a value is a TypedArray */
export const isTypedArray = (v: unknown): v is TypedArray =>
  ArrayBuffer.isView(v) && !(v instanceof DataView);

/** Check if value looks like CallOptions (duck-type) */
export const isCallOptions = (v: unknown): v is CallOptions =>
  typeof v === "object" &&
  v !== null &&
  !Array.isArray(v) &&
  !ArrayBuffer.isView(v) &&
  ("cores" in v || "signal" in v || "transfer" in v);
