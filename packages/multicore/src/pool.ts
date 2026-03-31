import type {
  PoolConfig,
  WorkerHandle,
  WorkerPool,
  WorkerResultMessage,
  WorkerErrorMessage,
} from "./types.js";
import { getCoreCount } from "./partition.js";

const DEFAULT_IDLE_TIMEOUT_MS = 30_000;

/** Pending task waiting for a free worker */
interface QueuedTask {
  args: unknown[];
  transfer?: ArrayBuffer[];
  signal?: AbortSignal;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

/**
 * Creates an abstract worker pool. Platform-specific backends (browser / node)
 * provide the `createWorker`, `postMessage`, and `terminateWorker` hooks.
 */
export const createPool = (
  script: string,
  config: PoolConfig,
  hooks: PoolHooks,
): WorkerPool => {
  const maxWorkers = config.maxWorkers ?? getCoreCount();
  const idleTimeoutMs = config.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS;
  const workers: WorkerHandle[] = [];
  const queue: QueuedTask[] = [];
  let nextId = 0;
  let taskCounter = 0;

  /** Pending tasks keyed by message id */
  const pending = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: unknown) => void }
  >();

  const onMessage = (handle: WorkerHandle, data: WorkerResultMessage | WorkerErrorMessage) => {
    const p = pending.get(data.id);
    if (!p) return;
    pending.delete(data.id);

    handle.busy = false;
    resetIdleTimer(handle);
    drainQueue();

    if (data.type === "result") {
      p.resolve(data.value);
    } else {
      const err = new Error(data.error);
      if (data.stack) err.stack = data.stack;
      p.reject(err);
    }
  };

  const onError = (handle: WorkerHandle, error: unknown) => {
    // Reject all pending tasks on this worker
    for (const [id, p] of pending) {
      p.reject(error instanceof Error ? error : new Error(String(error)));
      pending.delete(id);
    }
    handle.busy = false;
    handle.terminated = true;
  };

  const spawnWorker = (): WorkerHandle => {
    const id = nextId++;
    const raw = hooks.createWorker(script, id);
    const handle: WorkerHandle = { id, busy: false, terminated: false, raw };

    hooks.onMessage(raw, (data) => onMessage(handle, data));
    hooks.onError(raw, (err) => onError(handle, err));

    workers.push(handle);
    resetIdleTimer(handle);
    return handle;
  };

  const resetIdleTimer = (handle: WorkerHandle) => {
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    handle.idleTimer = setTimeout(() => {
      if (!handle.busy && !handle.terminated) {
        handle.terminated = true;
        hooks.terminateWorker(handle.raw);
        const idx = workers.indexOf(handle);
        if (idx !== -1) workers.splice(idx, 1);
      }
    }, idleTimeoutMs);
  };

  const getIdleWorker = (): WorkerHandle | undefined =>
    workers.find((w) => !w.busy && !w.terminated);

  const drainQueue = () => {
    while (queue.length > 0) {
      const idle = getIdleWorker();
      if (!idle) {
        // If we can still spawn more workers, do so
        if (workers.length < maxWorkers) {
          const fresh = spawnWorker();
          const task = queue.shift()!;
          dispatch(fresh, task);
        }
        break;
      }
      const task = queue.shift()!;
      dispatch(idle, task);
    }
  };

  const dispatch = (handle: WorkerHandle, task: QueuedTask) => {
    const id = `t${taskCounter++}`;
    handle.busy = true;
    if (handle.idleTimer) clearTimeout(handle.idleTimer);
    pending.set(id, { resolve: task.resolve, reject: task.reject });

    // AbortSignal: if already aborted, reject immediately
    if (task.signal?.aborted) {
      pending.delete(id);
      handle.busy = false;
      resetIdleTimer(handle);
      task.reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }

    // Wire up abort listener
    if (task.signal) {
      const onAbort = () => {
        const p = pending.get(id);
        if (p) {
          pending.delete(id);
          // Terminate + respawn the worker
          handle.terminated = true;
          hooks.terminateWorker(handle.raw);
          if (handle.idleTimer) clearTimeout(handle.idleTimer);
          const idx = workers.indexOf(handle);
          if (idx !== -1) workers.splice(idx, 1);
          p.reject(new DOMException("The operation was aborted.", "AbortError"));
        }
      };
      task.signal.addEventListener("abort", onAbort, { once: true });
    }

    hooks.postMessage(
      handle.raw,
      { type: "execute", id, args: task.args },
      task.transfer ?? [],
    );
  };

  const pool: WorkerPool = {
    get size() {
      return maxWorkers;
    },

    execute(args: unknown[], transfer?: ArrayBuffer[], signal?: AbortSignal): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const task: QueuedTask = { args, transfer, signal, resolve, reject };
        const idle = getIdleWorker();

        if (idle) {
          dispatch(idle, task);
        } else if (workers.length < maxWorkers) {
          const fresh = spawnWorker();
          dispatch(fresh, task);
        } else {
          queue.push(task);
        }
      });
    },

    warmup(count?: number) {
      const target = Math.min(count ?? maxWorkers, maxWorkers);
      while (workers.length < target) {
        spawnWorker();
      }
    },

    async terminate() {
      for (const w of workers) {
        if (!w.terminated) {
          w.terminated = true;
          if (w.idleTimer) clearTimeout(w.idleTimer);
          hooks.terminateWorker(w.raw);
        }
      }
      workers.length = 0;
      // Reject any queued tasks
      for (const task of queue) {
        task.reject(new Error("Pool terminated"));
      }
      queue.length = 0;
      // Reject any pending tasks
      for (const [, p] of pending) {
        p.reject(new Error("Pool terminated"));
      }
      pending.clear();
    },
  };

  return pool;
};

/** Platform hooks that browser/node implementations must provide */
export interface PoolHooks {
  createWorker(script: string, id: number): unknown;
  postMessage(worker: unknown, data: unknown, transfer: ArrayBuffer[]): void;
  terminateWorker(worker: unknown): void;
  onMessage(worker: unknown, handler: (data: any) => void): void;
  onError(worker: unknown, handler: (error: unknown) => void): void;
}
