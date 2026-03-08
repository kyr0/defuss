import { db, runCommand } from "./lib/content-script";

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log("DOM changed:", mutation);
  });
});

observer.observe(document.documentElement, {
  attributes: true,
});

// Listen for input events forwarded from the MAIN-world prehook via CustomEvent
document.addEventListener("__defuss_ext_input", ((event: CustomEvent) => {
  const { tagName, name, value, url } = event.detail;
  console.log("[defuss-ext] Captured input:", { tagName, name, value, url });

  // Persist captured input via defuss-db through the worker
  const inputDb = db<string>(`input:${url}:${name}`);
  inputDb.set(value);

  // Relay to background service worker via runCommand
  runCommand("captured-input", [{ tagName, name, value, url }]);
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
