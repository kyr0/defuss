import { db } from "./lib/content-script";
import { createWorkerRpcClient } from "./lib/rpc";
import type { WorkerRpcApi } from "./worker-rpc";

// RPC client to call the worker
type WorkerRpc = { WorkerRpc: WorkerRpcApi };
let rpc: WorkerRpc;
const rpcReady = createWorkerRpcClient<WorkerRpc>().then((client) => {
  rpc = client;
});

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
    rpcReady.then(() => rpc.WorkerRpc.onCapturedEvent("input", detail));
  },

  /** Handle a captured click event from the MAIN-world prehook */
  onCapturedClick(detail: Record<string, unknown>): void {
    // Forward to worker + popup
    rpcReady.then(() => rpc.WorkerRpc.onCapturedEvent("click", detail));
  },
};

export type TabRpcApi = typeof TabRpc;
