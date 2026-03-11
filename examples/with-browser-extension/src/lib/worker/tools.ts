/** Shared utilities for worker-side tool implementations */

import { createTabRpcClient } from "../rpc";
import type { TabRpcApi } from "../../tab-rpc";

/** Wait for a tab to finish loading (status === "complete") */
export function waitForTabLoad(
  tabId: number,
  timeoutMs = 30_000,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(
        new Error(`Tab ${tabId} did not finish loading within ${timeoutMs}ms`),
      );
    }, timeoutMs);

    function listener(
      updatedTabId: number,
      changeInfo: chrome.tabs.OnUpdatedInfo,
    ) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Wait for the content script's RPC listener to be ready in a tab.
 *
 * After `waitForTabLoad` resolves the page is loaded, but the content
 * script (injected at `document_idle`) may not have registered its
 * `chrome.runtime.onMessage` listener yet. This helper retries the
 * RPC schema handshake until the content script responds.
 */
export async function waitForContentScript(
  tabId: number,
  {
    timeoutMs = 10_000,
    intervalMs = 500,
  }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ TabRpc: TabRpcApi }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const rpc = await createTabRpcClient<{ TabRpc: TabRpcApi }>(tabId);
      return rpc;
    } catch {
      // Content script not ready yet — wait and retry
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  throw new Error(
    `Content script in tab ${tabId} did not respond within ${timeoutMs}ms`,
  );
}
