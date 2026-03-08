import { db } from "./lib/content-script";
import type { ContentScriptFnName } from "./lib/content-script";

// -- Typed function registry for functions callable from popup/worker --
const fnRegistry: Record<ContentScriptFnName, (...args: any[]) => any> = {
  showAlert: (message: string) => {
    alert(message);
  },
};

// Expose on globalThis so they can be referenced directly
(globalThis as any).runFnInActiveTab = (fnName: ContentScriptFnName, ...args: any[]) => {
  const fn = fnRegistry[fnName];
  if (fn) return fn(...args);
  console.warn(`[defuss-ext] Unknown fn: ${fnName}`);
};

for (const [name, fn] of Object.entries(fnRegistry)) {
  (globalThis as any)[name] = fn;
}

// Listen for run-fn messages from the background worker
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === "run-fn") {
    const fn = fnRegistry[request.fnName as ContentScriptFnName];
    if (fn) {
      try {
        const result = fn(...(request.args || []));
        sendResponse({ success: true, result });
      } catch (error: any) {
        sendResponse({ success: false, error: error.message });
      }
    } else {
      sendResponse({ success: false, error: `Unknown fn: ${request.fnName}` });
    }
    return true;
  }
});

// Listen for input events forwarded from the MAIN-world prehook via CustomEvent
document.addEventListener("__defuss_ext_input", ((event: CustomEvent) => {
  const { tagName, name, value, url } = event.detail;

  // Persist captured input via defuss-db through the worker
  const inputDb = db<string>(`input:${url}:${name}`);
  inputDb.set(value);
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
