/**
 * Hydration tests - running in real browser via Playwright.
 * Tests the hydrate() function that reconciles server-rendered HTML with VNodes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { hydrate, renderSync, renderToString } from "../render/client.js";
import type { VNode } from "../render/client.js";

describe("Hydration (Browser)", () => {
    let container: HTMLDivElement;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
    });

    afterEach(() => {
        document.body.removeChild(container);
    });

    describe("Basic Hydration", () => {
        it("hydrates a simple element and attaches event handlers", () => {
            // Simulate server-rendered HTML
            container.innerHTML = '<button id="btn">Click me</button>';

            let clicked = false;
            const vnode: VNode = {
                type: "button",
                attributes: {
                    id: "btn",
                    onClick: () => { clicked = true; },
                },
                children: ["Click me"],
            };

            // Hydrate: attach event handlers to existing DOM
            hydrate([vnode], [container.firstChild as HTMLElement]);

            // Click the button
            (container.querySelector("#btn") as HTMLButtonElement).click();
            expect(clicked).toBe(true);
        });

        it("hydrates multiple elements", () => {
            container.innerHTML = '<div id="a">A</div><div id="b">B</div>';

            const vnodes: VNode[] = [
                { type: "div", attributes: { id: "a" }, children: ["A"] },
                { type: "div", attributes: { id: "b" }, children: ["B"] },
            ];

            const domElements = Array.from(container.childNodes) as HTMLElement[];
            hydrate(vnodes, domElements);

            expect(container.querySelector("#a")?.textContent).toBe("A");
            expect(container.querySelector("#b")?.textContent).toBe("B");
        });

        it("hydrates nested elements with deep event handlers", () => {
            container.innerHTML = '<div class="wrapper"><button id="nested-btn">Nested</button></div>';

            let clicked = false;
            const wrapper = container.querySelector(".wrapper") as HTMLElement;
            const button = container.querySelector("#nested-btn") as HTMLElement;

            const buttonVNode: VNode = {
                type: "button",
                attributes: {
                    id: "nested-btn",
                    onClick: () => { clicked = true; },
                },
                children: ["Nested"],
            };

            const wrapperVNode: VNode = {
                type: "div",
                attributes: { class: "wrapper" },
                children: [buttonVNode],
            };

            hydrate([wrapperVNode], [wrapper]);
            button.click();
            expect(clicked).toBe(true);
        });
    });

    describe("Text Node Fusion", () => {
        it("fuses consecutive text nodes during hydration", () => {
            // Server renders: "Hello World" as single text node
            container.innerHTML = '<div id="text-fusion">Hello World</div>';

            // But VNodes have separate strings
            const vnode: VNode = {
                type: "div",
                attributes: { id: "text-fusion" },
                children: ["Hello", " ", "World"],
            };

            const div = container.querySelector("#text-fusion") as HTMLElement;

            // Should fuse ["Hello", " ", "World"] into "Hello World" to match DOM
            hydrate([vnode], [div]);

            expect(div.textContent).toBe("Hello World");
        });

        it("handles mixed text and element nodes", () => {
            container.innerHTML = '<div id="mixed">Text before<span>middle</span>Text after</div>';

            const vnode: VNode = {
                type: "div",
                attributes: { id: "mixed" },
                children: [
                    "Text before",
                    { type: "span", attributes: {}, children: ["middle"] } as VNode,
                    "Text after",
                ],
            };

            const div = container.querySelector("#mixed") as HTMLElement;
            // This tests text node matching in mixed content scenarios
            hydrate([vnode], [div]);

            expect(div.textContent).toBe("Text beforemiddleText after");
        });
    });

    describe("Ref Hydration", () => {
        it("assigns refs during hydration", () => {
            container.innerHTML = '<input id="input-ref" value="test" />';

            const inputRef = { current: null as HTMLInputElement | null };
            const vnode: VNode = {
                type: "input",
                attributes: {
                    id: "input-ref",
                    value: "test",
                    ref: inputRef,
                },
                children: [],
            };

            const input = container.querySelector("#input-ref") as HTMLInputElement;
            hydrate([vnode], [input]);

            expect(inputRef.current).toBe(input);
            expect(inputRef.current?.value).toBe("test");
        });
    });

    describe("Lifecycle Hooks", () => {
        it("calls onMount during hydration", async () => {
            container.innerHTML = '<div id="lifecycle">Content</div>';

            const onMount = vi.fn();
            const vnode: VNode = {
                type: "div",
                attributes: {
                    id: "lifecycle",
                    onMount,
                },
                children: ["Content"],
            };

            const div = container.querySelector("#lifecycle") as HTMLElement;
            hydrate([vnode], [div]);

            // onMount is called via queueMicrotask
            await new Promise(resolve => queueMicrotask(resolve));
            expect(onMount).toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        it("throws error on mismatched element count in debug mode", () => {
            container.innerHTML = '<div>One</div>';

            const vnodes: VNode[] = [
                { type: "div", attributes: {}, children: ["One"] },
                { type: "div", attributes: {}, children: ["Two"] },
            ];

            const domElements = Array.from(container.childNodes) as HTMLElement[];

            expect(() => {
                hydrate(vnodes, domElements, true);
            }).toThrow(/Hydration error/);
        });
    });
});
