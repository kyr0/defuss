/**
 * Tab preload script (runs at document_start in MAIN world).
 *
 * - Intercepts fetch + XHR network requests (patched FIRST, before anything).
 * - Injects early DOM modifications (e.g. styles) before the page renders.
 * - Intercepts input/click events and forwards them to the ISOLATED-world
 *   content script via CustomEvents (MAIN world has no chrome.runtime access).
 */

// =========================================================================
// Network interception — MUST be the very first thing that runs.
// Patches fetch + XHR before the page's own scripts can cache references.
// Interceptors are registered later via postMessage from the content script.
// =========================================================================

const networkInterceptors = new Map<
  string,
  { urlPattern: string; requestId: string }
>();

// --- fetch monkey-patch ---
const originalFetch = window.fetch.bind(window);

window.fetch = async function (...args: Parameters<typeof fetch>) {
  const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
  console.log(`[defuss-net] fetch: ${url}`);

  const response = await originalFetch(...args);
  notifyInterceptors("fetch", url, response.status, () =>
    response.clone().text(),
  );
  return response;
};

// --- XHR monkey-patch ---
const OriginalXHR = window.XMLHttpRequest;
const originalXHROpen = OriginalXHR.prototype.open;
const originalXHRSend = OriginalXHR.prototype.send;

OriginalXHR.prototype.open = function (
  this: XMLHttpRequest,
  method: string,
  url: string | URL,
  ...rest: unknown[]
) {
  const resolvedUrl = String(url);
  (this as unknown as Record<string, unknown>).__defuss_url = resolvedUrl;
  (this as unknown as Record<string, unknown>).__defuss_method = method;
  console.log(`[defuss-net] xhr.open: ${method} ${resolvedUrl}`);
  return (originalXHROpen as Function).call(this, method, url, ...rest);
};

OriginalXHR.prototype.send = function (
  this: XMLHttpRequest,
  ...args: unknown[]
) {
  const xhrUrl = (this as unknown as Record<string, string>).__defuss_url;
  const xhrMethod = (this as unknown as Record<string, string>).__defuss_method;
  console.log(`[defuss-net] xhr.send: ${xhrMethod} ${xhrUrl}`);

  if (xhrUrl) {
    this.addEventListener("load", function () {
      console.log(
        `[defuss-net] xhr.load: ${xhrMethod} ${xhrUrl} (${this.status}), interceptors: ${networkInterceptors.size}`,
      );
      notifyInterceptors("xhr", xhrUrl, this.status, () =>
        Promise.resolve(this.responseText),
      );
    });
  }

  return (originalXHRSend as Function).call(this, ...args);
};

/** Normalize a URL to its pathname, always starting with / */
function toNormalizedPath(raw: string): string {
  try {
    return new URL(raw, location.href).pathname;
  } catch {
    // Fallback: ensure leading slash
    return raw.startsWith("/") ? raw : `/${raw}`;
  }
}

/** Shared helper: check all registered interceptors and post matching results */
function notifyInterceptors(
  source: string,
  url: string,
  status: number,
  getText: () => Promise<string>,
): void {
  if (networkInterceptors.size === 0) return;

  const urlPath = toNormalizedPath(url);
  console.log(
    `[defuss-net] checking ${networkInterceptors.size} interceptor(s) against ${source} ${url} (path: ${urlPath})`,
  );

  for (const [requestId, interceptor] of networkInterceptors) {
    const patternPath = toNormalizedPath(interceptor.urlPattern);
    const matches = urlPath.startsWith(patternPath);
    console.log(
      `[defuss-net]   pattern "${patternPath}" vs "${urlPath}" => ${matches}`,
    );
    if (matches) {
      getText()
        .then((body) => {
          window.postMessage(
            {
              __defuss: true,
              action: "fetch_intercepted",
              requestId,
              url,
              status,
              body,
            },
            "*",
          );
          console.log(
            `[defuss-net] intercepted ${source} ${url} (${status}) for ${requestId}`,
          );
        })
        .catch(() => {
          // ignore read errors
        });
      networkInterceptors.delete(requestId);
    }
  }
}

console.log(
  "[defuss-extension]: Network interception installed (fetch + XHR).",
);

// --- Automation border (created early, hidden by default) ---
// Border CSS is loaded via manifest content_scripts.css (bypasses page CSP).

let borderIntervalId: ReturnType<typeof setInterval> | null = null;
let borderVisible = false;

/** Ensure the 4 border elements exist; show/hide based on current state */
function ensureBorderElements(): void {
  const appendTarget = document.body || document.documentElement;
  for (const side of ["top", "bottom", "left", "right"]) {
    const sideClass = `__defuss_border_${side}`;
    if (!document.querySelector(`.${sideClass}`)) {
      const el = document.createElement("div");
      el.className = `__defuss_border ${sideClass}`;
      if (borderVisible) el.classList.add("__defuss_border_visible");
      appendTarget.appendChild(el);
      console.log(
        `[defuss-border] created .${sideClass} (visible: ${borderVisible}) in`,
        appendTarget.tagName,
      );
    }
  }
}

