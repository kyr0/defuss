import type { PoolConfig, WorkerPool } from "./types.js";
import { createPool, type PoolHooks } from "./pool.js";
import { createRequire } from "node:module";

/**
 * Creates a worker_threads pool for Node.js.
 * Workers execute the serialized script via `eval: true`.
 */
export const createNodePool = (script: string, config?: PoolConfig): WorkerPool => {
  // Dynamic import to avoid bundling node:worker_threads in browser builds
  let WorkerClass: any;
  try {
    const _require = createRequire(import.meta.url);
    WorkerClass = _require("node:worker_threads").Worker;
  } catch {
    throw new Error(
      "[defuss-multicore] node:worker_threads not available. Are you running in Node.js?",
    );
  }

  const hooks: PoolHooks = {
    createWorker(script: string): unknown {
      return new WorkerClass(script, { eval: true });
    },

    postMessage(worker: unknown, data: unknown, transfer: ArrayBuffer[]): void {
      (worker as any).postMessage(data, transfer);
    },

    terminateWorker(worker: unknown): void {
      (worker as any).terminate();
    },

    onMessage(worker: unknown, handler: (data: any) => void): void {
      (worker as any).on("message", handler);
    },

    onError(worker: unknown, handler: (error: unknown) => void): void {
      (worker as any).on("error", handler);
    },
  };

  return createPool(script, config ?? {}, hooks);
};
