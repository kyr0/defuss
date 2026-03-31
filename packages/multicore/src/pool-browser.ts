import type { PoolConfig, WorkerPool } from "./types.js";
import { createPool, type PoolHooks } from "./pool.js";

/**
 * Creates a Web Worker pool using Blob URLs.
 * Workers are created from serialized function strings — no separate file needed.
 */
export const createBrowserPool = (script: string, config?: PoolConfig): WorkerPool => {
  const blobUrls = new Set<string>();

  const hooks: PoolHooks = {
    createWorker(script: string): Worker {
      const blob = new Blob([script], { type: "text/javascript" });
      const url = URL.createObjectURL(blob);
      blobUrls.add(url);
      return new Worker(url);
    },

    postMessage(worker: unknown, data: unknown, transfer: ArrayBuffer[]): void {
      (worker as Worker).postMessage(data, transfer);
    },

    terminateWorker(worker: unknown): void {
      (worker as Worker).terminate();
    },

    onMessage(worker: unknown, handler: (data: any) => void): void {
      (worker as Worker).onmessage = (e: MessageEvent) => handler(e.data);
    },

    onError(worker: unknown, handler: (error: unknown) => void): void {
      (worker as Worker).onerror = (e: ErrorEvent) => {
        e.preventDefault();
        handler(new Error(e.message));
      };
    },
  };

  const pool = createPool(script, config ?? {}, hooks);

  // Wrap terminate to also revoke blob URLs
  const originalTerminate = pool.terminate.bind(pool);
  (pool as any).terminate = async () => {
    await originalTerminate();
    for (const url of blobUrls) {
      URL.revokeObjectURL(url);
    }
    blobUrls.clear();
  };

  return pool;
};
