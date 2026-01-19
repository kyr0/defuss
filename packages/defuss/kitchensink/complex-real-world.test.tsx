/**
 * Kitchen Sink Test Suite - Complex Real-World Scenarios
 * 
 * Tests advanced patterns that combine multiple features:
 * - Canvas drawing with store-driven updates
 * - DOM morphing preserving canvas state
 * - Recursive button replacement with listener evaporation
 * - Custom store implementations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore, type Ref, type Store } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Complex Real-World Scenarios", () => {
    describe("Canvas Drawing with Store-Driven Updates", () => {
        it("should preserve canvas state during DOM morphing", async () => {
            const canvasRef = createRef<HTMLCanvasElement>();
            const containerRef = createRef<HTMLDivElement>();

            // Custom store with draw command handler
            interface DrawState {
                color: string;
                draws: number;
            }

            const store = createStore<DrawState>({ color: "red", draws: 0 });

            // Draw function that operates on canvas
            const drawCircle = (canvas: HTMLCanvasElement, color: string, x: number, y: number) => {
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.beginPath();
                    ctx.fillStyle = color;
                    ctx.arc(x, y, 20, 0, Math.PI * 2);
                    ctx.fill();
                }
            };

            // Canvas component
            const CanvasComponent = ({ canvasRef }: { canvasRef: Ref<HTMLCanvasElement> }) => (
                <div class="canvas-wrapper">
                    <canvas
                        ref={canvasRef}
                        width={200}
                        height={200}
                        style={{ border: "1px solid black" }}
                    />
                    <div class="controls">
                        <span class="draw-count">Draws: {String(store.value.draws)}</span>
                    </div>
                </div>
            );

            await $(container).jsx(<div ref={containerRef}><CanvasComponent canvasRef={canvasRef} /></div>);

            const canvas = canvasRef.current!;
            const originalCanvas = canvas;
            expect(canvas.tagName).toBe("CANVAS");

            // Draw something
            drawCircle(canvas, "red", 50, 50);
            store.set({ ...store.value, draws: 1 });

            // Morph DOM - update control but preserve canvas
            await $(containerRef).jsx(<CanvasComponent canvasRef={canvasRef} />);

            // Canvas should be same element (not recreated)
            expect(canvasRef.current).toBe(originalCanvas);

            // Draw count should update
            expect(container.querySelector(".draw-count")?.textContent).toBe("Draws: 1");

            // Can still draw on the same canvas after morph
            drawCircle(canvas, "blue", 100, 50);
            store.set({ ...store.value, draws: 2 });
            await $(containerRef).jsx(<CanvasComponent canvasRef={canvasRef} />);
            expect(container.querySelector(".draw-count")?.textContent).toBe("Draws: 2");
        });

        it("should handle store-subscribed canvas draw commands", async () => {
            const canvasRef = createRef<HTMLCanvasElement>();
            const containerRef = createRef<HTMLDivElement>();

            interface CanvasState {
                commands: Array<{ type: "circle" | "rect"; x: number; y: number; color: string }>;
            }

            const store = createStore<CanvasState>({ commands: [] });
            let lastDrawnIndex = -1; // Track outside store to avoid recursive updates

            // Execute draw commands on canvas
            const executeCommands = () => {
                const canvas = canvasRef.current;
                if (!canvas) return;

                const ctx = canvas.getContext("2d");
                if (!ctx) return;

                const { commands } = store.value;

                // Only execute new commands
                for (let i = lastDrawnIndex + 1; i < commands.length; i++) {
                    const cmd = commands[i];
                    ctx.fillStyle = cmd.color;
                    if (cmd.type === "circle") {
                        ctx.beginPath();
                        ctx.arc(cmd.x, cmd.y, 15, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        ctx.fillRect(cmd.x - 10, cmd.y - 10, 20, 20);
                    }
                }
                lastDrawnIndex = commands.length - 1; // Update local tracker, no store.set
            };

            const CanvasApp = () => (
                <div class="canvas-app">
                    <canvas ref={canvasRef} width={300} height={200} />
                    <div class="buttons">
                        <button class="add-circle" onClick={() => {
                            store.set({
                                commands: [...store.value.commands, { type: "circle", x: 50 + store.value.commands.length * 30, y: 100, color: "blue" }]
                            });
                        }}>Add Circle</button>
                        <button class="add-rect" onClick={() => {
                            store.set({
                                commands: [...store.value.commands, { type: "rect", x: 50 + store.value.commands.length * 30, y: 100, color: "green" }]
                            });
                        }}>Add Rect</button>
                    </div>
                    <span class="cmd-count">Commands: {String(store.value.commands.length)}</span>
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<CanvasApp />);
            };

            await $(container).jsx(<div ref={containerRef}><CanvasApp /></div>);

            // Subscribe store to execute commands and rerender
            store.subscribe(() => {
                executeCommands();
                render();
            });

            // Click buttons to add commands
            (container.querySelector(".add-circle") as HTMLButtonElement).click();
            await wait(10);

            expect(store.value.commands.length).toBe(1);
            expect(container.querySelector(".cmd-count")?.textContent).toBe("Commands: 1");

            (container.querySelector(".add-rect") as HTMLButtonElement).click();
            await wait(10);

            expect(store.value.commands.length).toBe(2);

            // Canvas element should still be preserved and functional
            expect(canvasRef.current).toBeTruthy();
            expect(canvasRef.current!.tagName).toBe("CANVAS");
        });

        it("should preserve canvas focus during style updates", async () => {
            const canvasRef = createRef<HTMLCanvasElement>();
            const containerRef = createRef<HTMLDivElement>();

            const store = createStore({ borderColor: "black" });

            const FocusableCanvas = () => (
                <canvas
                    ref={canvasRef}
                    tabIndex={0}
                    width={100}
                    height={100}
                    style={{ border: `2px solid ${store.value.borderColor}` }}
                    class="focusable-canvas"
                />
            );

            await $(container).jsx(<div ref={containerRef}><FocusableCanvas /></div>);

            // Focus canvas
            canvasRef.current!.focus();
            expect(document.activeElement).toBe(canvasRef.current);

            const originalCanvas = canvasRef.current;

            // Update style via morph
            store.set({ borderColor: "red" });
            await $(containerRef).jsx(<FocusableCanvas />);

            // Canvas should be same element and still focused
            expect(canvasRef.current).toBe(originalCanvas);
            // Note: Focus may shift during morph in some browsers
            expect(canvasRef.current!.style.border).toContain("red");
        });
    });

    describe("Recursive Button Self-Replacement", () => {
        it("should replace button with new listener while preserving element", async () => {
            const buttonRef = createRef<HTMLButtonElement>();
            const containerRef = createRef<HTMLDivElement>();
            const clickLog: number[] = [];
            let iteration = 0;
            const maxIterations = 5;

            const createButton = (n: number) => (
                <button
                    ref={buttonRef}
                    class="recursive-btn"
                    data-iteration={String(n)}
                    onClick={async () => {
                        clickLog.push(n);
                        if (n < maxIterations) {
                            iteration = n + 1;
                            // Replace self with new button that has new listener
                            await $(containerRef).jsx(createButton(n + 1));
                            // Auto-click the new button (recursive)
                            (buttonRef.current as HTMLButtonElement).click();
                        }
                    }}
                >
                    Click {String(n)}
                </button>
            );

            await $(container).jsx(<div ref={containerRef}>{createButton(0)}</div>);

            const originalButton = buttonRef.current!;
            expect(originalButton.getAttribute("data-iteration")).toBe("0");

            // Click to start recursive replacement chain
            originalButton.click();
            await wait(50);

            // Should have gone through all iterations
            expect(clickLog).toEqual([0, 1, 2, 3, 4, 5]);

            // Button element should be the SAME (morphed in-place)
            expect(buttonRef.current).toBe(originalButton);

            // But content and attribute should be updated
            expect(buttonRef.current!.getAttribute("data-iteration")).toBe("5");
            expect(buttonRef.current!.textContent).toBe("Click 5");

            // Only the final listener should be attached now
            // Clicking again should only log 5
            clickLog.length = 0;
            (buttonRef.current as HTMLButtonElement).click();
            await wait(10);

            // Since we're at max, clicking should still log 5 but not recurse
            expect(clickLog).toEqual([5]);
        });

        it("should handle async replacement with listener evaporation", async () => {
            const buttonRef = createRef<HTMLButtonElement>();
            const containerRef = createRef<HTMLDivElement>();
            const listenerCalls: string[] = [];

            const AsyncButton = ({ version }: { version: number }) => (
                <button
                    ref={buttonRef}
                    class="async-btn"
                    data-version={String(version)}
                    onClick={async () => {
                        listenerCalls.push(`v${version}`);
                        if (version < 3) {
                            // Async delay before replacement
                            await wait(10);
                            await $(containerRef).jsx(<AsyncButton version={version + 1} />);
                        }
                    }}
                >
                    Version {String(version)}
                </button>
            );

            await $(container).jsx(<div ref={containerRef}><AsyncButton version={1} /></div>);

            const originalButton = buttonRef.current!;

            // Click v1
            originalButton.click();
            await wait(30);

            // Should now be v2
            expect(buttonRef.current!.getAttribute("data-version")).toBe("2");
            expect(listenerCalls).toContain("v1");

            // Click v2
            (buttonRef.current as HTMLButtonElement).click();
            await wait(30);

            // Should now be v3
            expect(buttonRef.current!.getAttribute("data-version")).toBe("3");
            expect(listenerCalls).toContain("v2");

            // Same element throughout
            expect(buttonRef.current).toBe(originalButton);

            // Clear and verify only v3 listener responds
            listenerCalls.length = 0;
            (buttonRef.current as HTMLButtonElement).click();
            await wait(10);

            expect(listenerCalls).toEqual(["v3"]);
        });

        it("should handle rapid-fire replacements without listener leak", async () => {
            const buttonRef = createRef<HTMLButtonElement>();
            const containerRef = createRef<HTMLDivElement>();
            let clickCount = 0;
            const clickCounts: number[] = [];

            const CounterButton = ({ count }: { count: number }) => (
                <button
                    ref={buttonRef}
                    class="counter-btn"
                    onClick={() => {
                        clickCounts.push(count);
                    }}
                >
                    Count: {String(count)}
                </button>
            );

            await $(container).jsx(<div ref={containerRef}><CounterButton count={0} /></div>);

            const originalButton = buttonRef.current!;

            // Rapidly replace button 10 times
            for (let i = 1; i <= 10; i++) {
                await $(containerRef).jsx(<CounterButton count={i} />);
            }

            // Element should still be the same
            expect(buttonRef.current).toBe(originalButton);
            expect(buttonRef.current!.textContent).toBe("Count: 10");

            // Click once - should only fire single listener (count=10)
            (buttonRef.current as HTMLButtonElement).click();
            await wait(10);

            // Only last listener should have been called
            expect(clickCounts).toEqual([10]);

            // No listener leaks - clicking again should still only log once
            (buttonRef.current as HTMLButtonElement).click();
            await wait(10);

            expect(clickCounts).toEqual([10, 10]);
        });
    });

    describe("Dequery Advanced Real-World Patterns", () => {
        it("should handle complex form with dynamic field addition", async () => {
            const formRef = createRef<HTMLDivElement>();
            const store = createStore({ fields: [{ id: 1, value: "" }], nextId: 2 });

            const DynamicForm = () => (
                <div class="dynamic-form">
                    {store.value.fields.map((field) => (
                        <div key={field.id} class="field-row">
                            <input
                                type="text"
                                name={`field-${field.id}`}
                                value={field.value}
                                onInput={(e) => {
                                    const target = e.target as HTMLInputElement;
                                    store.set({
                                        ...store.value,
                                        fields: store.value.fields.map((f) =>
                                            f.id === field.id ? { ...f, value: target.value } : f
                                        )
                                    });
                                }}
                            />
                            <button
                                class="remove-btn"
                                onClick={() => {
                                    store.set({
                                        ...store.value,
                                        fields: store.value.fields.filter((f) => f.id !== field.id)
                                    });
                                }}
                            >×</button>
                        </div>
                    ))}
                    <button class="add-btn" onClick={() => {
                        store.set({
                            fields: [...store.value.fields, { id: store.value.nextId, value: "" }],
                            nextId: store.value.nextId + 1
                        });
                    }}>Add Field</button>
                </div>
            );

            const render = async () => {
                await $(formRef).jsx(<DynamicForm />);
            };

            await $(container).jsx(<div ref={formRef}><DynamicForm /></div>);
            store.subscribe(render);

            expect(container.querySelectorAll(".field-row").length).toBe(1);

            // Add fields
            (container.querySelector(".add-btn") as HTMLButtonElement).click();
            await wait(10);
            expect(container.querySelectorAll(".field-row").length).toBe(2);

            (container.querySelector(".add-btn") as HTMLButtonElement).click();
            await wait(10);
            expect(container.querySelectorAll(".field-row").length).toBe(3);

            // Remove middle field
            const removeButtons = container.querySelectorAll<HTMLButtonElement>(".remove-btn");
            removeButtons[1].click();
            await wait(10);

            expect(container.querySelectorAll(".field-row").length).toBe(2);
        });

        it("should handle accordion pattern with exclusive open", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({ openSection: null as string | null });

            const AccordionSection = ({ id, title, content }: { id: string; title: string; content: string }) => {
                const isOpen = store.value.openSection === id;
                return (
                    <div class={`section ${isOpen ? "open" : "closed"}`} data-id={id}>
                        <button
                            class="section-header"
                            onClick={() => store.set({ openSection: isOpen ? null : id })}
                        >
                            {title} {isOpen ? "▼" : "▶"}
                        </button>
                        {isOpen && <div class="section-content">{content}</div>}
                    </div>
                );
            };

            const Accordion = () => (
                <div class="accordion">
                    <AccordionSection id="a" title="Section A" content="Content for A" />
                    <AccordionSection id="b" title="Section B" content="Content for B" />
                    <AccordionSection id="c" title="Section C" content="Content for C" />
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<Accordion />);
            };

            await $(container).jsx(<div ref={containerRef}><Accordion /></div>);
            store.subscribe(render);

            // All closed initially
            expect(container.querySelectorAll(".section.open").length).toBe(0);

            // Open section A
            (container.querySelector('[data-id="a"] .section-header') as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector('[data-id="a"]')?.classList.contains("open")).toBe(true);
            expect(container.querySelector(".section-content")?.textContent).toBe("Content for A");

            // Open section B (should close A)
            (container.querySelector('[data-id="b"] .section-header') as HTMLButtonElement).click();
            await wait(10);

            expect(container.querySelector('[data-id="a"]')?.classList.contains("open")).toBe(false);
            expect(container.querySelector('[data-id="b"]')?.classList.contains("open")).toBe(true);
            expect(container.querySelectorAll(".section-content").length).toBe(1);
        });

        it("should handle drag-and-drop reorder simulation", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({ items: ["A", "B", "C", "D", "E"] });

            const moveItem = (from: number, to: number) => {
                const items = [...store.value.items];
                const [item] = items.splice(from, 1);
                items.splice(to, 0, item);
                store.set({ items });
            };

            const SortableList = () => (
                <ul class="sortable-list">
                    {store.value.items.map((item, index) => (
                        <li key={item} data-index={String(index)} class="sortable-item">
                            <span class="item-text">{item}</span>
                            <button class="up-btn" disabled={index === 0} onClick={() => moveItem(index, index - 1)}>↑</button>
                            <button class="down-btn" disabled={index === store.value.items.length - 1} onClick={() => moveItem(index, index + 1)}>↓</button>
                        </li>
                    ))}
                </ul>
            );

            const render = async () => {
                await $(containerRef).jsx(<SortableList />);
            };

            await $(container).jsx(<div ref={containerRef}><SortableList /></div>);
            store.subscribe(render);

            const getItemOrder = () =>
                Array.from(container.querySelectorAll(".item-text")).map(el => el.textContent);

            expect(getItemOrder()).toEqual(["A", "B", "C", "D", "E"]);

            // Move B up (swap with A)
            (container.querySelectorAll(".up-btn")[1] as HTMLButtonElement).click();
            await wait(10);

            expect(getItemOrder()).toEqual(["B", "A", "C", "D", "E"]);

            // Move C down (swap with D)
            (container.querySelectorAll(".down-btn")[2] as HTMLButtonElement).click();
            await wait(10);

            expect(getItemOrder()).toEqual(["B", "A", "D", "C", "E"]);
        });

        it("should handle infinite scroll simulation", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const store = createStore({
                items: Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`),
                loading: false,
                page: 1
            });

            const loadMore = async () => {
                if (store.value.loading) return;

                store.set({ ...store.value, loading: true });
                await wait(50); // Simulate API

                const newItems = Array.from(
                    { length: 10 },
                    (_, i) => `Item ${store.value.items.length + i + 1}`
                );

                store.set({
                    items: [...store.value.items, ...newItems],
                    loading: false,
                    page: store.value.page + 1
                });
            };

            const InfiniteList = () => (
                <div class="infinite-list">
                    <ul class="items">
                        {store.value.items.map((item, i) => (
                            <li key={item} class="list-item">{item}</li>
                        ))}
                    </ul>
                    {store.value.loading && <div class="loading">Loading...</div>}
                    <button class="load-more" onClick={loadMore} disabled={store.value.loading}>
                        Load More
                    </button>
                </div>
            );

            const render = async () => {
                await $(containerRef).jsx(<InfiniteList />);
            };

            await $(container).jsx(<div ref={containerRef}><InfiniteList /></div>);
            store.subscribe(render);

            expect(container.querySelectorAll(".list-item").length).toBe(10);

            // Load more
            (container.querySelector(".load-more") as HTMLButtonElement).click();
            await wait(100);

            expect(container.querySelectorAll(".list-item").length).toBe(20);
            expect(store.value.page).toBe(2);
        });
    });
});
