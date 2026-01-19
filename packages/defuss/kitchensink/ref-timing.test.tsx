/**
 * Kitchen Sink Test Suite - Ref Timing Tests
 * 
 * Tests for ref timing issues when dequery chains are started
 * before the component's JSX is rendered.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { $, createRef, type Ref } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Ref Timing Edge Cases", () => {
    describe("Dequery chain with ref before JSX render", () => {
        it("should NOT timeout when ref chain is started before JSX render (sync pattern)", async () => {
            // This replicates the LoginScreen pattern where $(ref).query().on() 
            // is called BEFORE the JSX is returned

            const formRef = createRef<HTMLFormElement>();
            let keydownCalled = false;

            // This is the problematic pattern - starting the chain before JSX renders
            // Must NOT await here - this is how the LoginScreen code works
            const chainPromise = $(formRef).query("input").on("keydown", () => {
                keydownCalled = true;
            });

            // NOW render the JSX - this should populate formRef.current
            await $(container).jsx(
                <form ref={formRef}>
                    <input type="text" name="email" />
                </form>
            );

            // Verify ref is populated
            expect(formRef.current).toBeInstanceOf(HTMLFormElement);

            // The chain should resolve without timeout
            // Wait for the chain to complete (it should NOT take 5 seconds!)
            const startTime = Date.now();
            await chainPromise;
            const elapsed = Date.now() - startTime;

            // Should complete well under the 5000ms timeout
            expect(elapsed).toBeLessThan(1000);
        });

        it("should work when ref is populated before chain starts", async () => {
            const formRef = createRef<HTMLFormElement>();

            // Render first - ref is populated
            await $(container).jsx(
                <form ref={formRef}>
                    <input type="text" name="email" />
                </form>
            );

            expect(formRef.current).toBeInstanceOf(HTMLFormElement);

            // Now start the chain - should work immediately
            let keydownCalled = false;
            await $(formRef).query("input").on("keydown", () => {
                keydownCalled = true;
            });

            // Trigger keydown
            const input = container.querySelector("input")!;
            input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

            expect(keydownCalled).toBe(true);
        });

        it("should handle async component-like pattern", async () => {
            // This simulates a more controlled component pattern
            const buttonRef = createRef<HTMLButtonElement>();
            let clicked = false;

            // Component-like function that sets up listeners and returns JSX
            const MyComponent = () => {
                // Set up listener (this starts before JSX renders in component context)
                $(buttonRef).on("click", () => {
                    clicked = true;
                });

                return (
                    <div>
                        <button ref={buttonRef}>Click me</button>
                    </div>
                );
            };

            // Render the component
            await $(container).jsx(<MyComponent />);

            // Give the autoStart a chance to kick in
            await wait(50);

            // Button should be rendered
            const button = container.querySelector("button");
            expect(button).toBeInstanceOf(HTMLButtonElement);

            // Click and verify listener works
            button!.click();

            // Give time for event propagation
            await wait(10);

            expect(clicked).toBe(true);
        });

        it("should handle multiple refs in same component", async () => {
            const inputRef = createRef<HTMLInputElement>();
            const buttonRef = createRef<HTMLButtonElement>();

            let inputValue = "";

            // Multiple chains started before JSX
            $(inputRef).on("input", (e) => {
                inputValue = (e.target as HTMLInputElement).value;
            });

            $(buttonRef).on("click", () => {
                console.log("Button clicked, input value:", inputValue);
            });

            // Render JSX
            await $(container).jsx(
                <form>
                    <input ref={inputRef} type="text" />
                    <button ref={buttonRef}>Submit</button>
                </form>
            );

            // Wait for autoStart
            await wait(50);

            // Verify refs
            expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
            expect(buttonRef.current).toBeInstanceOf(HTMLButtonElement);

            // Test input event
            inputRef.current!.value = "test value";
            inputRef.current!.dispatchEvent(new Event("input", { bubbles: true }));

            expect(inputValue).toBe("test value");
        });
    });

    describe("Ref waiting behavior", () => {
        it("should poll for ref.current until populated", async () => {
            const ref = createRef<HTMLDivElement>();

            // Start waiting for ref (but don't populate it yet)
            const chainPromise = $(ref).addClass("found");

            // Wait a bit to ensure polling has started
            await wait(50);

            // Now populate the ref
            await $(container).jsx(<div ref={ref}>Test</div>);

            // Chain should resolve quickly after ref is populated
            await chainPromise;

            expect(ref.current?.classList.contains("found")).toBe(true);
        });

        it("should timeout when ref is never populated", async () => {
            const neverPopulatedRef = createRef<HTMLDivElement>();

            // Use a short timeout for testing
            const chain = $<HTMLDivElement>(neverPopulatedRef);
            chain.options.timeout = 100; // Short timeout for test

            await expect(chain.addClass("never")).rejects.toThrow(/timeout/i);
        });
    });
});