/** Create border elements as soon as there's something to attach to */
function initBorder(): void {
  console.log(
    "[defuss-border] initBorder() called | body:",
    !!document.body,
    "| documentElement:",
    !!document.documentElement,
  );
  ensureBorderElements();
  const count = document.querySelectorAll(".__defuss_border").length;
  console.log(`[defuss-border] init complete: ${count} border elements in DOM`);
}

function showBorder(): void {
  console.log("[defuss-border] showBorder() called");
  borderVisible = true;
  ensureBorderElements();
  const borders = document.querySelectorAll(".__defuss_border");
  console.log(
    `[defuss-border] found ${borders.length} border elements to make visible`,
  );
  borders.forEach((el) => {
    el.classList.add("__defuss_border_visible");
    el.classList.remove("__defuss_border_error");
  });
  // Re-inject if page re-renders remove elements
  if (borderIntervalId === null) {
    borderIntervalId = setInterval(ensureBorderElements, 1_000);
  }
}

function hideBorder(): void {
  console.log("[defuss-border] hideBorder() called");
  borderVisible = false;
  if (borderIntervalId !== null) {
    clearInterval(borderIntervalId);
    borderIntervalId = null;
  }
  document.querySelectorAll(".__defuss_border").forEach((el) => {
    el.classList.remove("__defuss_border_visible");
  });
}

function errorBorder(): void {
  console.log("[defuss-border] errorBorder() called");
  document.querySelectorAll(".__defuss_border").forEach((el) => {
    el.classList.add("__defuss_border_error");
  });
}

// Listen for ISOLATED-world signals via postMessage (crosses world boundaries)
console.log("[defuss-border] registering postMessage listener");
window.addEventListener("message", (event: MessageEvent) => {
  // Only accept messages from the same window (same page, different world)
  if (event.source !== window) return;
  const data = event.data;
  if (typeof data !== "object" || data === null) return;
  if (data.__defuss !== true) return;

  console.log("[defuss-border] received postMessage:", data.action);

  switch (data.action) {
    case "border_show":
      showBorder();
      break;
    case "border_hide":
      hideBorder();
      break;
    case "border_error":
      errorBorder();
      break;
    case "intercept_fetch":
      networkInterceptors.set(data.requestId, {
        urlPattern: data.urlPattern,
        requestId: data.requestId,
      });
      console.log(
        `[defuss-net] registered interceptor ${data.requestId} for "${data.urlPattern}"`,
      );
      break;
  }
});

// Inject border elements early (hidden) — as soon as a root exists
if (document.body || document.documentElement) {
  console.log("[defuss-border] root already exists, initializing immediately");
  initBorder();
} else {
  console.log(
    "[defuss-border] no root yet, waiting for body via MutationObserver",
  );
  // At document_start, body may not exist yet — wait for it
  const waitForBody = new MutationObserver(() => {
    if (document.body) {
      console.log("[defuss-border] body appeared, initializing now");
      waitForBody.disconnect();
      initBorder();
    }
  });
  waitForBody.observe(document.documentElement || document, {
    childList: true,
    subtree: true,
  });
}

// --- Intercept input and click events via document-level capture listeners ---
// Using capture phase ensures we see events before any page handler can stopPropagation.
// A single listener per event type guarantees exactly one CustomEvent per user action.

document.addEventListener(
  "click",
  (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    document.dispatchEvent(
      new CustomEvent("__defuss_ext_click", {
        detail: {
          tagName: target.tagName,
          id: target.id || "",
          className: target.className || "",
          textContent: (target.textContent || "").slice(0, 100),
          url: location.href,
        },
      }),
    );
  },
  true,
);

document.addEventListener(
  "input",
  (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target) return;
    if (
      target.tagName !== "INPUT" &&
      target.tagName !== "TEXTAREA" &&
      target.tagName !== "SELECT"
    )
      return;

    document.dispatchEvent(
      new CustomEvent("__defuss_ext_input", {
        detail: {
          tagName: target.tagName,
          name: target.name || target.id || "",
          value: target.value,
          url: location.href,
        },
      }),
    );
  },
  true,
);

// -- DOM MutationObserver: count mutations and report every 5 seconds --
let domMutationCount = 0;

const observer = new MutationObserver((mutations) => {
  domMutationCount += mutations.length;
});

// Start observing as soon as documentElement exists
const startObserving = () => {
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });
};

if (document.documentElement) {
  startObserving();
} else {
  // documentElement not yet available at document_start — wait for it
  const waitForRoot = new MutationObserver(() => {
    if (document.documentElement) {
      waitForRoot.disconnect();
      startObserving();
    }
  });
  waitForRoot.observe(document, { childList: true });
}

// Report accumulated count at the configured interval
setInterval(() => {
  const count = domMutationCount;
  domMutationCount = 0;
  // Always dispatch – a zero count lets listeners detect stability
  document.dispatchEvent(
    new CustomEvent("__defuss_ext_dom_mutations", {
      detail: { count, url: location.href },
    }),
  );
}, 500);
