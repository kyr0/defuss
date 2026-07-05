import { describe, expect, beforeEach, it, afterAll } from "vitest";
import { renderSync } from "../render/client.js";
import { buildData, type Row, assertElementCount, assertTextContent, resetIdCounter } from "./benchmark-utils.js";
import { Table } from "./components/Table.js";
import { writeMetrics } from "./metrics-writer.js";
import type { BenchMetric } from "./metric-types.js";

/** Environment name injected by vitest define (happy-dom or chromium) */
declare const __BENCH_ENV__: string;

const collectedMetrics: BenchMetric[] = [];

afterAll(async () => {
    if (collectedMetrics.length === 0) return;
    const envName = typeof __BENCH_ENV__ !== "undefined" ? __BENCH_ENV__ : "unknown";
    await writeMetrics(collectedMetrics, "bench-dom-browser", envName);
});

/** Measures execution time of a function in milliseconds (3 decimal places) */
function time(fn: () => void): number {
    const start = performance.now();
    fn();
    return Math.round((performance.now() - start) * 1000) / 1000;
}

/** Runs a benchmark multiple times and returns min/mean/max stats */
function benchmark(name: string, fn: () => void, iterations: number): { min: number; mean: number; max: number; hz: number; times: number[] } {
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

    return { min, mean, max, hz, times };
}

/** Prints a formatted performance table row */
function logBench(name: string, stats: { min: number; mean: number; max: number; hz: number }) {
    const pad = (s: string, n: number) => s.padStart(n);
    console.log(
        `  ${name.padEnd(35)} ${pad(`${stats.min}ms`, 10)} ${pad(`${stats.mean.toFixed(1)}ms`, 10)} ${pad(`${stats.max}ms`, 10)} ${pad(`${stats.hz.toLocaleString()}/s`, 12)}`,
    );
}

