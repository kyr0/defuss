declare const self: ServiceWorkerGlobalScope;

import { registerRpc } from "./lib/rpc";
import { WorkerRpc } from "./worker-rpc";
import config from "../config";

// Register the worker's RPC endpoint — this installs the chrome.runtime.onMessage listener
registerRpc("WorkerRpc", WorkerRpc);

// Poll for new work items
setInterval(async () => {
  try {
    const items = await WorkerRpc.getWorkItems();
    console.log(`[worker] polled ${items.length} work item(s):`, items);
  } catch (err) {
    console.warn("[worker] work item poll failed:", err);
  }
}, config.serverTaskPollingIntervalMs);
