/**
 * Kitchen Sink Test Suite - Async Component with Fallback Tests
 * 
 * Tests the pattern requested by the user:
 * ```tsx
 * const AsyncApp = async() => {
 *     await new Promise((resolve) => setTimeout(resolve, 1000));
 *     return (<div>Count: {Math.random()}</div>);
 * };
 * 
 * await render(<AsyncApp fallback={<div>Loading...</div>} />, $("#app"));
 * ```
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { $, render } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, waitForCondition } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
});

describe("Async Component with Fallback", () => {
    describe("Basic Async Function Component", () => {
        it("should show fallback while async component is loading, then show resolved content", async () => {
            // Define an async component exactly as the user requested
            const AsyncApp = async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return (<div class="resolved">Loaded Content</div>);
            };

            // Render with fallback prop
            await render(<AsyncApp fallback={<div class="loading">Loading...</div>} />, container);

            // Initially should show fallback
            expect(container.textContent).toContain("Loading...");
            expect(container.querySelector(".loading")).not.toBeNull();

            // Wait for async component to resolve
            await waitForCondition(() => container.querySelector(".resolved") !== null, 500);

            // Should now show resolved content
            expect(container.textContent).toContain("Loaded Content");
            expect(container.querySelector(".resolved")).not.toBeNull();
            // Fallback should be replaced
            expect(container.querySelector(".loading")).toBeNull();
        });

        it("should work with the exact user example pattern", async () => {
            // Exact pattern from user request
            const AsyncApp = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return (<div>Count: {Math.random()}</div>);
            };

            // Create app container
            container.innerHTML = '<div id="app"></div>';
            const appContainer = container.querySelector("#app") as HTMLDivElement;

            // Render exactly as user specified
            await render(<AsyncApp fallback={<div>Loading...</div>} />, appContainer);

            // Fallback should be visible initially
            expect(appContainer.textContent).toContain("Loading...");

            // Wait for content to load
            await waitForCondition(() => appContainer.textContent?.includes("Count:") ?? false, 300);

            // Content should now be visible
            expect(appContainer.textContent).toContain("Count:");
        });

        it("should pass props to async component", async () => {
            const AsyncGreeting = async ({ name }: { name: string }) => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return (<div class="greeting">Hello, {name}!</div>);
            };

            await render(
                <AsyncGreeting
                    name="World"
                    fallback={<div class="loading">Loading greeting...</div>}
                />,
                container
            );

            // Initially shows fallback
            expect(container.textContent).toContain("Loading greeting...");

            // Wait for resolution
            await waitForCondition(() => container.querySelector(".greeting") !== null, 300);

            // Should show greeting with passed prop
            expect(container.textContent).toContain("Hello, World!");
        });

        it("should handle async component without fallback", async () => {
            const AsyncNoFallback = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return (<div class="no-fallback">No Fallback Content</div>);
            };

            await render(<AsyncNoFallback />, container);

            // Wait for content
            await waitForCondition(() => container.querySelector(".no-fallback") !== null, 300);

            expect(container.textContent).toContain("No Fallback Content");
        });
    });

    describe("Async Component Error Handling", () => {
        it("should handle errors gracefully", async () => {
            const AsyncError = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                throw new Error("Test error");
            };

            await render(
                <AsyncError fallback={<div>Loading...</div>} />,
                container
            );

            // Initially shows fallback
            expect(container.textContent).toContain("Loading...");

            // Wait for error to be displayed
            await waitForCondition(() => container.textContent?.includes("Error") ?? false, 300);

            // Error message should be displayed
            expect(container.textContent).toContain("Error");
            expect(container.textContent).toContain("Test error");
        });
    });

    describe("Multiple Async Components", () => {
        it("should handle multiple async components independently", async () => {
            const AsyncA = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return (<span class="content-a">Content A</span>);
            };

            const AsyncB = async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));
                return (<span class="content-b">Content B</span>);
            };

            await render(
                <div>
                    <AsyncA fallback={<span class="loading-a">Loading A...</span>} />
                    <AsyncB fallback={<span class="loading-b">Loading B...</span>} />
                </div>,
                container
            );

            // Both should show fallbacks initially
            expect(container.textContent).toContain("Loading A...");
            expect(container.textContent).toContain("Loading B...");

            // A should resolve first
            await waitForCondition(() => container.querySelector(".content-a") !== null, 200);
            expect(container.textContent).toContain("Content A");

            // B might still be loading or already resolved
            await waitForCondition(() => container.querySelector(".content-b") !== null, 200);
            expect(container.textContent).toContain("Content B");
        });
    });

    describe("Async Component with Complex Fallback", () => {
        it("should handle complex fallback JSX", async () => {
            const AsyncData = async () => {
                await new Promise((resolve) => setTimeout(resolve, 50));
                return (
                    <div class="data-loaded">
                        <h1>Data Loaded</h1>
                        <p>Some content here</p>
                    </div>
                );
            };

            const fallbackContent = (
                <div class="skeleton">
                    <div class="skeleton-title">████████</div>
                    <div class="skeleton-text">████████████████</div>
                </div>
            );

            await render(
                <AsyncData fallback={fallbackContent} />,
                container
            );

            // Should show skeleton fallback
            expect(container.querySelector(".skeleton")).not.toBeNull();
            expect(container.querySelector(".skeleton-title")).not.toBeNull();

            // Wait for data to load
            await waitForCondition(() => container.querySelector(".data-loaded") !== null, 300);

            // Should show loaded content
            expect(container.querySelector(".data-loaded")).not.toBeNull();
            expect(container.querySelector("h1")?.textContent).toBe("Data Loaded");

            // Skeleton should be replaced
            expect(container.querySelector(".skeleton")).toBeNull();
        });
    });
});
