/**
 * Playwright browser test: defuss must never double-fire event handlers.
 *
 * Each test clicks a button exactly once (via real DOM .click()) and asserts
 * the registered handler fired exactly once. This refutes the hypothesis that
 * defuss' delegated event system could call an onClick handler more than once
 * per user interaction.
 *
 * Runs in real Chromium via Playwright (vitest browser mode).
 */
import { describe, it, expect, afterEach } from "vitest";
import {
  registerDelegatedEvent,
  clearDelegatedEvents,
} from "../render/delegated-events.js";

let container: HTMLDivElement;

afterEach(() => {
  if (container) {
    clearDelegatedEvents(container);
    container.querySelectorAll("*").forEach((el) => {
      clearDelegatedEvents(el as HTMLElement);
    });
    container.remove();
  }
});

describe("No double-fire (Browser / Playwright)", () => {
  it("fires onClick exactly once per click", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    button.textContent = "Click me";
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
    });

    button.click();
    expect(fireCount).toBe(1);
  });

  it("fires exactly N times for N sequential clicks", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
    });

    for (let i = 0; i < 5; i++) {
      button.click();
    }
    expect(fireCount).toBe(5);
  });

  it("does not double-fire when handler mutates DOM attributes", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    button.setAttribute("aria-pressed", "false");
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      // Mutate the element during the handler — browsers may re-dispatch
      // when the element under the cursor changes; defuss must not double-fire.
      const pressed = button.getAttribute("aria-pressed") === "true";
      button.setAttribute("aria-pressed", String(!pressed));
    });

    button.click();
    expect(fireCount).toBe(1);
    expect(button.getAttribute("aria-pressed")).toBe("true");
  });

  it("does not double-fire when handler replaces button textContent", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    button.textContent = "Before";
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      button.textContent = `Clicked ${fireCount}`;
    });

    button.click();
    expect(fireCount).toBe(1);
    expect(button.textContent).toBe("Clicked 1");
  });

  it("does not double-fire when handler toggles a CSS class", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;
    registerDelegatedEvent(button, "click", () => {
      fireCount++;
      button.classList.toggle("active");
    });

    button.click();
    expect(fireCount).toBe(1);
    expect(button.classList.contains("active")).toBe(true);

    button.click();
    expect(fireCount).toBe(2);
    expect(button.classList.contains("active")).toBe(false);
  });

  it("does not double-fire across nested elements", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const outer = document.createElement("div");
    const inner = document.createElement("button");
    inner.textContent = "Inner";
    outer.appendChild(inner);
    container.appendChild(outer);

    let outerCount = 0;
    let innerCount = 0;

    registerDelegatedEvent(outer, "click", () => {
      outerCount++;
    });
    registerDelegatedEvent(inner, "click", () => {
      innerCount++;
    });

    // Click on inner — inner fires once, outer fires once (bubble)
    inner.click();
    expect(innerCount).toBe(1);
    expect(outerCount).toBe(1);
  });

  it("does not double-fire when re-registering handler after clear", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let fireCount = 0;
    const handler = () => {
      fireCount++;
    };

    registerDelegatedEvent(button, "click", handler);
    button.click();
    expect(fireCount).toBe(1);

    // Clear and re-register (simulates a morph/re-render cycle)
    clearDelegatedEvents(button);
    registerDelegatedEvent(button, "click", handler);

    button.click();
    expect(fireCount).toBe(2);
  });

  it("does not double-fire capture vs bubble for same click", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const button = document.createElement("button");
    container.appendChild(button);

    let captureCount = 0;
    let bubbleCount = 0;

    registerDelegatedEvent(
      button,
      "click",
      () => {
        captureCount++;
      },
      { capture: true },
    );
    registerDelegatedEvent(button, "click", () => {
      bubbleCount++;
    });

    button.click();
    // Each phase fires exactly once
    expect(captureCount).toBe(1);
    expect(bubbleCount).toBe(1);
  });

  it("independent elements do not interfere with each other's counts", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const btn1 = document.createElement("button");
    const btn2 = document.createElement("button");
    container.appendChild(btn1);
    container.appendChild(btn2);

    let count1 = 0;
    let count2 = 0;
    registerDelegatedEvent(btn1, "click", () => {
      count1++;
    });
    registerDelegatedEvent(btn2, "click", () => {
      count2++;
    });

    btn1.click();
    expect(count1).toBe(1);
    expect(count2).toBe(0);

    btn2.click();
    expect(count1).toBe(1);
    expect(count2).toBe(1);

    btn1.click();
    btn1.click();
    expect(count1).toBe(3);
    expect(count2).toBe(1);
  });
});
