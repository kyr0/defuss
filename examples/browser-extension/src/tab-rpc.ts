import { db } from "./lib/content-script";
import { createWorkerRpcClient } from "./lib/rpc";
import type { WorkerRpcApi } from "./worker-rpc";
import { executeTool } from "./lib/content-script/tool-registry";
import "./tab-tools"; // register all content-script tools
import type { WorkItemType, WorkItemResult } from "./types";

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

  /** Execute a registered content-script tool by type */
  async executeTool(
    type: WorkItemType,
    data: unknown,
  ): Promise<WorkItemResult> {
    return executeTool(type, data);
  },
};

export type TabRpcApi = typeof TabRpc;
