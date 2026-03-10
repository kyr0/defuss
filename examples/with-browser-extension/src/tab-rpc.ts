import { db } from "./lib/content-script";
import { createWorkerRpcClient } from "./lib/rpc";
import type { WorkerRpcApi } from "./worker-rpc";
import { executeGoogleSearch } from "./tools/google-search";
import type { WorkItemResult } from "./types";

// RPC client to call the worker
type WorkerRpc = { WorkerRpc: WorkerRpcApi };
const rpc = await createWorkerRpcClient<WorkerRpc>();
const { WorkerRpc } = rpc;

/** Content-script RPC methods callable from the worker (and indirectly from popup) */
export const TabRpc = {
  showAlert(message: string): void {
    alert(message);
  },

  /** Handle a captured input event from the MAIN-world prehook */
  onCapturedInput(detail: { name: string; value: string; url: string }): void {
    // Persist captured input via defuss-db through the worker
    const inputDb = db<string>(`input:${detail.url}:${detail.name}`);
    inputDb.set(detail.value);

    // Forward to worker + popup
    WorkerRpc.onCapturedEvent("input", detail);
  },

  /** Handle a captured click event from the MAIN-world prehook */
  onCapturedClick(detail: Record<string, unknown>): void {
    // Forward to worker + popup
    WorkerRpc.onCapturedEvent("click", detail);
  },

  /** Execute Google Search DOM extraction (called by the worker via tab RPC) */
  async executeGoogleSearch(data: {
    topK?: number;
    ai_summary?: boolean;
  }): Promise<WorkItemResult<string>> {
    return executeGoogleSearch(data);
  },
};

export type TabRpcApi = typeof TabRpc;
