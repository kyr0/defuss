/**
 * Browser-based tests for event delegation system.
 * These run in real Chrome via Playwright, avoiding jsdom/happy-dom limitations.
 * 
 * Run with: pnpm test:browser
 */
import { describe, it, expect } from "vitest";
import { registerDelegatedEvent, removeDelegatedEvent, clearDelegatedEvents } from "../render/delegated-events.js";

describe("Delegated Events (Browser)", () => {
    it("registers and fires click events", () => {
        const button = document.createElement("button");
        button.textContent = "Click me";
        document.body.appendChild(button);

        let clicked = false;
        registerDelegatedEvent(button, "click", () => {
            clicked = true;
        });

        button.click();
        expect(clicked).toBe(true);

        document.body.removeChild(button);
    });

    it("removes specific event handler", () => {
        const button = document.createElement("button");
        document.body.appendChild(button);

        let clickCount = 0;
        const handler = () => { clickCount++; };

        registerDelegatedEvent(button, "click", handler, { multi: true });
        button.click();
        expect(clickCount).toBe(1);

        removeDelegatedEvent(button, "click", handler);
        button.click();
        expect(clickCount).toBe(1); // Should not increment after removal

        document.body.removeChild(button);
    });

    it("removes all handlers for event type", () => {
        const button = document.createElement("button");
        document.body.appendChild(button);

        let count = 0;
        registerDelegatedEvent(button, "click", () => { count++; }, { multi: true });
        registerDelegatedEvent(button, "click", () => { count++; }, { multi: true });

        button.click();
        expect(count).toBe(2);

        // Remove all click handlers (no specific handler)
        removeDelegatedEvent(button, "click");
        button.click();
        expect(count).toBe(2); // Should not increment

        document.body.removeChild(button);
    });

    it("clears all events from element", () => {
        const button = document.createElement("button");
        document.body.appendChild(button);

        let clickFired = false;
        let mouseoverFired = false;

        registerDelegatedEvent(button, "click", () => { clickFired = true; }, { multi: true });
        registerDelegatedEvent(button, "mouseover", () => { mouseoverFired = true; }, { multi: true });

        clearDelegatedEvents(button);

        button.click();
        button.dispatchEvent(new Event("mouseover", { bubbles: true }));

        expect(clickFired).toBe(false);
        expect(mouseoverFired).toBe(false);

        document.body.removeChild(button);
    });

    it("handles non-bubbling events (focus) via capture", () => {
        const input = document.createElement("input");
        document.body.appendChild(input);

        let focused = false;
        registerDelegatedEvent(input, "focus", () => {
            focused = true;
        });

        input.focus();

        expect(focused).toBe(true);

        document.body.removeChild(input);
    });

    it("preserves handlers across DOM moves", () => {
        const container1 = document.createElement("div");
        const container2 = document.createElement("div");
        const button = document.createElement("button");

        document.body.appendChild(container1);
        document.body.appendChild(container2);
        container1.appendChild(button);

        let clicked = false;
        registerDelegatedEvent(button, "click", () => {
            clicked = true;
        });

        // Move button to container2
        container2.appendChild(button);

        button.click();
        expect(clicked).toBe(true);

        document.body.removeChild(container1);
        document.body.removeChild(container2);
    });
});
