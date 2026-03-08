declare const self: ServiceWorkerGlobalScope;

import { registerRpc } from "./lib/rpc";
import { WorkerRpc } from "./worker-rpc";

// Register the worker's RPC endpoint — this installs the chrome.runtime.onMessage listener
registerRpc("WorkerRpc", WorkerRpc);
