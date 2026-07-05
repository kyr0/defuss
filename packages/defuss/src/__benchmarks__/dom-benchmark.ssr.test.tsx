import { describe, expect, it, afterAll, beforeEach } from "vitest";
import { renderSync as renderSSR, getBrowserGlobals, type Globals } from "../render/server.js";
import { buildData, type Row, assertElementCount, resetIdCounter } from "./benchmark-utils.js";
import { Table } from "./components/Table.js";
import { writeMetrics } from "./metrics-writer.js";
import type { BenchMetric } from "./metric-types.js";

/**
 * SSR (Server-Side Rendering) DOM benchmarks.
 * Uses the server.ts rendering path with happy-dom Window globals.
 * Run with: bun run bench:ssr
 */

const collectedMetrics: BenchMetric[] = [];

afterAll(async () => {
    if (collectedMetrics.length === 0) return;
    await writeMetrics(collectedMetrics, "bench-dom-ssr", "happy-dom (SSR)");
});

function time(fn: () => void): number {
    const start = performance.now();
    fn();
    return Math.round((performance.now() - start) * 1000) / 1000;
}

function benchmark(name: string, fn: () => void, iterations: number) {
    const times: number[] = [];
    for (let i = 0; i < iterations; i++) {
        times.push(time(fn));
    }
    const sorted = [...times].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const mean = times.reduce((s, t) => s + t, 0) / times.length;
    const hz = Math.round(1000 / mean);
    collectedMetrics.push({ name, iterations, min, mean, max, hz, times });
    return { min, mean, max, hz };
}

describe("DOM SSR Benchmark Tests", () => {
    let globals: Globals;
    let container: HTMLElement;
    let state: { rows: Row[]; selectedId: number | null };

    beforeEach(() => {
        // Create one Window per test (not per iteration) to avoid memory crash
        globals = getBrowserGlobals();
        container = globals.document.createElement("div");
        container.id = "main";
        globals.document.body.appendChild(container);
        state = { rows: [], selectedId: null };
    });

    function renderApp() {
        container.innerHTML = "";
        renderSSR(
            <Table
                rows={state.rows}
                selectedId={state.selectedId}
                onSelect={() => {}}
                onRemove={() => {}}
            />,
            container,
            { browserGlobals: globals },
        );
    }

    // --- Correctness ---

    it("01_ssr_run1k: creates 1,000 rows (SSR)", () => {
        resetIdCounter();
        state.rows = buildData(1000);
        renderApp();
        assertElementCount(container, "tbody tr", 1000);
    });

    it("02_ssr_replace1k: replaces all rows (SSR)", () => {
        state.rows = buildData(1000);
        renderApp();
        state.rows = buildData(1000);
        renderApp();
        assertElementCount(container, "tbody tr", 1000);
    });

    it("03_ssr_create10k: creates 10,000 rows (SSR)", () => {
        resetIdCounter();
        state.rows = buildData(10000);
        renderApp();
        assertElementCount(container, "tbody tr", 10000);
    });

    it("04_ssr_clear1k: clears all rows (SSR)", () => {
        state.rows = buildData(1000);
        renderApp();
        state.rows = [];
        renderApp();
        assertElementCount(container, "tbody tr", 0);
    });

    // --- Performance ---

    it("perf_ssr: create 1k rows (10 iterations)", () => {
        const stats = benchmark("ssr create 1k rows", () => {
            resetIdCounter();
            state.rows = buildData(1000);
            renderApp();
        }, 10);
        console.log(`  SSR create 1k: min=${stats.min}ms mean=${stats.mean.toFixed(1)}ms max=${stats.max}ms hz=${stats.hz}/s`);
    });

    it("perf_ssr: replace 1k rows (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("ssr replace 1k rows", () => {
            state.rows = buildData(1000);
            renderApp();
        }, 10);
        console.log(`  SSR replace 1k: min=${stats.min}ms mean=${stats.mean.toFixed(1)}ms max=${stats.max}ms hz=${stats.hz}/s`);
    });

    it("perf_ssr: create 10k rows (3 iterations)", () => {
        const stats = benchmark("ssr create 10k rows", () => {
            resetIdCounter();
            state.rows = buildData(10000);
            renderApp();
        }, 3);
        console.log(`  SSR create 10k: min=${stats.min}ms mean=${stats.mean.toFixed(1)}ms max=${stats.max}ms hz=${stats.hz}/s`);
    });

    it("perf_ssr: clear 1k rows (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("ssr clear 1k rows", () => {
            state.rows = [];
            renderApp();
        }, 10);
        console.log(`  SSR clear 1k: min=${stats.min}ms mean=${stats.mean.toFixed(1)}ms max=${stats.max}ms hz=${stats.hz}/s`);
    });

    it("perf_ssr: append 1k to 1k (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("ssr append 1k to 1k", () => {
            state.rows.push(...buildData(1000));
            renderApp();
        }, 10);
        console.log(`  SSR append 1k: min=${stats.min}ms mean=${stats.mean.toFixed(1)}ms max=${stats.max}ms hz=${stats.hz}/s`);
    });
});
