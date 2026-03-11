declare const self: ServiceWorkerGlobalScope;

import { registerRpc } from "./lib/rpc";
import { WorkerRpc } from "./worker-rpc";
import { WorkItemScheduler } from "./lib/worker/work-item-scheduler";
import { GoogleSearchWorkerTool } from "./tools/google-search";
import { ArztSucheWorkerTool } from "./tools/116117-arztsuche";
import { startKeepalive } from "./lib/worker/keepalive";
import config from "../config";

// Keep the service worker alive via an offscreen document + persistent port
startKeepalive();

// Register the worker's RPC endpoint — this installs the chrome.runtime.onMessage listener
registerRpc("WorkerRpc", WorkerRpc);

// Set up the work-item scheduler with registered tools
const scheduler = new WorkItemScheduler();
scheduler.register(GoogleSearchWorkerTool);
scheduler.register(ArztSucheWorkerTool);
scheduler.start(config.serverTaskPollingIntervalMs);
