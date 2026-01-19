/**
 * Kitchen Sink Test Suite - Ref and Store Tests
 * 
 * Tests ref and state management including:
 * - createRef behaviors
 * - Ref forwarding
 * - Store updates
 * - State subscriptions
 * - Component instance refs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, waitForCondition } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Refs and Stores", () => {
    describe("createRef Behaviors", () => {
        it("should populate ref.current after render", async () => {
            const divRef = createRef<HTMLDivElement>();

            expect(divRef.current).toBeNull();

            await $(container).jsx(
                <div ref={divRef}>content</div>
            );

            expect(divRef.current).toBeTruthy();
            expect(divRef.current?.tagName).toBe("DIV");
        });

        it("should update ref content when element is morphed", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const spanRef = createRef<HTMLSpanElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <span ref={spanRef}>first</span>
                </div>
            );

            const firstSpan = spanRef.current;
            expect(firstSpan?.textContent).toBe("first");

            // Update content via morph
            await $(containerRef).jsx(
                <span ref={spanRef}>second</span>
            );

            // Ref should point to same morphed element with updated content
            // (defuss preserves DOM nodes during morphing for efficiency)
            expect(spanRef.current?.textContent).toBe("second");
            expect(spanRef.current).toBe(firstSpan); // Same element, morphed in-place
        });

        it("should work with multiple refs in nested structure", async () => {
            const parentRef = createRef<HTMLDivElement>();
            const childRef = createRef<HTMLSpanElement>();
            const grandchildRef = createRef<HTMLButtonElement>();

            await $(container).jsx(
                <div ref={parentRef}>
                    <span ref={childRef}>
                        <button ref={grandchildRef}>click</button>
                    </span>
                </div>
            );

            expect(parentRef.current).toBeTruthy();
            expect(childRef.current).toBeTruthy();
            expect(grandchildRef.current).toBeTruthy();
            expect(parentRef.current?.contains(childRef.current!)).toBe(true);
            expect(childRef.current?.contains(grandchildRef.current!)).toBe(true);
        });
    });

    describe("Ref-based Updates (dequery)", () => {
        it("should update element via ref", async () => {
            const divRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={divRef} class="target">initial</div>
            );

            await $(divRef).jsx(<span>replaced</span>);

            expect(divRef.current?.textContent).toBe("replaced");
            expect(divRef.current?.querySelector("span")).toBeTruthy();
        });

        it("should add class via ref", async () => {
            const divRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={divRef} class="target">content</div>
            );

            await $(divRef).addClass("active");

            expect(divRef.current?.classList.contains("active")).toBe(true);
            expect(divRef.current?.classList.contains("target")).toBe(true);
        });

        it("should chain operations on ref", async () => {
            const divRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={divRef}>content</div>
            );

            await $(divRef)
                .addClass("a")
                .addClass("b")
                .css({ color: "red" });

            expect(divRef.current?.classList.contains("a")).toBe(true);
            expect(divRef.current?.classList.contains("b")).toBe(true);
        });
    });

    describe("createStore Behaviors", () => {
        it("should initialize with initial value", () => {
            const store = createStore({ count: 0 });

            expect(store.value.count).toBe(0);
        });

        it("should update value with set", () => {
            const store = createStore({ count: 0 });

            store.set({ count: 5 });

            expect(store.value.count).toBe(5);
        });

        it("should notify subscribers on update", () => {
            const store = createStore({ count: 0 });
            const subscriber = vi.fn();

            store.subscribe(subscriber);
            store.set({ count: 1 });

            expect(subscriber).toHaveBeenCalledWith({ count: 1 }, { count: 0 }, undefined);
        });

        it("should unsubscribe correctly", () => {
            const store = createStore({ count: 0 });
            const subscriber = vi.fn();

            const unsubscribe = store.subscribe(subscriber);
            unsubscribe();

            store.set({ count: 1 });

            expect(subscriber).not.toHaveBeenCalled();
        });

        it("should handle multiple subscribers", () => {
            const store = createStore({ value: "initial" });
            const sub1 = vi.fn();
            const sub2 = vi.fn();
            const sub3 = vi.fn();

            store.subscribe(sub1);
            store.subscribe(sub2);
            const unsub3 = store.subscribe(sub3);

            store.set({ value: "updated" });

            expect(sub1).toHaveBeenCalled();
            expect(sub2).toHaveBeenCalled();
            expect(sub3).toHaveBeenCalled();

            unsub3();
            store.set({ value: "again" });

            expect(sub1).toHaveBeenCalledTimes(2);
            expect(sub2).toHaveBeenCalledTimes(2);
            expect(sub3).toHaveBeenCalledTimes(1); // Unsubscribed
        });
    });

    describe("Store-driven Rendering", () => {
        it("should rerender on store update", async () => {
            const store = createStore({ items: ["a", "b", "c"] });
            const containerRef = createRef<HTMLDivElement>();

            const ItemList = () => (
                <ul>
                    {store.value.items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            );

            const render = async () => {
                await $(containerRef).jsx(<ItemList />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();

            expect(container.querySelectorAll("li").length).toBe(3);

            // Subscribe to store and rerender
            store.subscribe(render);

            store.set({ items: ["a", "b", "c", "d", "e"] });
            await wait(10);

            expect(container.querySelectorAll("li").length).toBe(5);
        });

        it("should handle toggle pattern", async () => {
            const store = createStore({ visible: false });
            const containerRef = createRef<HTMLDivElement>();

            const Toggle = () => (
                <div>
                    {store.value.visible && <div class="content">Visible Content</div>}
                    <button onClick={() => store.set({ visible: !store.value.visible })}>
                        Toggle
                    </button>
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<Toggle />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();
            store.subscribe(render);

            expect(container.querySelector(".content")).toBeNull();

            (container.querySelector("button") as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".content")).toBeTruthy();

            (container.querySelector("button") as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".content")).toBeNull();
        });
    });

    describe("Ref with State Pattern", () => {
        it("should combine ref with state updates", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const inputRef = createRef<HTMLInputElement>();
            const store = createStore({ submitted: false, value: "" });

            const Form = () => (
                <form onSubmit={(e: Event) => {
                    e.preventDefault();
                    store.set({
                        submitted: true,
                        value: inputRef.current?.value ?? ""
                    });
                }}>
                    <input ref={inputRef} type="text" />
                    <button type="submit">Submit</button>
                    {store.value.submitted && (
                        <p class="result">Submitted: {store.value.value}</p>
                    )}
                </form>
            );

            const render = async () => {
                await $(containerRef).jsx(<Form />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();
            store.subscribe(render);

            // Type in input
            const input = container.querySelector("input") as HTMLInputElement;
            input.value = "test value";

            // Submit
            (container.querySelector("button") as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".result")?.textContent).toContain("test value");
        });
    });

    describe("waitForRef", () => {
        it("should wait for ref to be populated", async () => {
            const divRef = createRef<HTMLDivElement>();

            // Start async render
            const renderPromise = (async () => {
                await wait(50);
                await $(container).jsx(<div ref={divRef}>delayed</div>);
            })();

            // Wait for ref
            const result = await $(divRef);
            await renderPromise;

            expect(divRef.current).toBeTruthy();
        });
    });
});
