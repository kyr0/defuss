/**
 * Kitchen Sink Test Suite - Edge Cases and Integration Tests
 * 
 * Tests complex scenarios that combine multiple features:
 * - dangerouslySetInnerHTML
 * - CSS manipulation
 * - Style objects
 * - Real-world component patterns
 * - SVG rendering
 * - Special characters and escaping
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, countElements, getTextContent } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Edge Cases and Integration", () => {
    describe("dangerouslySetInnerHTML", () => {
        it("should render raw HTML", async () => {
            await $(container).jsx(
                <div dangerouslySetInnerHTML={{ __html: "<strong>bold</strong> and <em>italic</em>" }} />
            );

            expect(container.querySelector("strong")?.textContent).toBe("bold");
            expect(container.querySelector("em")?.textContent).toBe("italic");
        });

        it("should skip child reconciliation with dangerouslySetInnerHTML", async () => {
            await $(container).jsx(
                <div dangerouslySetInnerHTML={{ __html: "<p>inner</p>" }}>
                    This child should be ignored
                </div>
            );

            expect(container.querySelector("p")?.textContent).toBe("inner");
            expect(container.textContent).not.toContain("This child should be ignored");
        });
    });

    describe("CSS Manipulation", () => {
        it("should apply style object", async () => {
            await $(container).jsx(
                <div style={{ color: "red", fontSize: "20px", backgroundColor: "blue" }}>
                    styled
                </div>
            );

            const div = container.querySelector("div") as HTMLElement;
            expect(div.style.color).toBe("red");
            expect(div.style.fontSize).toBe("20px");
            expect(div.style.backgroundColor).toBe("blue");
        });

        it("should apply style string", async () => {
            await $(container).jsx(
                <div style="color: green; font-size: 16px;">styled</div>
            );

            const div = container.querySelector("div") as HTMLElement;
            expect(div.style.color).toBe("green");
        });

        it("should update styles via dequery .css()", async () => {
            await $(container).jsx(<div class="target">content</div>);

            await $(container).find(".target").css({
                color: "purple",
                padding: "10px"
            });

            const div = container.querySelector(".target") as HTMLElement;
            expect(div.style.color).toBe("purple");
            expect(div.style.padding).toBe("10px");
        });

        it("should handle class toggling", async () => {
            await $(container).jsx(<div class="target">content</div>);

            await $(container).find(".target").toggleClass("active");
            expect(container.querySelector(".target.active")).toBeTruthy();

            await $(container).find(".target").toggleClass("active");
            expect(container.querySelector(".target.active")).toBeNull();
        });
    });

    describe("SVG Rendering", () => {
        it("should render SVG elements correctly", async () => {
            await $(container).jsx(
                <svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="40" fill="red" />
                    <rect x="10" y="10" width="30" height="30" fill="blue" />
                </svg>
            );

            const svg = container.querySelector("svg");
            expect(svg).toBeTruthy();
            expect(svg?.namespaceURI).toBe("http://www.w3.org/2000/svg");

            const circle = container.querySelector("circle");
            expect(circle).toBeTruthy();
            expect(circle?.getAttribute("cx")).toBe("50");
        });

        it("should handle SVG path elements", async () => {
            await $(container).jsx(
                <svg viewBox="0 0 24 24">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" />
                </svg>
            );

            const path = container.querySelector("path");
            expect(path).toBeTruthy();
            expect(path?.getAttribute("d")).toContain("M12 2L2");
        });
    });

    describe("Special Characters and Escaping", () => {
        it("should escape HTML entities in text content", async () => {
            await $(container).jsx(
                <div>{"<script>alert('xss')</script>"}</div>
            );

            // Should be escaped, not executed
            expect(container.querySelector("script")).toBeNull();
            expect(container.textContent).toContain("<script>");
        });

        it("should handle unicode characters", async () => {
            await $(container).jsx(
                <div>
                    <span class="emoji">🎉</span>
                    <span class="chinese">中文</span>
                    <span class="special">© ® ™</span>
                </div>
            );

            expect(container.querySelector(".emoji")?.textContent).toBe("🎉");
            expect(container.querySelector(".chinese")?.textContent).toBe("中文");
            expect(container.querySelector(".special")?.textContent).toBe("© ® ™");
        });

        it("should handle HTML entities", async () => {
            await $(container).jsx(
                <div>
                    {"&amp; &lt; &gt; &quot; &apos;"}
                </div>
            );

            expect(container.textContent).toContain("&amp;");
        });
    });

    describe("Real-World Component Patterns", () => {
        it("should handle todo list pattern", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({
                todos: [
                    { id: 1, text: "Learn defuss", done: false },
                    { id: 2, text: "Build app", done: false },
                ],
                filter: "all" as "all" | "active" | "completed",
            });

            const TodoItem = ({ todo }: { todo: { id: number; text: string; done: boolean } }) => (
                <li key={todo.id} class={todo.done ? "done" : ""}>
                    <input
                        type="checkbox"
                        checked={todo.done}
                        onChange={() => {
                            store.set({
                                ...store.value,
                                todos: store.value.todos.map((t: { id: number; text: string; done: boolean }) =>
                                    t.id === todo.id ? { ...t, done: !t.done } : t
                                ),
                            });
                        }}
                    />
                    <span>{todo.text}</span>
                </li>
            );

            const TodoList = () => {
                const filtered = store.value.todos.filter((t: { id: number; text: string; done: boolean }) => {
                    if (store.value.filter === "active") return !t.done;
                    if (store.value.filter === "completed") return t.done;
                    return true;
                });

                return (
                    <div>
                        <ul class="todo-list">
                            {filtered.map((todo: { id: number; text: string; done: boolean }) => <TodoItem todo={todo} />)}
                        </ul>
                        <div class="filters">
                            <button onClick={() => store.set({ ...store.value, filter: "all" })}>All</button>
                            <button onClick={() => store.set({ ...store.value, filter: "active" })}>Active</button>
                            <button onClick={() => store.set({ ...store.value, filter: "completed" })}>Completed</button>
                        </div>
                    </div>
                );
            };

            const render = async () => {
                await $(containerRef).jsx(<TodoList />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();
            store.subscribe(render);

            expect(container.querySelectorAll("li").length).toBe(2);

            // Complete first todo
            (container.querySelector("input[type='checkbox']") as HTMLInputElement).click();
            await wait(10);

            expect(container.querySelector("li.done")).toBeTruthy();

            // Filter to active only
            container.querySelectorAll("button")[1].click(); // "Active" button
            await wait(10);

            // Only one todo should be visible
            expect(container.querySelectorAll(".todo-list li").length).toBe(1);
        });

        it("should handle modal pattern with portal-like behavior", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let isOpen = false;

            const Modal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
                if (!open) return null;
                return (
                    <div class="modal-overlay" onClick={onClose}>
                        <div class="modal-content" onClick={(e) => e.stopPropagation()}>
                            <h2>Modal Title</h2>
                            <p>Modal content goes here</p>
                            <button class="close-btn" onClick={onClose}>Close</button>
                        </div>
                    </div>
                );
            };

            const App = () => (
                <div>
                    <button
                        class="open-btn"
                        onClick={() => { isOpen = true; render(); }}
                    >
                        Open Modal
                    </button>
                    <Modal open={isOpen} onClose={() => { isOpen = false; render(); }} />
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<App />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();

            expect(container.querySelector(".modal-overlay")).toBeNull();

            // Open modal
            (container.querySelector(".open-btn") as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".modal-overlay")).toBeTruthy();
            expect(container.querySelector(".modal-content h2")?.textContent).toBe("Modal Title");

            // Close modal
            (container.querySelector(".close-btn") as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".modal-overlay")).toBeNull();
        });

        it("should handle tabs pattern", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let activeTab = 0;

            const TabPanel = ({ active, children }: { active: boolean; children: any }) => (
                <div class={`tab-panel ${active ? "active" : "hidden"}`} style={!active ? { display: "none" } : {}}>
                    {children}
                </div>
            );

            const Tabs = () => (
                <div class="tabs">
                    <div class="tab-buttons">
                        <button class={activeTab === 0 ? "active" : ""} onClick={() => { activeTab = 0; render(); }}>Tab 1</button>
                        <button class={activeTab === 1 ? "active" : ""} onClick={() => { activeTab = 1; render(); }}>Tab 2</button>
                        <button class={activeTab === 2 ? "active" : ""} onClick={() => { activeTab = 2; render(); }}>Tab 3</button>
                    </div>
                    <TabPanel active={activeTab === 0}>Content for Tab 1</TabPanel>
                    <TabPanel active={activeTab === 1}>Content for Tab 2</TabPanel>
                    <TabPanel active={activeTab === 2}>Content for Tab 3</TabPanel>
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<Tabs />);
            };

            await $(container).jsx(<div ref={containerRef}></div>);
            await render();

            expect(container.querySelector(".tab-panel.active")?.textContent).toContain("Tab 1");

            // Switch to tab 2
            (container.querySelectorAll(".tab-buttons button")[1] as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector(".tab-panel.active")?.textContent).toContain("Tab 2");
        });
    });

    describe("Attribute Edge Cases", () => {
        it("should handle data-* attributes", async () => {
            await $(container).jsx(
                <div
                    data-id="123"
                    data-user-name="John Doe"
                    data-complex-value='{"key": "value"}'
                >
                    content
                </div>
            );

            const div = container.querySelector("div") as HTMLElement;
            expect(div.dataset.id).toBe("123");
            expect(div.dataset.userName).toBe("John Doe");
            expect(div.dataset.complexValue).toBe('{"key": "value"}');
        });

        it("should handle aria-* attributes", async () => {
            await $(container).jsx(
                <button
                    aria-label="Close dialog"
                    aria-pressed="false"
                    aria-describedby="tooltip-1"
                >
                    ×
                </button>
            );

            const button = container.querySelector("button")!;
            expect(button.getAttribute("aria-label")).toBe("Close dialog");
            expect(button.getAttribute("aria-pressed")).toBe("false");
        });

        it("should handle null and undefined attributes", async () => {
            const maybeClass: string | null = null;
            const maybeId: string | undefined = undefined;

            await $(container).jsx(
                <div class={maybeClass ?? undefined} id={maybeId ?? undefined}>
                    content
                </div>
            );

            const div = container.querySelector("div")!;
            expect(div.getAttribute("class")).toBeNull();
            expect(div.getAttribute("id")).toBeNull();
        });
    });

    describe("Dequery Traversal Integration", () => {
        it("should find and update nested elements", async () => {
            await $(container).jsx(
                <div class="wrapper">
                    <div class="level-1">
                        <div class="level-2">
                            <span class="target">original</span>
                        </div>
                    </div>
                </div>
            );

            await $(container)
                .find(".wrapper")
                .find(".level-2")
                .find(".target")
                .jsx(<>updated</>);

            expect(container.querySelector(".target")?.textContent).toBe("updated");
        });

        it("should work with siblings and parent traversal", async () => {
            await $(container).jsx(
                <ul>
                    <li class="item-1">1</li>
                    <li class="item-2">2</li>
                    <li class="item-3">3</li>
                </ul>
            );

            // Find item-2, then get its parent
            const parent = await $(container).find(".item-2").parent();
            expect((parent as any)[0]?.tagName).toBe("UL");
        });
    });
});
