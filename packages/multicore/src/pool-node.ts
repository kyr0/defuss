import type { PoolConfig, WorkerPool } from "./types.js";
import { createPool, type PoolHooks } from "./pool.js";

/**
 * Creates a worker_threads pool for Node.js.
 * Workers execute the serialized script via `eval: true`.
 */
export const createNodePool = (
  script: string,
  WorkerClass: any,
  config?: PoolConfig,
): WorkerPool => {
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
