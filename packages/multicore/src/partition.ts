import { isTypedArray, type TypedArray } from "./types.js";

/**
 * Partitions function arguments for distribution across `cores` workers.
 *
 * Rules:
 * - Array args → `.slice()` into `cores` chunks
 * - TypedArray args → `.subarray()` for zero-copy views
 * - Everything else → broadcast unchanged to every worker
 *
 * Returns an array of length `cores`, where each element is the arg list
 * for that worker.
 */
export const partitionArgs = (args: unknown[], cores: number): unknown[][] => {
  const perWorker: unknown[][] = Array.from({ length: cores }, () => []);

  for (const arg of args) {
    if (Array.isArray(arg)) {
      const chunks = splitArray(arg, cores);
      for (let w = 0; w < cores; w++) {
        perWorker[w].push(chunks[w]);
      }
    } else if (isTypedArray(arg)) {
      const chunks = splitTypedArray(arg, cores);
      for (let w = 0; w < cores; w++) {
        perWorker[w].push(chunks[w]);
      }
    } else {
      // Broadcast scalar/object to every worker
      for (let w = 0; w < cores; w++) {
        perWorker[w].push(arg);
      }
    }
  }

  return perWorker;
};

/** Split a plain Array into `n` roughly-equal chunks */
const splitArray = <T>(arr: T[], n: number): T[][] => {
  const len = arr.length;
  const base = Math.floor(len / n);
  const remainder = len % n;
  const chunks: T[][] = [];
  let offset = 0;

  for (let i = 0; i < n; i++) {
    const size = base + (i < remainder ? 1 : 0);
    chunks.push(arr.slice(offset, offset + size));
    offset += size;
  }
  return chunks;
};

/** Split a TypedArray into `n` subarray views (zero-copy) */
const splitTypedArray = (arr: TypedArray, n: number): TypedArray[] => {
  const len = arr.length;
  const base = Math.floor(len / n);
  const remainder = len % n;
  const chunks: TypedArray[] = [];
  let offset = 0;

  for (let i = 0; i < n; i++) {
    const size = base + (i < remainder ? 1 : 0);
    chunks.push(arr.subarray(offset, offset + size));
    offset += size;
  }
  return chunks;
};

/**
 * Determines whether the input should fall back to main-thread execution.
 * Returns true if the largest array/TypedArray arg has fewer than `threshold` elements.
 */
export const shouldFallback = (args: unknown[], threshold: number): boolean => {
  let maxLen = 0;
  for (const arg of args) {
    if (Array.isArray(arg)) {
      maxLen = Math.max(maxLen, arg.length);
    } else if (isTypedArray(arg)) {
      maxLen = Math.max(maxLen, arg.length);
    }
  }
  // If no arrays found at all, fall back (nothing to split)
  return maxLen < threshold;
};

/**
 * Collects ArrayBuffer references from TypedArray/ArrayBuffer args for
 * use as the `Transferable` list in `postMessage`.
 */
export const detectTransferables = (args: unknown[]): ArrayBuffer[] => {
  const buffers: ArrayBuffer[] = [];
  for (const arg of args) {
    if (arg instanceof ArrayBuffer) {
      buffers.push(arg);
    } else if (isTypedArray(arg)) {
      const ta = arg as TypedArray;
      // Only transfer standalone buffers; subarrays share a parent buffer
      // which cannot be transferred without detaching the whole thing.
      if (ta.byteOffset === 0 && ta.byteLength === ta.buffer.byteLength) {
        buffers.push(ta.buffer as ArrayBuffer);
      }
    }
  }
  return buffers;
};

/**
 * Returns the number of available CPU cores.
 * Browser: `navigator.hardwareConcurrency`
 * Node: `os.cpus().length`
 * Fallback: 4
 */
export const getCoreCount = (): number => {
  if (typeof navigator !== "undefined" && navigator.hardwareConcurrency) {
    return navigator.hardwareConcurrency;
  }
  try {
    // Dynamic require for Node.js — avoid static import for browser bundles
    const os = require("node:os");
    return os.cpus().length;
  } catch {
    return 4;
  }
};
