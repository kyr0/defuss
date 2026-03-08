/**
 * Tab preload script (runs at document_start in MAIN world).
 *
 * - Injects early DOM modifications (e.g. styles) before the page renders.
 * - Intercepts input/click events and forwards them to the ISOLATED-world
 *   content script via CustomEvents (MAIN world has no chrome.runtime access).
 */

// -- Demo: inject 4 glowing border elements with clockwise moving gradient --
const style = document.createElement("style");
style.textContent = `
@keyframes __defuss_slide_fwd {
  0%   { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}
@keyframes __defuss_slide_rev {
  0%   { background-position: 100% 100%; }
  100% { background-position: 0% 0%; }
}
@keyframes __defuss_glow_color {
  0%   { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}
.__defuss_border {
  position: fixed !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
}
/* Top: flows left → right (clockwise) */
.__defuss_border_top {
  top: 0; left: 0; right: 0;
  height: 3px !important;
  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4, #6366f1) !important;
  background-size: 200% 100% !important;
  animation: __defuss_slide_fwd 3s linear infinite, __defuss_glow_color 6s linear infinite !important;
  box-shadow: 0 0 10px 2px #8b5cf680, 0 0 20px 4px #ec489940 !important;
}
/* Right: flows top → bottom (clockwise) */
.__defuss_border_right {
  top: 0; bottom: 0; right: 0;
  width: 3px !important;
  background: linear-gradient(180deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4, #6366f1) !important;
  background-size: 100% 200% !important;
  animation: __defuss_slide_fwd 3s linear infinite, __defuss_glow_color 6s linear infinite !important;
  box-shadow: 0 0 10px 2px #8b5cf680, 0 0 20px 4px #ec489940 !important;
}
/* Bottom: flows right → left (clockwise) */
.__defuss_border_bottom {
  bottom: 0; left: 0; right: 0;
  height: 3px !important;
  background: linear-gradient(270deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4, #6366f1) !important;
  background-size: 200% 100% !important;
  animation: __defuss_slide_fwd 3s linear infinite, __defuss_glow_color 6s linear infinite !important;
  box-shadow: 0 0 10px 2px #8b5cf680, 0 0 20px 4px #ec489940 !important;
}
/* Left: flows bottom → top (clockwise) */
.__defuss_border_left {
  top: 0; bottom: 0; left: 0;
  width: 3px !important;
  background: linear-gradient(0deg, #6366f1, #8b5cf6, #ec4899, #f59e0b, #10b981, #06b6d4, #6366f1) !important;
  background-size: 100% 200% !important;
  animation: __defuss_slide_fwd 3s linear infinite, __defuss_glow_color 6s linear infinite !important;
  box-shadow: 0 0 10px 2px #8b5cf680, 0 0 20px 4px #ec489940 !important;
}
`;
(document.head || document.documentElement).appendChild(style);

// Create the 4 border elements
for (const side of ["top", "bottom", "left", "right"]) {
  const el = document.createElement("div");
  el.className = `__defuss_border __defuss_border_${side}`;
  (document.body || document.documentElement).appendChild(el);
}

console.log("[defuss-extension]: Code execution before tab even loads.");

// --- Intercept input and click events at the earliest possible moment and forward them to the content script via CustomEvents ---
const originalAddEventListener = EventTarget.prototype.addEventListener;

// --- Base class override to hook ANY event listener ---
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject,
  options?: boolean | AddEventListenerOptions,
): void {
  // Only intercept "input" events on actual input/textarea/select elements
  if (
    type === "input" &&
    this instanceof HTMLElement &&
    (this.tagName === "INPUT" ||
      this.tagName === "TEXTAREA" ||
      this.tagName === "SELECT")
  ) {
    const wrappedListener = function (this: EventTarget, event: Event) {
      const target = event.target as HTMLInputElement;

      // Forward the input value to the content script via a CustomEvent
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

      // Call the original listener
      if (typeof listener === "function") {
        return listener.call(this, event);
      }
      if (
        typeof listener === "object" &&
        typeof listener.handleEvent === "function"
      ) {
        return listener.handleEvent.call(this, event);
      }
    };

    originalAddEventListener.call(this, type, wrappedListener, options);
  }

  // Intercept "click" events on any element
  if (type === "click" && this instanceof HTMLElement) {
    const wrappedListener = function (this: EventTarget, event: Event) {
      const target = event.target as HTMLElement;

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

      // Call the original listener
      if (typeof listener === "function") {
        return listener.call(this, event);
      }
      if (
        typeof listener === "object" &&
        typeof listener.handleEvent === "function"
      ) {
        return listener.handleEvent.call(this, event);
      }
    };

    originalAddEventListener.call(this, type, wrappedListener, options);
  }

  // All other events pass through unmodified
  originalAddEventListener.call(this, type, listener, options);
};

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

// Report accumulated count every 5 seconds
setInterval(() => {
  if (domMutationCount > 0) {
    const count = domMutationCount;
    domMutationCount = 0;
    document.dispatchEvent(
      new CustomEvent("__defuss_ext_dom_mutations", {
        detail: { count, url: location.href },
      }),
    );
  }
}, 5000);
