/**
 * Kitchen Sink Test Suite - Form State Preservation Tests
 * 
 * Tests form state behaviors including:
 * - Input value preservation during updates
 * - Focus preservation
 * - Controlled vs uncontrolled inputs
 * - Checkbox/radio state
 * - Select element state
 * - Form validation state
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

describe("Form State Preservation", () => {
    describe("Input Value Preservation", () => {
        it("should preserve typed text during unrelated updates", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="text" class="input" />
                    <span class="counter">0</span>
                </div>
            );

            const input = container.querySelector(".input") as HTMLInputElement;
            input.value = "user typed text";
            input.focus();

            // Update unrelated part of DOM - use fragment wrapper
            await $(containerRef).jsx(
                <>
                    <input type="text" class="input" />
                    <span class="counter">1</span>
                </>
            );

            // Input should preserve its value
            const newInput = container.querySelector(".input") as HTMLInputElement;
            expect(newInput.value).toBe("user typed text");
        });

        it("should update value when explicitly controlled", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="text" class="input" value="initial" />
                </div>
            );

            // Explicitly update controlled value
            await $(containerRef).jsx(
                <input type="text" class="input" value="updated" />
            );

            const input = container.querySelector(".input") as HTMLInputElement;
            expect(input.value).toBe("updated");
        });

        it("should handle number inputs correctly", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="number" class="num" value={"42"} />
                </div>
            );

            let input = container.querySelector(".num") as HTMLInputElement;
            expect(input.value).toBe("42");

            await $(containerRef).jsx(
                <input type="number" class="num" value={"100"} />
            );

            input = container.querySelector(".num") as HTMLInputElement;
            expect(input.value).toBe("100");
        });
    });

    describe("Focus Preservation", () => {
        it("should preserve focus during morphing", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="text" class="input-1" />
                    <input type="text" class="input-2" />
                </div>
            );

            const input2 = container.querySelector(".input-2") as HTMLInputElement;
            input2.focus();
            expect(document.activeElement).toBe(input2);

            // Update that shouldn't change focus - use fragment wrapper
            await $(containerRef).jsx(
                <>
                    <input type="text" class="input-1" placeholder="updated" />
                    <input type="text" class="input-2" />
                </>
            );

            const newInput2 = container.querySelector(".input-2") as HTMLInputElement;
            // Focus should be preserved on the same element
            expect(document.activeElement).toBe(newInput2);
        });
    });

    describe("Checkbox and Radio State", () => {
        it("should preserve checkbox state during unrelated updates", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="checkbox" class="cb" />
                    <span class="label">Label</span>
                </div>
            );

            const checkbox = container.querySelector(".cb") as HTMLInputElement;
            checkbox.checked = true;

            // Update label only - use fragment wrapper
            await $(containerRef).jsx(
                <>
                    <input type="checkbox" class="cb" />
                    <span class="label">Updated Label</span>
                </>
            );

            const newCb = container.querySelector(".cb") as HTMLInputElement;
            expect(newCb.checked).toBe(true);
        });

        it("should update checkbox when checked prop is set", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="checkbox" class="cb" checked={false} />
                </div>
            );

            let cb = container.querySelector(".cb") as HTMLInputElement;
            expect(cb.checked).toBe(false);

            await $(containerRef).jsx(
                <input type="checkbox" class="cb" checked={true} />
            );

            cb = container.querySelector(".cb") as HTMLInputElement;
            expect(cb.checked).toBe(true);
        });

        it("should handle radio button groups", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <input type="radio" name="choice" value="a" checked={true} />
                    <input type="radio" name="choice" value="b" checked={false} />
                    <input type="radio" name="choice" value="c" checked={false} />
                </div>
            );

            const radios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
            expect(radios[0].checked).toBe(true);
            expect(radios[1].checked).toBe(false);

            // Update to select different option - use fragment wrapper
            await $(containerRef).jsx(
                <>
                    <input type="radio" name="choice" value="a" checked={false} />
                    <input type="radio" name="choice" value="b" checked={true} />
                    <input type="radio" name="choice" value="c" checked={false} />
                </>
            );

            const newRadios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
            expect(newRadios[0].checked).toBe(false);
            expect(newRadios[1].checked).toBe(true);
        });
    });

    describe("Select Element State", () => {
        it("should preserve select value during unrelated updates", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <select class="sel">
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                    </select>
                    <span>Label</span>
                </div>
            );

            const select = container.querySelector(".sel") as HTMLSelectElement;
            select.value = "b";

            // Update unrelated content - use fragment wrapper
            await $(containerRef).jsx(
                <>
                    <select class="sel">
                        <option value="a">A</option>
                        <option value="b">B</option>
                        <option value="c">C</option>
                    </select>
                    <span>Updated Label</span>
                </>
            );

            const newSelect = container.querySelector(".sel") as HTMLSelectElement;
            expect(newSelect.value).toBe("b");
        });

        it("should update select value when explicitly set", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <select class="sel" value="a">
                        <option value="a">A</option>
                        <option value="b">B</option>
                    </select>
                </div>
            );

            await $(containerRef).jsx(
                <select class="sel" value="b">
                    <option value="a">A</option>
                    <option value="b">B</option>
                </select>
            );

            const select = container.querySelector(".sel") as HTMLSelectElement;
            expect(select.value).toBe("b");
        });
    });

    describe("Textarea State", () => {
        it("should preserve textarea content during unrelated updates", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <textarea class="ta"></textarea>
                    <span>Counter: 0</span>
                </div>
            );

            const ta = container.querySelector(".ta") as HTMLTextAreaElement;
            ta.value = "Multi-line\ntext content";

            await $(containerRef).jsx(
                <>
                    <textarea class="ta"></textarea>
                    <span>Counter: 1</span>
                </>
            );

            const newTa = container.querySelector(".ta") as HTMLTextAreaElement;
            expect(newTa.value).toBe("Multi-line\ntext content");
        });
    });

    describe("Dequery Form Methods", () => {
        it("should get form values with .form()", async () => {
            await $(container).jsx(
                <form class="test-form">
                    <input type="text" name="username" value="john" />
                    <input type="email" name="email" value="john@example.com" />
                    <input type="checkbox" name="subscribe" checked={true} />
                    <select name="country">
                        <option value="us" selected>USA</option>
                        <option value="uk">UK</option>
                    </select>
                </form>
            );

            const formData = await $(container).find(".test-form").form();

            expect(formData).toEqual({
                username: "john",
                email: "john@example.com",
                subscribe: true,
                country: "us",
            });
        });

        it("should set form values with .form(values)", async () => {
            await $(container).jsx(
                <form class="test-form">
                    <input type="text" name="username" value="" />
                    <input type="checkbox" name="active" />
                </form>
            );

            await $(container).find(".test-form").form({
                username: "jane",
                active: true,
            });

            const username = container.querySelector('[name="username"]') as HTMLInputElement;
            const active = container.querySelector('[name="active"]') as HTMLInputElement;

            expect(username.value).toBe("jane");
            expect(active.checked).toBe(true);
        });

        it("should get/set input value with .val()", async () => {
            await $(container).jsx(
                <input type="text" class="test-input" value="initial" />
            );

            const value = await $(container).find(".test-input").val();
            expect(value).toBe("initial");

            await $(container).find(".test-input").val("updated");

            const input = container.querySelector(".test-input") as HTMLInputElement;
            expect(input.value).toBe("updated");
        });

        it("should serialize form with .serialize()", async () => {
            await $(container).jsx(
                <form class="test-form">
                    <input type="text" name="a" value="1" />
                    <input type="text" name="b" value="2" />
                </form>
            );

            const serialized = await $(container).find(".test-form").serialize();
            expect(serialized).toContain("a=1");
            expect(serialized).toContain("b=2");
        });
    });

    describe("Counter Pattern (Real World)", () => {
        it("should handle increment/decrement with state updates", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let count = 0;

            const Counter = () => (
                <div>
                    <button class="dec" onClick={() => { count--; rerender(); }}>-</button>
                    <span class="value">{String(count)}</span>
                    <button class="inc" onClick={() => { count++; rerender(); }}>+</button>
                </div>
            );

            const rerender = async () => {
                await $(containerRef).jsx(<Counter />);
            };

            await $(container).jsx(<div ref={containerRef}><Counter /></div>);

            expect(container.querySelector(".value")?.textContent).toBe("0");

            (container.querySelector(".inc") as HTMLButtonElement).click();
            await wait(10);
            expect(container.querySelector(".value")?.textContent).toBe("1");

            (container.querySelector(".inc") as HTMLButtonElement).click();
            await wait(10);
            expect(container.querySelector(".value")?.textContent).toBe("2");

            (container.querySelector(".dec") as HTMLButtonElement).click();
            await wait(10);
            expect(container.querySelector(".value")?.textContent).toBe("1");
        });
    });
});

