// @vitest-environment happy-dom
import { $ } from "./dequery.js";

describe("ready method", () => {
  beforeEach(() => {
    // Reset document ready state for each test
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "loading",
    });
  });

  it("is defined as a method", () => {
    expect($(document.body).ready).toBeInstanceOf(Function);
  });

  it("executes callback immediately when DOM is already complete", async () => {
    // Set document ready state to complete
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });

    const callback = vi.fn();
    const result = await $(document.body).ready(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(document.body);
  });

  it("executes callback immediately when DOM is interactive", async () => {
    // Set document ready state to interactive
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "interactive",
    });

    const callback = vi.fn();
    const result = await $(document.body).ready(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(document.body);
  });

  it("waits for DOMContentLoaded when DOM is still loading", async () => {
    // Set document ready state to loading
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "loading",
    });

    const callback = vi.fn();
    let callbackExecuted = false;

    // Start the ready method
    const readyPromise = $(document.body).ready(() => {
      callbackExecuted = true;
      callback();
    });

    // Verify callback hasn't been called yet
    expect(callback).not.toHaveBeenCalled();
    expect(callbackExecuted).toBe(false);

    // Use setTimeout to ensure the event listener is attached before dispatching
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate DOMContentLoaded event
    const event = new Event("DOMContentLoaded");
    document.dispatchEvent(event);

    // Wait for the promise to resolve
    const result = await readyPromise;

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callbackExecuted).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0]).toBe(document.body);
  });

  it("works without a callback when DOM is ready", async () => {
    // Set document ready state to complete
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });

    const result = await $(document.body).ready();

    expect(result.length).toBe(1);
    expect(result[0]).toBe(document.body);
  });

  it("works without a callback when waiting for DOMContentLoaded", async () => {
    // Set document ready state to loading
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "loading",
    });

    // Start the ready method without callback
    const readyPromise = $(document.body).ready();

    // Use setTimeout to ensure the event listener is attached before dispatching
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate DOMContentLoaded event
    const event = new Event("DOMContentLoaded");
    document.dispatchEvent(event);

    // Wait for the promise to resolve
    const result = await readyPromise;

    expect(result.length).toBe(1);
    expect(result[0]).toBe(document.body);
  });

  it("is chainable and maintains element collection", async () => {
    // Set document ready state to complete
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });

    // Create test elements
    const container = document.createElement("div");
    const child1 = document.createElement("span");
    const child2 = document.createElement("span");
    container.appendChild(child1);
    container.appendChild(child2);
    document.body.appendChild(container);

    const callback = vi.fn();

    // Test chaining
    const result = await $(container)
      .children()
      .ready(callback)
      .addClass("ready-class");

    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(2);
    expect(result[0]).toBe(child1);
    expect(result[1]).toBe(child2);

    // Verify chaining worked by checking the added class
    expect(child1.classList.contains("ready-class")).toBe(true);
    expect(child2.classList.contains("ready-class")).toBe(true);

    // Clean up
    document.body.removeChild(container);
  });

  it("handles multiple ready calls on the same element collection", async () => {
    // Set document ready state to complete
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const selection = $(document.body);

    const result1 = await selection.ready(callback1);
    const result2 = await selection.ready(callback2);

    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(result1.length).toBe(1);
    expect(result2.length).toBe(1);
    expect(result1[0]).toBe(document.body);
    expect(result2[0]).toBe(document.body);
  });

  it("properly removes event listener after DOMContentLoaded", async () => {
    // Set document ready state to loading
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "loading",
    });

    const callback = vi.fn();

    // Start the ready method
    const readyPromise = $(document.body).ready(callback);

    // Use setTimeout to ensure the event listener is attached before dispatching
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Simulate DOMContentLoaded event
    const event = new Event("DOMContentLoaded");
    document.dispatchEvent(event);

    // Wait for the promise to resolve
    await readyPromise;

    expect(callback).toHaveBeenCalledTimes(1);

    // Dispatch another DOMContentLoaded event to ensure listener was removed
    const secondEvent = new Event("DOMContentLoaded");
    document.dispatchEvent(secondEvent);

    // Callback should not be called again
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("works with empty element collections", async () => {
    // Set document ready state to complete for immediate execution
    Object.defineProperty(document, "readyState", {
      writable: true,
      value: "complete",
    });

    const callback = vi.fn();

    // Create an empty selection by filtering out all elements
    const emptySelection = $(document.body).filter(".non-existent-class");
    const result = await emptySelection.ready(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(result.length).toBe(0);
  });
});
