import { createRpcServer } from "defuss-rpc/server.js";
import { ExpressRpcServer } from "defuss-rpc/express-server.js";
import type { WorkItem, WorkItemResult } from "./src/types.js";
import config from "./config.js";

// -- Work item queue (in-memory) --

/** Items waiting to be picked up by the extension */
const pendingItems = new Map<string, WorkItem>();

/** Completed items with their results */
const completedItems = new Map<string, WorkItem & { completedAt: number }>();

/** Seed the queue with initial work items */
export function enqueueWorkItem(item: Omit<WorkItem, "id">): WorkItem {
  const id = crypto.randomUUID();
  const workItem: WorkItem = { id, ...item };
  pendingItems.set(id, workItem);
  console.log(`[server] enqueued work item ${id} (type: ${item.type})`);
  return workItem;
}

// -- RPC API --
const WorkApi = {
  /** Return only pending (not-yet-completed) work items */
  async getWorkItems(): Promise<Array<WorkItem>> {
    return Array.from(pendingItems.values());
  },

  /** Receive a processed work item result from the extension */
  async submitWorkItemResult(
    id: string,
    result: WorkItemResult,
  ): Promise<void> {
    if (result.success) {
      const item = pendingItems.get(id);
      if (item) {
        pendingItems.delete(id);
        completedItems.set(id, {
          ...item,
          result: result.result,
          success: true,
          completedAt: Date.now(),
        });
        console.log(
          `[server] work item ${id} completed successfully (${pendingItems.size} pending, ${completedItems.size} done)`,
        );
      } else {
        console.warn(
          `[server] received result for unknown/already-completed item ${id}`,
        );
      }
    } else {
      console.warn(`[server] work item ${id} failed:`, result.error);
      // Failed items stay in pendingItems so they can be retried
    }
  },

  /** Enqueue a new work item (callable via RPC for external orchestration) */
  async enqueue(item: Omit<WorkItem, "id">): Promise<WorkItem> {
    return enqueueWorkItem(item);
  },
};

const RpcApi = { JobApi: WorkApi };
createRpcServer(RpcApi);

export type ServerRpcApi = typeof RpcApi;

// -- Start server --
const port = Number(new URL(config.serverEndpoint).port) || 3210;
const server = new ExpressRpcServer({ port });
await server.start();

// --- Static Use Case ---

// Seed demo items
enqueueWorkItem({
  type: "google_search",
  payload: { query: "defuss framework" },
  // open in background and close tab
});
enqueueWorkItem({
  type: "google_search",
  payload: {
    query: "browser extension RPC",
    ai_summary: true,
  },
  // open in foreground and keep tab open for debugging
  options: { focusAutomation: true, closeTab: false },
});
