import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createSyncCall } from "./dequery.js";

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

    // Critical bug-catcher test: ensures correct ordering when ops are queued
    it("does NOT execute eagerly if there are queued ops before it", async () => {
        const parent = document.createElement("div");
        const child = document.createElement("span");
        child.className = "c";
        parent.appendChild(child);
        container.appendChild(parent);

        // find() is queued, so addClass must NOT run early on parent
        const chain = $(parent).find(".c").addClass("x");

        // Before await: neither should have the class
        expect(parent.classList.contains("x")).toBe(false);
        expect(child.classList.contains("x")).toBe(false);

        // After awaiting, it should apply to the child (result of .find())
        await chain;
        expect(child.classList.contains("x")).toBe(true);
        expect(parent.classList.contains("x")).toBe(false);
    });

    it("does NOT execute .on() eagerly if there are queued ops", async () => {
        const parent = document.createElement("div");
        const child = document.createElement("button");
        child.className = "btn";
        parent.appendChild(child);
        container.appendChild(parent);

        let clickedElement: HTMLElement | null = null;
        const chain = $(parent).find(".btn").on("click", (e) => {
            clickedElement = e.target as HTMLElement;
        });

        // Click parent before await - should not trigger (handler not attached yet)
        parent.dispatchEvent(new Event("click", { bubbles: true }));
        expect(clickedElement).toBe(null);

        // Await to resolve the chain
        await chain;

        // Now click the child button - should trigger
        child.dispatchEvent(new Event("click", { bubbles: true }));
        expect(clickedElement).toBe(child);

        // Parent still shouldn't have the handler
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
