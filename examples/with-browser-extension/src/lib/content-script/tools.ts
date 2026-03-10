/** Shared utilities for content-script-side tool implementations */

/** Wait for at least one of the given selectors to appear in the DOM */
export function waitForSelector(
  selectors: string[],
  timeoutMs = 10_000,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const check = (): Element | null => {
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      return null;
    };

    // Initial check
    const found = check();
    if (found) {
      resolve(found);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = check();
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

/** Send a border control message to the MAIN-world preload via postMessage */
function postBorderAction(action: string): void {
  console.log(`[defuss-tools] posting border action: ${action}`);
  window.postMessage({ __defuss: true, action }, "*");
}

/**
 * Signal the MAIN-world preload to show the automation border.
 * Returns a promise that resolves after a paint frame so the border
 * is visible before the caller continues (prevents show→hide race).
 */
export function showAutomationBorder(): Promise<void> {
  postBorderAction("border_show");
  // Wait for next animation frame + microtask so the browser paints the border
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

/** Signal the MAIN-world preload to hide the automation border */
export function hideAutomationBorder(): void {
  postBorderAction("border_hide");
}

/** Signal the MAIN-world preload to switch the border to error state */
export function showErrorBorder(): void {
  postBorderAction("border_error");
}
