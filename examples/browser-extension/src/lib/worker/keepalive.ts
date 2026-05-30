/**
 * Worker-side keepalive: creates an offscreen document that holds a
 * persistent port to prevent the service worker from going inactive.
 *
 * Call `startKeepalive()` once during worker initialisation.
 */

const OFFSCREEN_URL = "src/offscreen/keepalive.html";
const PORT_NAME = "__defuss_keepalive";

let offscreenReady = false;

/** Ensure the offscreen document exists (idempotent). */
async function ensureOffscreen(): Promise<void> {
  if (offscreenReady) return;

  // Check if already exists (e.g. after a non-fatal restart)
  const contexts = await (chrome.runtime as any).getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)],
  });

  if (contexts.length > 0) {
    offscreenReady = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    // WORKERS is closest valid reason; it prevents the SW from sleeping
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Keep service worker alive via persistent port",
  });

  offscreenReady = true;
}

/**
 * Start the keepalive mechanism.
 *
 * - Creates an offscreen document that connects back via a port.
 * - Listens for the port and keeps it alive (onConnect).
 * - If the offscreen doc disconnects, re-creates it.
 */
export function startKeepalive(): void {
  // Accept incoming keepalive ports
  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== PORT_NAME) return;

    console.log("[keepalive] offscreen connected");

    port.onDisconnect.addListener(() => {
      console.log("[keepalive] offscreen disconnected — recreating");
      offscreenReady = false;
      ensureOffscreen().catch((err) =>
        console.warn("[keepalive] failed to recreate offscreen:", err),
      );
    });
  });

  // Handle keepalive pings from the offscreen document (resets idle timer)
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === "__keepalive_ping") {
      sendResponse(true);
      return true;
    }
    return false;
  });

  // Boot the offscreen document
  ensureOffscreen().catch((err) =>
    console.warn("[keepalive] initial setup failed:", err),
  );
}
