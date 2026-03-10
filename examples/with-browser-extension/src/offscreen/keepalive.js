/**
 * Offscreen keepalive script.
 *
 * Keeps the service worker alive by:
 * 1. Maintaining a persistent chrome.runtime.connect() port.
 * 2. Sending a periodic ping via chrome.runtime.sendMessage() every 20s
 *    to reset Chrome's 30-second idle termination timer.
 */

const PORT_NAME = "__defuss_keepalive";
const RECONNECT_DELAY_MS = 1_000;
const PING_INTERVAL_MS = 20_000;

function connect() {
  const port = chrome.runtime.connect({ name: PORT_NAME });

  port.onDisconnect.addListener(() => {
    // Worker was terminated or restarted — reconnect after a short delay
    setTimeout(connect, RECONNECT_DELAY_MS);
  });
}

connect();

// Periodic ping — each sendMessage resets Chrome's idle timer
setInterval(() => {
  chrome.runtime.sendMessage({ action: "__keepalive_ping" }).catch(() => {});
}, PING_INTERVAL_MS);
