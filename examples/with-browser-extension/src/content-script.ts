import { db } from "./lib/content-script";
import { registerRpc, createWorkerRpcClient } from "./lib/rpc";
import { TabRpc } from "./tab-rpc";
import type { WorkerRpcApi } from "./worker-rpc";

// Register content-script RPC endpoint
registerRpc("TabRpc", TabRpc);

// RPC client to call the worker
type WorkerRpc = { WorkerRpc: WorkerRpcApi };
let rpc: WorkerRpc;
const rpcReady = createWorkerRpcClient<WorkerRpc>().then((client) => {
  rpc = client;
});

// Listen for input events forwarded from the MAIN-world prehook via CustomEvent
document.addEventListener("__defuss_ext_input", ((event: CustomEvent) => {
  const { name, value, url } = event.detail;

  // Persist captured input via defuss-db through the worker
  const inputDb = db<string>(`input:${url}:${name}`);
  inputDb.set(value);

  // Notify worker + popup via RPC
  rpcReady.then(() =>
    rpc.WorkerRpc.onCapturedEvent("input", event.detail),
  );
}) as EventListener);

// Listen for click events forwarded from the MAIN-world prehook via CustomEvent
document.addEventListener("__defuss_ext_click", ((event: CustomEvent) => {
  rpcReady.then(() =>
    rpc.WorkerRpc.onCapturedEvent("click", event.detail),
  );
}) as EventListener);

function init() {
  console.log(
    "defuss-extension content script initialized",
    document.location.href,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
