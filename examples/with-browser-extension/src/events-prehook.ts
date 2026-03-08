/**
 * Pre-website execution code injection (runs at document_start in MAIN world).
 *
 * Example: intercept input events and forward them to the content script
 * which relays them to the background service worker via chrome.runtime.
 *
 * Because MAIN-world scripts cannot access chrome.runtime directly,
 * we dispatch a CustomEvent that the ISOLATED-world content script can listen for.
 */

const originalAddEventListener = EventTarget.prototype.addEventListener;

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

  // All other events pass through unmodified
  originalAddEventListener.call(this, type, listener, options);
};
