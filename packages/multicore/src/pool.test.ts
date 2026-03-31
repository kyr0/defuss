import { describe, it, expect, vi, afterEach } from "vitest";
import { createPool, type PoolHooks } from "./pool.js";

// --- Mock worker infrastructure -------------------------------------

interface MockWorker {
  id: number;
  messageHandler?: (data: any) => void;
  errorHandler?: (error: unknown) => void;
  terminated: boolean;
  lastMessage?: any;
}

const createMockHooks = (workers: MockWorker[]): PoolHooks => ({
  createWorker(_script: string, id: number): MockWorker {
    const w: MockWorker = { id, terminated: false };
    workers.push(w);
    return w;
  },
  postMessage(worker: unknown, data: unknown, _transfer: ArrayBuffer[]): void {
    const w = worker as MockWorker;
    w.lastMessage = data;
    // Simulate immediate success for testing
  },
  terminateWorker(worker: unknown): void {
    (worker as MockWorker).terminated = true;
  },
  onMessage(worker: unknown, handler: (data: any) => void): void {
    (worker as MockWorker).messageHandler = handler;
  },
  onError(worker: unknown, handler: (error: unknown) => void): void {
    (worker as MockWorker).errorHandler = handler;
  },
});

// Simulate a worker completing its task
const simulateResult = (worker: MockWorker, value: unknown) => {
  const id = worker.lastMessage?.id;
  if (id && worker.messageHandler) {
    worker.messageHandler({ type: "result", id, value });
  }
};

const simulateError = (worker: MockWorker, error: string) => {
  const id = worker.lastMessage?.id;
  if (id && worker.messageHandler) {
    worker.messageHandler({ type: "error", id, error });
  }
};

// --- createPool -----------------------------------------------------

describe("createPool", () => {
  it("creates a pool with correct size", () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));
    expect(pool.size).toBe(4);
  });

  it("spawns a worker on first execute", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));

    const promise = pool.execute([1, 2, 3]);
    expect(workers.length).toBe(1);

    // Resolve it
    simulateResult(workers[0], 42);
    const result = await promise;
    expect(result).toBe(42);
  });

  it("reuses idle workers", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));

    // First task
    const p1 = pool.execute([1]);
    expect(workers.length).toBe(1);
    simulateResult(workers[0], "a");
    await p1;

    // Second task should reuse same worker, not spawn new
    const p2 = pool.execute([2]);
    expect(workers.length).toBe(1); // still 1 worker
    simulateResult(workers[0], "b");
    const r2 = await p2;
    expect(r2).toBe("b");
  });

  it("spawns multiple workers for concurrent tasks", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));

    const p1 = pool.execute([1]);
    const p2 = pool.execute([2]);
    const p3 = pool.execute([3]);

    expect(workers.length).toBe(3); // 3 concurrent tasks => 3 workers

    simulateResult(workers[0], "a");
    simulateResult(workers[1], "b");
    simulateResult(workers[2], "c");

    expect(await p1).toBe("a");
    expect(await p2).toBe("b");
    expect(await p3).toBe("c");
  });

  it("respects maxWorkers and queues excess tasks", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    const p1 = pool.execute([1]);
    const p2 = pool.execute([2]);
    const p3 = pool.execute([3]); // should be queued

    expect(workers.length).toBe(2); // max 2

    // Complete first task => queued task should be dispatched
    simulateResult(workers[0], "a");
    expect(await p1).toBe("a");

    // Worker 0 should now have the queued task
    simulateResult(workers[0], "c");
    simulateResult(workers[1], "b");

    expect(await p2).toBe("b");
    expect(await p3).toBe("c");
  });

  it("rejects promise on worker error", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    const p1 = pool.execute([1]);
    simulateError(workers[0], "Something went wrong");

    await expect(p1).rejects.toThrow("Something went wrong");
  });

  it("rejects immediately when signal is already aborted", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    const controller = new AbortController();
    controller.abort();

    const p1 = pool.execute([1], undefined, controller.signal);
    await expect(p1).rejects.toThrow("aborted");
  });

  it("rejects when signal is aborted during execution", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    const controller = new AbortController();
    const p1 = pool.execute([1], undefined, controller.signal);

    // Abort mid-flight
    controller.abort();

    await expect(p1).rejects.toThrow("aborted");
    // Worker should have been terminated
    expect(workers[0].terminated).toBe(true);
  });

  // --- warmup -----------------------------------------------------

  it("warmup pre-spawns workers", () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));

    expect(workers.length).toBe(0);
    pool.warmup(3);
    expect(workers.length).toBe(3);
  });

  it("warmup does not exceed maxWorkers", () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    pool.warmup(10);
    expect(workers.length).toBe(2);
  });

  // --- terminate ----------------------------------------------------

  it("terminate kills all workers", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 4 }, createMockHooks(workers));

    pool.warmup(3);
    expect(workers.length).toBe(3);

    await pool.terminate();
    for (const w of workers) {
      expect(w.terminated).toBe(true);
    }
  });

  it("terminate rejects queued tasks", async () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 1 }, createMockHooks(workers));

    const p1 = pool.execute([1]); // gets dispatched
    const p2 = pool.execute([2]); // gets queued (only 1 worker)

    await pool.terminate();

    await expect(p1).rejects.toThrow("terminated");
    await expect(p2).rejects.toThrow("terminated");
  });

  // --- task message format ------------------------------------------

  it("sends execute message with correct format", () => {
    const workers: MockWorker[] = [];
    const pool = createPool("script", { maxWorkers: 2 }, createMockHooks(workers));

    pool.execute([1, 2, 3]);

    const msg = workers[0].lastMessage;
    expect(msg.type).toBe("execute");
    expect(msg.id).toBeDefined();
    expect(msg.args).toEqual([1, 2, 3]);
  });
});
