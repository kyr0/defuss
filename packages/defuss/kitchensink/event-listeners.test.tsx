/**
 * Kitchen Sink Test Suite - Event Listener Tests
 * 
 * Tests event handling across updates including:
 * - Event handler preservation on rerender
 * - Event delegation
 * - Capture phase events
 * - Event handler updates
 * - Multiple handlers
 * - Dynamic event binding
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Event Listener Stability", () => {
    describe("Handler Preservation on Rerender", () => {
        it("should maintain click handler after content update", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const clickHandler = vi.fn();

            await $(container).jsx(
                <div ref={containerRef}>
                    <button onClick={clickHandler}>Click me</button>
                    <span>Count: 0</span>
                </div>
            );

            const button = container.querySelector("button")!;
            button.click();
            expect(clickHandler).toHaveBeenCalledTimes(1);

            // Update content but keep handler
            await $(containerRef).jsx(
                <button onClick={clickHandler}>Click me</button>,
                <span>Count: 1</span>
            );

            // Handler should still work
            const newButton = container.querySelector("button")!;
            newButton.click();
            expect(clickHandler).toHaveBeenCalledTimes(2);
        });

        it("should update handler reference on rerender", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const handler1 = vi.fn(() => "handler1");
            const handler2 = vi.fn(() => "handler2");

            await $(container).jsx(
                <div ref={containerRef}>
                    <button onClick={handler1}>Click</button>
                </div>
            );

            container.querySelector("button")!.click();
            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledTimes(0);

            // Update with new handler
            await $(containerRef).jsx(
                <button onClick={handler2}>Click</button>
            );

            container.querySelector("button")!.click();

            // New handler should be called, old should not
            expect(handler1).toHaveBeenCalledTimes(1); // Still 1
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it("should remove handler when not present in update", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const handler = vi.fn();

            await $(container).jsx(
                <div ref={containerRef}>
                    <button onClick={handler}>Click</button>
                </div>
            );

            container.querySelector("button")!.click();
            expect(handler).toHaveBeenCalledTimes(1);

            // Update without handler
            await $(containerRef).jsx(
                <button>Click</button>
            );

            container.querySelector("button")!.click();

            // Handler should not be called again
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe("Event Phases", () => {
        it("should support both bubble and capture handlers", async () => {
            const bubbleHandler = vi.fn();
            const captureHandler = vi.fn();
            const order: string[] = [];

            await $(container).jsx(
                <div
                    onClick={() => { order.push("bubble"); bubbleHandler(); }}
                    onClickCapture={() => { order.push("capture"); captureHandler(); }}
                >
                    <button>Click</button>
                </div>
            );

            container.querySelector("button")!.click();

            expect(captureHandler).toHaveBeenCalled();
            expect(bubbleHandler).toHaveBeenCalled();
            // Capture should fire before bubble
            expect(order[0]).toBe("capture");
            expect(order[1]).toBe("bubble");
        });

        it("should handle transition from onClick + onClickCapture to only onClickCapture", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const bubbleHandler = vi.fn();
            const captureHandler = vi.fn();

            await $(container).jsx(
                <div ref={containerRef}>
                    <div
                        class="target"
                        onClick={bubbleHandler}
                        onClickCapture={captureHandler}
                    >
                        Click
                    </div>
                </div>
            );

            container.querySelector(".target")!.click();
            expect(bubbleHandler).toHaveBeenCalledTimes(1);
            expect(captureHandler).toHaveBeenCalledTimes(1);

            // Update: remove bubble, keep capture
            await $(containerRef).jsx(
                <div class="target" onClickCapture={captureHandler}>
                    Click
                </div>
            );

            container.querySelector(".target")!.click();

            // Only capture should fire, bubble should NOT
            expect(bubbleHandler).toHaveBeenCalledTimes(1); // Still 1
            expect(captureHandler).toHaveBeenCalledTimes(2);
        });
    });

    describe("Event Bubbling and Delegation", () => {
        it("should handle events bubbling through nested elements", async () => {
            const parentHandler = vi.fn((e: Event) => e.target);
            const childHandler = vi.fn((e: Event) => e.target);

            await $(container).jsx(
                <div class="parent" onClick={parentHandler}>
                    <div class="child" onClick={childHandler}>
                        <button class="button">Click</button>
                    </div>
                </div>
            );

            const button = container.querySelector(".button")!;
            button.click();

            // Both handlers should fire (bubbling)
            expect(childHandler).toHaveBeenCalled();
            expect(parentHandler).toHaveBeenCalled();
        });

        it("should stopPropagation correctly", async () => {
            const parentHandler = vi.fn();
            const childHandler = vi.fn((e: Event) => e.stopPropagation());

            await $(container).jsx(
                <div class="parent" onClick={parentHandler}>
                    <div class="child" onClick={childHandler}>
                        Click
                    </div>
                </div>
            );

            container.querySelector(".child")!.click();

            expect(childHandler).toHaveBeenCalled();
            expect(parentHandler).not.toHaveBeenCalled();
        });

        it("should handle events on dynamically added elements", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const handler = vi.fn();

            await $(container).jsx(
                <div ref={containerRef}>
                    <button class="btn-1" onClick={handler}>Button 1</button>
                </div>
            );

            // Add another button dynamically
            await $(containerRef).jsx(
                <>
                    <button class="btn-1" onClick={handler}>Button 1</button>
                    <button class="btn-2" onClick={handler}>Button 2</button>
                </>
            );

            container.querySelector(".btn-2")!.click();
            expect(handler).toHaveBeenCalledTimes(1);

            container.querySelector(".btn-1")!.click();
            expect(handler).toHaveBeenCalledTimes(2);
        });
    });

    describe("Multiple Event Types", () => {
        it("should handle multiple events on same element", async () => {
            const clickHandler = vi.fn();
            const mouseEnterHandler = vi.fn();
            const mouseLeaveHandler = vi.fn();

            await $(container).jsx(
                <button
                    onClick={clickHandler}
                    onMouseEnter={mouseEnterHandler}
                    onMouseLeave={mouseLeaveHandler}
                >
                    Hover and Click
                </button>
            );

            const button = container.querySelector("button")!;

            button.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
            expect(mouseEnterHandler).toHaveBeenCalledTimes(1);

            button.click();
            expect(clickHandler).toHaveBeenCalledTimes(1);

            button.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
            expect(mouseLeaveHandler).toHaveBeenCalledTimes(1);
        });

        it("should handle input events", async () => {
            const inputHandler = vi.fn((e: Event) => (e.target as HTMLInputElement).value);
            const changeHandler = vi.fn();

            await $(container).jsx(
                <input
                    type="text"
                    onInput={inputHandler}
                    onChange={changeHandler}
                />
            );

            const input = container.querySelector("input") as HTMLInputElement;

            // Simulate typing
            input.value = "test";
            input.dispatchEvent(new Event("input", { bubbles: true }));
            expect(inputHandler).toHaveBeenCalled();

            input.dispatchEvent(new Event("change", { bubbles: true }));
            expect(changeHandler).toHaveBeenCalled();
        });
    });

    describe("Dequery Event Methods", () => {
        it("should bind events with .on()", async () => {
            await $(container).jsx(<button class="test-btn">Click</button>);

            const handler = vi.fn();
            await $(container).find(".test-btn").on("click", handler);

            container.querySelector(".test-btn")!.click();
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should unbind events with .off()", async () => {
            await $(container).jsx(<button class="test-btn">Click</button>);

            const handler = vi.fn();
            await $(container).find(".test-btn").on("click", handler);

            container.querySelector(".test-btn")!.click();
            expect(handler).toHaveBeenCalledTimes(1);

            await $(container).find(".test-btn").off("click", handler);

            container.querySelector(".test-btn")!.click();
            expect(handler).toHaveBeenCalledTimes(1); // Still 1
        });

        it("should trigger events with .trigger()", async () => {
            const handler = vi.fn();

            await $(container).jsx(<button class="test-btn" onClick={handler}>Click</button>);

            await $(container).find(".test-btn").trigger("click");

            expect(handler).toHaveBeenCalled();
        });
    });

    describe("Edge Cases", () => {
        it("should handle rapid successive clicks", async () => {
            let count = 0;
            const handler = vi.fn(() => count++);

            await $(container).jsx(
                <button onClick={handler}>Click</button>
            );

            const button = container.querySelector("button")!;

            // Rapid clicks
            for (let i = 0; i < 10; i++) {
                button.click();
            }

            expect(handler).toHaveBeenCalledTimes(10);
            expect(count).toBe(10);
        });

        it("should handle handler that modifies DOM", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let counter = 0;

            const handler = async () => {
                counter++;
                await $(containerRef).jsx(
                    <div>
                        <span>Count: {counter}</span>
                        <button onClick={handler}>Increment</button>
                    </div>
                );
            };

            await $(container).jsx(
                <div ref={containerRef}>
                    <span>Count: {counter}</span>
                    <button onClick={handler}>Increment</button>
                </div>
            );

            const button = container.querySelector("button")!;
            button.click();
            await wait(10);

            expect(counter).toBe(1);
            expect(container.textContent).toContain("Count: 1");

            // New button should still work
            const newButton = container.querySelector("button")!;
            newButton.click();
            await wait(10);

            expect(counter).toBe(2);
            expect(container.textContent).toContain("Count: 2");
        });
    });
});
