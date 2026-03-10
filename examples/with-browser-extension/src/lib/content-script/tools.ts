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
  return new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0)),
  );
}

/** Signal the MAIN-world preload to hide the automation border */
export function hideAutomationBorder(): void {
  postBorderAction("border_hide");
}

/** Signal the MAIN-world preload to switch the border to error state */
export function showErrorBorder(): void {
  postBorderAction("border_error");
}

export interface WaitForDomStableOptions {
  /** CSS selector to scope observation to a subtree (default: entire document) */
  selector?: string;
  /** Duration in ms with zero mutations before the DOM is considered stable */
  quietPeriodMs?: number;
  /** Maximum time in ms to wait for stability before giving up */
  timeoutMs?: number;
  /** Internal polling interval in ms */
  checkIntervalMs?: number;
}

/**
 * Wait until the DOM is stable (no mutations for a quiet period).
 *
 * When `selector` is provided, a dedicated MutationObserver watches only
 * that subtree. Otherwise, listens to the whole-page
 * `__defuss_ext_dom_mutations` CustomEvent from the MAIN-world preload.
 */
export function waitForDomStable({
  selector,
  quietPeriodMs = 1_000,
  timeoutMs = 15_000,
  checkIntervalMs = 200,
}: WaitForDomStableOptions = {}): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let lastActivityTime = Date.now();
    let settled = false;

    let subtreeObserver: MutationObserver | undefined;
    let eventListener: EventListener | undefined;

    const target = selector ? document.querySelector(selector) : null;

    if (selector && !target) {
      // Element doesn't exist (yet) — resolve immediately
      resolve();
      return;
    }

    if (target) {
      // Scoped: observe only the selected subtree
      subtreeObserver = new MutationObserver((mutations) => {
        if (mutations.length > 0) {
          lastActivityTime = Date.now();
        }
      });
      subtreeObserver.observe(target, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
      });
    } else {
      // Whole-page: use the MAIN-world preload event
      eventListener = ((event: CustomEvent<{ count: number }>) => {
        if (event.detail.count > 0) {
          lastActivityTime = Date.now();
        }
      }) as EventListener;
      document.addEventListener("__defuss_ext_dom_mutations", eventListener);
    }

    const cleanup = () => {
      settled = true;
      subtreeObserver?.disconnect();
      if (eventListener) {
        document.removeEventListener(
          "__defuss_ext_dom_mutations",
          eventListener,
        );
      }
      clearInterval(checkInterval);
      clearTimeout(timeout);
    };

    const checkInterval = setInterval(() => {
      if (settled) return;
      if (Date.now() - lastActivityTime >= quietPeriodMs) {
        cleanup();
        resolve();
      }
    }, checkIntervalMs);

    const timeout = setTimeout(() => {
      if (settled) return;
      cleanup();
      reject(new Error(`DOM did not stabilise within ${timeoutMs}ms`));
    }, timeoutMs);
  });
}
