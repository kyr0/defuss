import { registerRpc } from "./lib/rpc";
import { TabRpc } from "./tab-rpc";

// Register content-script RPC endpoint
registerRpc("TabRpc", TabRpc);

// Bridge MAIN-world CustomEvents to TabRpc methods
document.addEventListener("__defuss_ext_input", ((event: CustomEvent) => {
  TabRpc.onCapturedInput(event.detail);
}) as EventListener);

document.addEventListener("__defuss_ext_click", ((event: CustomEvent) => {
  TabRpc.onCapturedClick(event.detail);
}) as EventListener);

document.addEventListener("__defuss_ext_dom_mutations", ((
  event: CustomEvent,
) => {
  const { count, url } = event.detail;
  console.log(`[tab] ${count} DOM mutations in the last 5s on ${url}`);
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
