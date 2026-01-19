/**
 * Kitchen Sink Test Suite - DOM Morphing Tests
 * 
 * Tests DOM morphing behaviors including:
 * - In-place updates
 * - Key-based reordering
 * - List additions/removals
 * - Attribute patching
 * - Text node updates
 * - Structure preservation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { $, createRef } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, countElements, getTextContent, nextTick } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("DOM Morphing", () => {
    describe("In-Place Updates", () => {
        it("should update text content without replacing element", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <span class="text">original</span>
                </div>
            );

            const spanBefore = container.querySelector(".text");

            await $(containerRef).jsx(
                <span class="text">updated</span>
            );

            const spanAfter = container.querySelector(".text");

            // Same element should be reused (morphed)
            expect(spanBefore).toBe(spanAfter);
            expect(getTextContent(spanAfter)).toBe("updated");
        });

        it("should update attributes without replacing element", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <div class="box" data-state="inactive" title="Original"></div>
                </div>
            );

            const boxBefore = container.querySelector(".box") as HTMLElement;
            expect(boxBefore.dataset.state).toBe("inactive");

            // Same class = element identity preserved
            await $(containerRef).jsx(
                <div class="box" data-state="active" title="Updated"></div>
            );

            const boxAfter = container.querySelector(".box") as HTMLElement;

            // Same element when class unchanged, different attributes updated
            expect(boxBefore).toBe(boxAfter);
            expect(boxAfter.dataset.state).toBe("active");
            expect(boxAfter.title).toBe("Updated");
        });

        it("should remove attributes not present in new vdom", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <div class="item" data-old="value" title="has-title"></div>
                </div>
            );

            await $(containerRef).jsx(
                <div class="item"></div>
            );

            const item = container.querySelector(".item") as HTMLElement;
            expect(item.hasAttribute("data-old")).toBe(false);
            expect(item.hasAttribute("title")).toBe(false);
        });
    });

    describe("Keyed List Reordering", () => {
        it("should reorder list items by key", async () => {
            const containerRef = createRef<HTMLUListElement>();

            const render = (items: string[]) => (
                <>
                    {items.map((item) => (
                        <li key={item} data-key={item}>
                            {item}
                        </li>
                    ))}
                </>
            );

            await $(container).jsx(<ul ref={containerRef}>{render(["a", "b", "c"])}</ul>);

            const itemsBeforeA = container.querySelector('[data-key="a"]');
            const itemsBeforeB = container.querySelector('[data-key="b"]');
            const itemsBeforeC = container.querySelector('[data-key="c"]');

            // Reverse order
            await $(containerRef).jsx(render(["c", "b", "a"]));

            const itemsAfterA = container.querySelector('[data-key="a"]');
            const itemsAfterB = container.querySelector('[data-key="b"]');
            const itemsAfterC = container.querySelector('[data-key="c"]');

            // Same elements, just reordered
            expect(itemsBeforeA).toBe(itemsAfterA);
            expect(itemsBeforeB).toBe(itemsAfterB);
            expect(itemsBeforeC).toBe(itemsAfterC);

            // Correct order in DOM
            const lis = container.querySelectorAll("li");
            expect(lis[0].dataset.key).toBe("c");
            expect(lis[1].dataset.key).toBe("b");
            expect(lis[2].dataset.key).toBe("a");
        });

        it("should handle insertion in keyed list", async () => {
            const containerRef = createRef<HTMLUListElement>();

            const render = (items: string[]) => (
                <>
                    {items.map((item) => (
                        <li key={item} data-key={item}>
                            {item}
                        </li>
                    ))}
                </>
            );

            await $(container).jsx(<ul ref={containerRef}>{render(["a", "c"])}</ul>);

            // Insert "b" in the middle
            await $(containerRef).jsx(render(["a", "b", "c"]));

            const lis = container.querySelectorAll("li");
            expect(lis.length).toBe(3);
            expect(lis[0].dataset.key).toBe("a");
            expect(lis[1].dataset.key).toBe("b");
            expect(lis[2].dataset.key).toBe("c");
        });

        it("should handle removal from keyed list", async () => {
            const containerRef = createRef<HTMLUListElement>();

            const render = (items: string[]) => (
                <>
                    {items.map((item) => (
                        <li key={item} data-key={item}>
                            {item}
                        </li>
                    ))}
                </>
            );

            await $(container).jsx(<ul ref={containerRef}>{render(["a", "b", "c"])}</ul>);

            const itemB = container.querySelector('[data-key="b"]');

            // Remove "b"
            await $(containerRef).jsx(render(["a", "c"]));

            const lis = container.querySelectorAll("li");
            expect(lis.length).toBe(2);
            expect(container.querySelector('[data-key="b"]')).toBeNull();

            // a and c should still be there
            expect(container.querySelector('[data-key="a"]')).toBeTruthy();
            expect(container.querySelector('[data-key="c"]')).toBeTruthy();
        });
    });

    describe("Complex Morphing Scenarios", () => {
        it("should handle type changes (same key, different tag)", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <span class="item">text</span>
                </div>
            );

            // Change from span to div
            await $(containerRef).jsx(
                <div class="item">text</div>
            );

            expect(container.querySelector("span")).toBeNull();
            expect(container.querySelector("div.item")).toBeTruthy();
        });

        it("should preserve nested structure during partial update", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <div class="parent">
                        <div class="child">
                            <span class="deep">deep content</span>
                        </div>
                    </div>
                </div>
            );

            // Update parent class - with class-aware matching, parent is recreated
            // but structure and content remain correct
            await $(containerRef).jsx(
                <div class="parent modified">
                    <div class="child">
                        <span class="deep">deep content</span>
                    </div>
                </div>
            );

            const deepAfter = container.querySelector(".deep");
            const parent = container.querySelector(".parent");

            // Structure and content preserved correctly
            expect(deepAfter).toBeTruthy();
            expect(getTextContent(deepAfter)).toBe("deep content");
            expect(parent?.classList.contains("modified")).toBe(true);
            expect(parent?.classList.contains("parent")).toBe(true);
        });

        it("should handle mix of keyed and unkeyed children", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div ref={containerRef}>
                    <span>unkeyed1</span>
                    <span key="a">keyed-a</span>
                    <span>unkeyed2</span>
                    <span key="b">keyed-b</span>
                </div>
            );

            // Swap keyed, keep unkeyed
            await $(containerRef).jsx(
                <div>
                    <span>unkeyed1</span>
                    <span key="b">keyed-b</span>
                    <span>unkeyed2</span>
                    <span key="a">keyed-a</span>
                </div>
            );

            const spans = container.querySelectorAll("span");
            expect(spans.length).toBe(4);
            expect(getTextContent(spans[1])).toBe("keyed-b");
            expect(getTextContent(spans[3])).toBe("keyed-a");
        });
    });

    describe("Table Morphing", () => {
        it("should morph table rows correctly", async () => {
            const containerRef = createRef<HTMLTableSectionElement>();

            type Row = { id: number; name: string; value: number };

            const renderRows = (rows: Row[]) => (
                <>
                    {rows.map((row) => (
                        <tr key={row.id} data-id={row.id}>
                            <td>{row.name}</td>
                            <td>{row.value}</td>
                        </tr>
                    ))}
                </>
            );

            await $(container).jsx(
                <table>
                    <tbody ref={containerRef}>
                        {renderRows([
                            { id: 1, name: "Row 1", value: 100 },
                            { id: 2, name: "Row 2", value: 200 },
                        ])}
                    </tbody>
                </table>
            );

            // Update values, reorder
            await $(containerRef).jsx(
                renderRows([
                    { id: 2, name: "Row 2 Updated", value: 250 },
                    { id: 1, name: "Row 1", value: 150 },
                    { id: 3, name: "Row 3", value: 300 },
                ])
            );

            const rows = container.querySelectorAll("tr");
            expect(rows.length).toBe(3);
            expect(rows[0].dataset.id).toBe("2");
            expect(rows[0].querySelector("td")?.textContent).toBe("Row 2 Updated");
        });
    });

    describe("Shadow DOM Compatibility", () => {
        it("should handle custom element with shadow root", async () => {
            // Define a simple custom element
            class TestElement extends HTMLElement {
                constructor() {
                    super();
                    this.attachShadow({ mode: "open" });
                }
                connectedCallback() {
                    if (this.shadowRoot) {
                        this.shadowRoot.innerHTML = "<slot></slot>";
                    }
                }
            }

            if (!customElements.get("test-shadow-element")) {
                customElements.define("test-shadow-element", TestElement);
            }

            await $(container).jsx(
                <div>
                    <test-shadow-element>
                        <span>slotted content</span>
                    </test-shadow-element>
                </div>
            );

            const customEl = container.querySelector("test-shadow-element");
            expect(customEl).toBeTruthy();
            expect(customEl?.querySelector("span")?.textContent).toBe("slotted content");
        });
    });
});
