/** Shared utilities for worker-side tool implementations */

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
