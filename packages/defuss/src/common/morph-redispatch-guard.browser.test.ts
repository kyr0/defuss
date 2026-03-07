/**
 * Browser tests for the morph re-dispatch guard in delegated-events.ts.
 *
 * When DOM morphing patches attributes on an element during an active event
 * handler, the browser may re-dispatch the same native event. The delegated
 * event system must detect and suppress these re-entrant echoes so that a
 * single user click never fires the handler twice.
 *
 * The guard uses a re-entrancy approach: it tracks whether a handler is
 * currently executing for a given target+eventType+phase. Dispatches that
 * arrive while the handler is still on the call stack are rejected.
 *
 * These tests run in real Chromium via Playwright.
 */
import { describe, it, expect, afterEach } from "vitest";
import { registerDelegatedEvent, clearDelegatedEvents } from "../render/delegated-events.js";

let container: HTMLDivElement;

afterEach(() => {
  if (container) {
    clearDelegatedEvents(container);
    container.querySelectorAll("*").forEach((el) => clearDelegatedEvents(el as HTMLElement));
    container.remove();
  }
});

const nextTick = () => new Promise<void>((r) => queueMicrotask(r));
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("Morph re-dispatch guard (Browser)", () => {
  it("suppresses re-entrant dispatch from inside a handler (morph echo)", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    button.textContent = "Click me";
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      // Simulate morph echo: re-dispatch click while handler is active
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    button.click();
    // Should fire exactly once — the re-entrant dispatch was suppressed
    expect(fireCount).toBe(1);
  });

  it("allows genuinely different clicks on the same element (non-re-entrant)", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
    });

    button.click();
    expect(fireCount).toBe(1);

    button.click();
    expect(fireCount).toBe(2);

    button.click();
    expect(fireCount).toBe(3);
  });

  it("allows rapid synchronous clicks when handler has returned", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
    });

    // Rapid synchronous clicks — all should fire since no handler is active
    // when each subsequent click arrives (handler returns before next .click())
    for (let i = 0; i < 10; i++) {
      button.click();
    }
    expect(fireCount).toBe(10);
  });

  it("tracks re-entrancy per element independently", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    container.appendChild(btn1);
    container.appendChild(btn2);

    let count1 = 0;
    let count2 = 0;
    registerDelegatedEvent(btn1, "click", () => { count1++; });
    registerDelegatedEvent(btn2, "click", () => { count2++; });

    btn1.click();
    expect(count1).toBe(1);
    expect(count2).toBe(0);

    btn2.click();
    expect(count1).toBe(1);
    expect(count2).toBe(1);
  });

  it("does not block capture and bubble phases of the same event", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let captureCount = 0;
    let bubbleCount = 0;
    registerDelegatedEvent(button, "click", () => { captureCount++; }, { capture: true });
    registerDelegatedEvent(button, "click", () => { bubbleCount++; });

    button.click();
    expect(captureCount).toBe(1);
    expect(bubbleCount).toBe(1);
  });

  it("suppresses morph echo during a handler that mutates DOM attributes", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "Toggle";
    container.appendChild(button);

    let toggleCount = 0;

    registerDelegatedEvent(button, "click", () => {
      toggleCount++;

      // Simulate what DOM morphing does: update the attribute and
      // re-dispatch a click (the browser does this when the element
      // under the cursor is mutated during event handling).
      const isPressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!isPressed));

      // Morph re-dispatch — a new click dispatched synchronously inside
      // the handler should be suppressed by the re-entrancy guard.
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    button.click();

    expect(toggleCount).toBe(1);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("allows clicks on different event types independently", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let clickCount = 0;
    let mousedownCount = 0;
    registerDelegatedEvent(button, "click", () => { clickCount++; });
    registerDelegatedEvent(button, "mousedown", () => { mousedownCount++; });

    button.click();
    expect(clickCount).toBe(1);

    button.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(mousedownCount).toBe(1);
  });

  it("handles store-driven re-renders: click -> morph echo -> click again", async () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const wrapper = document.createElement("div");
    container.appendChild(wrapper);

    let state = { count: 0 };
    let handlerFires = 0;

    const render = () => {
      const button = wrapper.querySelector("button") || document.createElement("button");
      button.textContent = `Count: ${state.count}`;
      button.setAttribute("data-count", String(state.count));
      if (!button.parentElement) wrapper.appendChild(button);

      clearDelegatedEvents(button);
      registerDelegatedEvent(button, "click", () => {
        handlerFires++;
        state = { count: state.count + 1 };

        // Morph echo: new event dispatched inside handler
        button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    render();

    const btn = wrapper.querySelector("button")!;
    btn.click();

    expect(handlerFires).toBe(1);
    expect(state.count).toBe(1);

    // Re-render (like a store subscriber would)
    render();

    // Second click — should also fire exactly once
    const btn2 = wrapper.querySelector("button")!;
    btn2.click();

    expect(handlerFires).toBe(2);
    expect(state.count).toBe(2);
  });

  it("suppresses deeply nested re-entrant dispatches", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;

    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      // First echo — this should be suppressed
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      // Even if the above was suppressed, try again
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    button.click();
    expect(fireCount).toBe(1);
  });

  it("cleans up re-entrancy flag even if handler throws", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;

    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      if (fireCount === 1) {
        throw new Error("intentional test error");
      }
    });

    // First click throws — but finally block should clean up dispatchKey
    try {
      button.click();
    } catch {
      // expected
    }
    expect(fireCount).toBe(1);

    // Second click should still work (re-entrancy flag was cleaned up)
    try {
      button.click();
    } catch {
      // may throw again
    }
    expect(fireCount).toBe(2);
  });
});