describe("DOM Benchmark Tests", () => {
    let container: HTMLElement;
    let state: { rows: Row[], selectedId: number | null };

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement("div");
        container.id = "main";
        document.body.appendChild(container);

        state = { rows: [], selectedId: null };
        resetIdCounter();

        // Initial render (empty)
        renderApp();
    });

    function renderApp() {
        const handleSelect = (id: number) => {
            state.selectedId = id;
        };

        const handleRemove = (id: number) => {
            const idx = state.rows.findIndex(row => row.id === id);
            state.rows.splice(idx, 1);
        };

        container.innerHTML = '';

        renderSync(
            <Table
                rows={state.rows}
                selectedId={state.selectedId}
                onSelect={handleSelect}
                onRemove={handleRemove}
            />,
            container
        );
    }

    // --- Correctness tests (single run) ---

    it("01_run1k: creates 1,000 rows", () => {
        resetIdCounter();
        state.rows = buildData(1000);
        renderApp();
        assertElementCount(container, "tbody tr", 1000);
    });

    it("02_replace1k: replaces all rows", () => {
        state.rows = buildData(1000);
        renderApp();
        state.rows = buildData(1000);
        renderApp();
        assertElementCount(container, "tbody tr", 1000);
    });

    it("03_update10th1k: updates every 10th row", () => {
        state.rows = buildData(1000);
        renderApp();
        for (let i = 0; i < state.rows.length; i += 10) {
            state.rows[i].label += " !!!";
        }
        renderApp();
        assertTextContent(container, "tbody tr:nth-child(1)", "!!!");
        assertTextContent(container, "tbody tr:nth-child(11)", "!!!");
    });

    it("04_select1k: selects a row", () => {
        state.rows = buildData(1000);
        renderApp();
        state.selectedId = state.rows[1].id;
        renderApp();
        assertElementCount(container, "tr.danger", 1);
    });

    it("05_swap1k: swaps two rows", () => {
        state.rows = buildData(1000);
        renderApp();
        const id1 = state.rows[1].id;
        const id998 = state.rows[998].id;
        const temp = state.rows[1];
        state.rows[1] = state.rows[998];
        state.rows[998] = temp;
        renderApp();
        const rows = container.querySelectorAll("tbody tr");
        expect(rows[1].textContent).toContain(String(id998));
        expect(rows[998].textContent).toContain(String(id1));
    });

    it("06_remove_one_1k: removes one row", () => {
        state.rows = buildData(1000);
        renderApp();
        const idToRemove = state.rows[1].id;
        const idx = state.rows.findIndex(r => r.id === idToRemove);
        state.rows.splice(idx, 1);
        renderApp();
        assertElementCount(container, "tbody tr", 999);
    });

    it("07_create10k: creates 10,000 rows", () => {
        resetIdCounter();
        state.rows = buildData(10000);
        renderApp();
        assertElementCount(container, "tbody tr", 10000);
    });

    it("08_append1k: appends 1,000 rows", () => {
        state.rows = buildData(1000);
        renderApp();
        state.rows.push(...buildData(1000));
        renderApp();
        assertElementCount(container, "tbody tr", 2000);
    });

    it("09_clear1k: clears all rows", () => {
        state.rows = buildData(1000);
        renderApp();
        state.rows = [];
        renderApp();
        assertElementCount(container, "tbody tr", 0);
    });

    // --- Performance benchmarks (multiple iterations with stats) ---

    const RESULTS: { name: string; stats: { min: number; mean: number; max: number; hz: number } }[] = [];

    it("perf: create 1k rows (10 iterations)", () => {
        const stats = benchmark("create 1k rows", () => {
            resetIdCounter();
            state = { rows: buildData(1000), selectedId: null };
            renderApp();
        }, 10);
        assertElementCount(container, "tbody tr", 1000);
        RESULTS.push({ name: "create 1k rows", stats });
    });

    it("perf: replace 1k rows (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("replace 1k rows", () => {
            state.rows = buildData(1000);
            renderApp();
        }, 10);
        RESULTS.push({ name: "replace 1k rows", stats });
    });

    it("perf: update every 10th row (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("update every 10th row", () => {
            for (let i = 0; i < state.rows.length; i += 10) {
                state.rows[i].label += " !!!";
            }
            renderApp();
        }, 10);
        RESULTS.push({ name: "update every 10th row", stats });
    });

    it("perf: select row (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("select row", () => {
            state.selectedId = state.rows[1].id;
            renderApp();
        }, 10);
        RESULTS.push({ name: "select row", stats });
    });

    it("perf: swap rows (10 iterations)", () => {
        state.rows = buildData(1000);
        renderApp();
        const stats = benchmark("swap two rows", () => {
            const temp = state.rows[1];
            state.rows[1] = state.rows[998];
            state.rows[998] = temp;
            renderApp();
        }, 10);
        RESULTS.push({ name: "swap two rows", stats });
    });

    it("perf: remove one row (10 iterations)", () => {
        const stats = benchmark("remove one row", () => {
            state.rows = buildData(1000);
            renderApp();
            state.rows.splice(1, 1);
            renderApp();
        }, 10);
        RESULTS.push({ name: "remove one row", stats });
    });

    it("perf: append 1k rows (10 iterations)", () => {
        const stats = benchmark("append 1k to 1k", () => {
            state.rows = buildData(1000);
            renderApp();
            state.rows.push(...buildData(1000));
            renderApp();
        }, 10);
        RESULTS.push({ name: "append 1k to 1k", stats });
    });

    it("perf: clear all rows (10 iterations)", () => {
        const stats = benchmark("clear 1k rows", () => {
            state.rows = buildData(1000);
            renderApp();
            state.rows = [];
            renderApp();
        }, 10);
        RESULTS.push({ name: "clear 1k rows", stats });
    });

    it("perf: create 10k rows (5 iterations)", () => {
        const stats = benchmark("create 10k rows", () => {
            resetIdCounter();
            state = { rows: buildData(10000), selectedId: null };
            renderApp();
        }, 5);
        assertElementCount(container, "tbody tr", 10000);
        RESULTS.push({ name: "create 10k rows", stats });
    });

    // --- Print summary table ---
    it("summary: prints performance table", () => {
        console.log("\n  ╔" + "═".repeat(79) + "╗");
        console.log("  ║" + "  DOM RENDER PERFORMANCE SUMMARY".padEnd(79) + "║");
        console.log("  ╠" + "═".repeat(79) + "╣");
        console.log(`  ║  ${"operation".padEnd(35)} ${"min".padStart(10)} ${"mean".padStart(10)} ${"max".padStart(10)} ${"throughput".padStart(12)}`.padEnd(81) + "║");
        console.log("  ╠" + "═".repeat(79) + "╣");
        for (const { name, stats } of RESULTS) {
            const pad = (s: string, n: number) => s.padStart(n);
            const line = `  ║  ${name.padEnd(35)} ${pad(`${stats.min}ms`, 10)} ${pad(`${stats.mean.toFixed(1)}ms`, 10)} ${pad(`${stats.max}ms`, 10)} ${pad(`${stats.hz.toLocaleString()}/s`, 12)}`;
            console.log(line.padEnd(81) + "║");
        }
        console.log("  ╚" + "═".repeat(79) + "╝\n");
    });

});
