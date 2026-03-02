import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $ } from "./dequery.js";

describe("Dequery eager sync execution", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        container.id = "test-container";
        document.body.appendChild(container);
    });

    afterEach(() => {
        container.remove();
    });

    it("executes .on() immediately for resolved chains", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        let called = false;
        $(el).on("click", () => {
            called = true;
        });

        // Handler should be attached immediately - no await needed
        // Use bubbles: true for delegated event system
        el.dispatchEvent(new Event("click", { bubbles: true }));
        expect(called).toBe(true);
    });

    it("executes .off() immediately for resolved chains", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        let callCount = 0;
        const handler = () => { callCount++; };

        // Attach handler
        $(el).on("click", handler);
        el.dispatchEvent(new Event("click", { bubbles: true }));
        expect(callCount).toBe(1);

        // Remove handler immediately - no await needed
        $(el).off("click", handler);
        el.dispatchEvent(new Event("click", { bubbles: true }));
        expect(callCount).toBe(1); // Should still be 1, handler removed
    });

    it("executes .addClass() immediately for resolved chains", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        // No await - should work immediately
        $(el).addClass("x");
        expect(el.classList.contains("x")).toBe(true);
    });

    it("executes .removeClass() immediately for resolved chains", () => {
        const el = document.createElement("div");
        el.classList.add("x", "y");
        container.appendChild(el);

        // No await - should work immediately
        $(el).removeClass("x");
        expect(el.classList.contains("x")).toBe(false);
        expect(el.classList.contains("y")).toBe(true);
    });

    it("executes .toggleClass() immediately for resolved chains", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        // No await - should work immediately
        $(el).toggleClass("active");
        expect(el.classList.contains("active")).toBe(true);

        $(el).toggleClass("active");
        expect(el.classList.contains("active")).toBe(false);
    });

    it("executes .trigger() immediately for resolved chains", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        let triggered = false;
        el.addEventListener("custom-event", () => {
            triggered = true;
        });

        // No await - should trigger immediately
        $(el).trigger("custom-event");
        expect(triggered).toBe(true);
    });

    // With sync API, find() executes immediately, so chained ops apply to the result right away
    it("executes find().addClass() synchronously on the found children", () => {
        const parent = document.createElement("div");
        const child = document.createElement("span");
        child.className = "c";
        parent.appendChild(child);
        container.appendChild(parent);

        // Everything executes synchronously now
        $(parent).find(".c").addClass("x");

        // Child should have the class (it was found and modified)
        expect(child.classList.contains("x")).toBe(true);
        // Parent should NOT have the class
        expect(parent.classList.contains("x")).toBe(false);
    });

    it("executes find().on() synchronously on the found children", () => {
        const parent = document.createElement("div");
        const child = document.createElement("button");
        child.className = "btn";
        parent.appendChild(child);
        container.appendChild(parent);

        let clickedElement: HTMLElement | null = null;
        $(parent).find(".btn").on("click", (e) => {
            clickedElement = e.target as HTMLElement;
        });

        // Click the child button - handler should be attached synchronously
        child.dispatchEvent(new Event("click", { bubbles: true }));
        expect(clickedElement).toBe(child);

        // Parent should NOT have the handler
        clickedElement = null;
        parent.dispatchEvent(new Event("click", { bubbles: true }));
        expect(clickedElement).toBe(null);
    });

    it("chains multiple sync operations correctly", () => {
        const el = document.createElement("div");
        container.appendChild(el);

        // Multiple sync ops without await
        $(el).addClass("a").addClass("b").addClass("c");

        expect(el.classList.contains("a")).toBe(true);
        expect(el.classList.contains("b")).toBe(true);
        expect(el.classList.contains("c")).toBe(true);
    });
});
