/**
 * Kitchen Sink Test Suite - Async/Sync Rendering Tests
 * 
 * Tests complex async patterns including:
 * - Async components
 * - Mixed sync/async rendering
 * - Race conditions
 * - Dynamic data loading
 * - Suspense-like patterns
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, waitForCondition, getTextContent } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Async/Sync Rendering", () => {
    describe("Async Components", () => {
        it("should handle async component with delayed render", async () => {
            const containerRef = createRef<HTMLDivElement>();

            // Simulate async data loading
            const loadData = async () => {
                await wait(50);
                return { name: "Loaded Data" };
            };

            // Sync initial render
            await $(container).jsx(
                <div ref={containerRef}>
                    <span class="loading">Loading...</span>
                </div>
            );

            expect(container.textContent).toContain("Loading...");

            // Async update after data loads
            const data = await loadData();
            await $(containerRef).jsx(
                <span class="loaded">{data.name}</span>
            );

            expect(container.textContent).toContain("Loaded Data");
            expect(container.textContent).not.toContain("Loading...");
        });

        it("should handle multiple sequential async updates", async () => {
            const containerRef = createRef<HTMLDivElement>();
            const updates: string[] = [];

            await $(container).jsx(<div ref={containerRef}>initial</div>);
            updates.push("initial");

            for (let i = 1; i <= 5; i++) {
                await wait(10);
                await $(containerRef).jsx(<span>update {i}</span>);
                updates.push(`update ${i}`);
            }

            expect(container.textContent).toContain("update 5");
            expect(updates.length).toBe(6);
        });

        it("should handle async update cancellation pattern", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let cancelled = false;

            await $(container).jsx(<div ref={containerRef}>start</div>);

            // Start async operation
            const asyncOp = async () => {
                await wait(100);
                if (!cancelled) {
                    await $(containerRef).jsx(<span>completed</span>);
                }
            };

            const promise = asyncOp();

            // Cancel before completion
            await wait(20);
            cancelled = true;

            // Do a different update
            await $(containerRef).jsx(<span>cancelled</span>);

            await promise;

            // Should show cancelled, not completed
            expect(container.textContent).toContain("cancelled");
        });
    });

    describe("Mixed Sync/Async Patterns", () => {
        it("should handle sync component returning from async function", async () => {
            const SyncComponent = ({ text }: { text: string }) => (
                <div class="sync">{text}</div>
            );

            const renderAsync = async () => {
                await wait(10);
                return <SyncComponent text="from async" />;
            };

            await $(container).jsx(await renderAsync());

            expect(container.querySelector(".sync")?.textContent).toBe("from async");
        });

        it("should handle dequery chain with multiple async operations", async () => {
            await $(container).jsx(
                <div>
                    <span class="a">a</span>
                    <span class="b">b</span>
                </div>
            );

            // Chain of operations
            await $(container)
                .find(".a")
                .addClass("modified")
                .css({ color: "red" });

            const spanA = container.querySelector(".a") as HTMLElement;
            expect(spanA.classList.contains("modified")).toBe(true);
        });

        it("should handle concurrent updates to different elements", async () => {
            const refA = createRef<HTMLDivElement>();
            const refB = createRef<HTMLDivElement>();

            await $(container).jsx(
                <div>
                    <div ref={refA} class="a">A</div>
                    <div ref={refB} class="b">B</div>
                </div>
            );

            // Concurrent updates
            await Promise.all([
                $(refA).jsx(<span>Updated A</span>),
                $(refB).jsx(<span>Updated B</span>),
            ]);

            expect(container.querySelector(".a")?.textContent).toContain("Updated A");
            expect(container.querySelector(".b")?.textContent).toContain("Updated B");
        });
    });

    describe("Dynamic Data Loading", () => {
        it("should handle paginated data loading", async () => {
            const containerRef = createRef<HTMLUListElement>();

            type Item = { id: number; name: string };

            const fetchPage = async (page: number): Promise<Item[]> => {
                await wait(10);
                return [
                    { id: page * 10 + 1, name: `Item ${page * 10 + 1}` },
                    { id: page * 10 + 2, name: `Item ${page * 10 + 2}` },
                ];
            };

            const renderItems = (items: Item[]) => (
                <>
                    {items.map((item) => (
                        <li key={item.id} data-id={item.id}>
                            {item.name}
                        </li>
                    ))}
                </>
            );

            await $(container).jsx(<ul ref={containerRef}></ul>);

            // Load page 1
            const page1 = await fetchPage(0);
            await $(containerRef).jsx(renderItems(page1));
            expect(container.querySelectorAll("li").length).toBe(2);

            // Load page 2 (append)
            const page2 = await fetchPage(1);
            await $(containerRef).jsx(renderItems([...page1, ...page2]));
            expect(container.querySelectorAll("li").length).toBe(4);
        });

        it("should handle search results with debounced updates", async () => {
            const resultsRef = createRef<HTMLDivElement>();
            let searchVersion = 0;

            await $(container).jsx(
                <div>
                    <div ref={resultsRef} class="results">No results</div>
                </div>
            );

            const search = async (query: string) => {
                const myVersion = ++searchVersion;
                await wait(30); // Simulate API delay

                // Only update if still latest search
                if (myVersion === searchVersion) {
                    const results = query ? [`Result for: ${query}`] : [];
                    await $(resultsRef).jsx(
                        <div>
                            {results.length > 0
                                ? results.map((r, i) => <p key={i}>{r}</p>)
                                : <span>No results</span>
                            }
                        </div>
                    );
                }
            };

            // Rapid fire searches - only last should win
            search("a");
            search("ab");
            await wait(10);
            search("abc");

            await wait(100);

            // Only the final search result should be present
            expect(container.textContent).toContain("Result for: abc");
            // Note: We can't assert absence of "Result for: a" because "Result for: abc" contains it
        });
    });

    describe("Error Handling in Async", () => {
        it("should handle rejection gracefully", async () => {
            const containerRef = createRef<HTMLDivElement>();
            let errorCaught = false;

            await $(container).jsx(
                <div ref={containerRef}>loading</div>
            );

            const loadWithError = async () => {
                await wait(10);
                throw new Error("Load failed");
            };

            try {
                await loadWithError();
            } catch (e) {
                errorCaught = true;
                await $(containerRef).jsx(<span class="error">Error occurred</span>);
            }

            expect(errorCaught).toBe(true);
            expect(container.textContent).toContain("Error occurred");
        });

        it("should handle timeout pattern", async () => {
            const containerRef = createRef<HTMLDivElement>();

            await $(container).jsx(<div ref={containerRef}>loading</div>);

            const loadWithTimeout = async (timeoutMs: number) => {
                const dataPromise = new Promise((resolve) => {
                    setTimeout(() => resolve({ data: "result" }), 100);
                });

                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error("Timeout")), timeoutMs);
                });

                return Promise.race([dataPromise, timeoutPromise]);
            };

            try {
                await loadWithTimeout(20); // Will timeout
                await $(containerRef).jsx(<span>success</span>);
            } catch (e) {
                await $(containerRef).jsx(<span class="timeout">Timed out</span>);
            }

            expect(container.textContent).toContain("Timed out");
        });
    });
});
