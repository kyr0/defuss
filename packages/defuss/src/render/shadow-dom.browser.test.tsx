/**
 * Shadow DOM tests - running in real browser via Playwright.
 * Tests shadow DOM rendering, updating, event handling, and cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderSync, renderToString } from "../render/client.js";
import { updateDomWithVdom } from "../common/dom.js";
import { registerDelegatedEvent, clearDelegatedEventsDeep } from "../render/delegated-events.js";

describe("Shadow DOM (Browser)", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    describe("Basic Shadow DOM", () => {
        it("renders into shadow DOM", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            const vnode = <div class="shadow-content">Shadow Content</div>;
            renderSync(vnode, shadow as unknown as Element);

            expect(shadow.querySelector(".shadow-content")?.textContent).toBe("Shadow Content");
        });

        it("renders complex component into shadow DOM", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            const Component = () => (
                <div class="wrapper">
                    <style>{`.wrapper { color: red; }`}</style>
                    <h1>Title</h1>
                    <p>Content paragraph</p>
                    <button id="shadow-btn">Click</button>
                </div>
            );

            renderSync(<Component />, shadow as unknown as Element);

            expect(shadow.querySelector("h1")?.textContent).toBe("Title");
            expect(shadow.querySelector("p")?.textContent).toBe("Content paragraph");
            expect(shadow.querySelector("#shadow-btn")).toBeTruthy();
        });
    });

    describe("Shadow DOM Updates", () => {
        it("updates shadow DOM content via updateDomWithVdom", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            // Initial render
            renderSync(<div id="initial">Initial Content</div>, shadow as unknown as Element);
            expect(shadow.querySelector("#initial")?.textContent).toBe("Initial Content");

            // Update via host element (should update shadow root)
            updateDomWithVdom(
                host,
                <div id="updated">Updated Content</div>,
                globalThis as any
            );

            expect(shadow.querySelector("#updated")?.textContent).toBe("Updated Content");
        });

        it("preserves shadow DOM structure during partial updates", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            // Initial render with list
            renderSync(
                <ul class="list">
                    <li id="item-1">Item 1</li>
                    <li id="item-2">Item 2</li>
                </ul>,
                shadow as unknown as Element
            );

            const item1 = shadow.querySelector("#item-1");
            expect(item1).toBeTruthy();

            // Update with modified list
            updateDomWithVdom(
                host,
                <ul class="list">
                    <li id="item-1">Item 1 Updated</li>
                    <li id="item-2">Item 2</li>
                    <li id="item-3">Item 3</li>
                </ul>,
                globalThis as any
            );

            // Check updates
            expect(shadow.querySelector("#item-1")?.textContent).toBe("Item 1 Updated");
            expect(shadow.querySelectorAll("li").length).toBe(3);
        });

        it("does not create duplicates when updating shadow host", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            // Initial render
            renderSync(<div class="content">Content</div>, shadow as unknown as Element);
            expect(shadow.childNodes.length).toBe(1);

            // Multiple updates
            for (let i = 0; i < 3; i++) {
                updateDomWithVdom(
                    host,
                    <div class="content">Content {i}</div>,
                    globalThis as any
                );
            }

            // Should still have exactly 1 child, not duplicates
            expect(shadow.childNodes.length).toBe(1);
            expect(shadow.querySelector(".content")?.textContent).toBe("Content 2");
        });
    });

    describe("Shadow DOM Events", () => {
        it("handles events in shadow DOM via delegation", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            let clicked = false;
            const button = document.createElement("button");
            button.id = "shadow-event-btn";
            button.textContent = "Click me";
            shadow.appendChild(button);

            registerDelegatedEvent(button, "click", () => {
                clicked = true;
            });

            button.click();
            expect(clicked).toBe(true);
        });

        it("supports multiple event handlers in shadow DOM", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            let count = 0;
            const button = document.createElement("button");
            shadow.appendChild(button);

            registerDelegatedEvent(button, "click", () => { count++; }, { multi: true });
            registerDelegatedEvent(button, "click", () => { count++; }, { multi: true });

            button.click();
            expect(count).toBe(2);
        });

        it("properly cleans up shadow DOM events with clearDelegatedEventsDeep", () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            let clicked = false;
            const wrapper = document.createElement("div");
            const button = document.createElement("button");
            wrapper.appendChild(button);
            shadow.appendChild(wrapper);

            registerDelegatedEvent(button, "click", () => { clicked = true; }, { multi: true });

            // Clear events from wrapper (should also clear button)
            clearDelegatedEventsDeep(wrapper);

            button.click();
            // Handler was removed, so clicked should still be false
            // Note: delegation still fires, but handler registry is empty
            expect(clicked).toBe(false);
        });
    });

    describe("Shadow DOM Empty", () => {
        it("empty() clears shadow DOM children", async () => {
            const host = document.createElement("div");
            container.appendChild(host);
            const shadow = host.attachShadow({ mode: "open" });

            // Add some content
            shadow.innerHTML = "<div>Child 1</div><div>Child 2</div>";
            expect(shadow.childNodes.length).toBe(2);

            // Import $ dynamically to avoid circular deps in test
            const { $ } = await import("../dequery/dequery.js");
            await $(host, { globals: globalThis as any }).empty();

            // Shadow should be cleared
            expect(shadow.childNodes.length).toBe(0);
        });
    });

    describe("Web Components", () => {
        it("renders custom element with shadow DOM", () => {
            // Define a custom element if not already defined
            if (!customElements.get("my-test-component")) {
                customElements.define(
                    "my-test-component",
                    class extends HTMLElement {
                        constructor() {
                            super();
                            const shadow = this.attachShadow({ mode: "open" });
                            const template = renderSync(
                                <div class="internal">
                                    <slot></slot>
                                </div>
                            ) as Element;
                            shadow.appendChild(template);
                        }
                    }
                );
            }

            // Use the custom element
            const el = document.createElement("my-test-component");
            container.appendChild(el);

            expect(el.shadowRoot).toBeTruthy();
            expect(el.shadowRoot?.querySelector(".internal")).toBeTruthy();
        });
    });
});
