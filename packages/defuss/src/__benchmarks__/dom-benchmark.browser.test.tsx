import { describe, expect, beforeEach, it } from "vitest";
import { renderSync } from "../render/client.js";
import { buildData, measureRAF, type Row, assertElementCount, assertTextContent, resetIdCounter } from "./benchmark-utils.js";
import { Table } from "./components/Table.js";

// Browser DOM tests following js-framework-benchmark methodology
// Using Mode A (double-RAF) timing for portable results

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
            renderApp();
        };

        const handleRemove = (id: number) => {
            const idx = state.rows.findIndex(row => row.id === id);
            state.rows.splice(idx, 1);
            renderApp();
        };

        // Clear previous content before re-render (renderSync appends by default)
        container.innerHTML = '';

        // Top-level re-render
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

    // --- Tests (verification that DOM operations work) ---

    it("01_run1k: creates 1,000 rows", async () => {
        resetIdCounter();
        const duration = await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
        console.log(`01_run1k: ${duration.toFixed(2)}ms`);
    });

    it("02_replace1k: replaces all rows", async () => {
        state.rows = buildData(1000);
        renderApp();

        const duration = await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
        console.log(`02_replace1k: ${duration.toFixed(2)}ms`);
    });

    it("03_update10th1k: updates every 10th row", async () => {
        state.rows = buildData(1000);
        renderApp();

        const duration = await measureRAF(() => {
            for (let i = 0; i < state.rows.length; i += 10) {
                state.rows[i].label += " !!!";
            }
            renderApp();
        });

        assertTextContent(container, "tbody tr:nth-child(1)", "!!!");
        assertTextContent(container, "tbody tr:nth-child(11)", "!!!");
        console.log(`03_update10th1k: ${duration.toFixed(2)}ms`);
    });

    it("04_select1k: selects a row", async () => {
        state.rows = buildData(1000);
        renderApp();

        const duration = await measureRAF(() => {
            state.selectedId = state.rows[1].id;
            renderApp();
        });

        assertElementCount(container, "tr.danger", 1);
        console.log(`04_select1k: ${duration.toFixed(2)}ms`);
    });

    it("05_swap1k: swaps two rows", async () => {
        state.rows = buildData(1000);
        renderApp();

        const id1 = state.rows[1].id;
        const id998 = state.rows[998].id;

        const duration = await measureRAF(() => {
            const temp = state.rows[1];
            state.rows[1] = state.rows[998];
            state.rows[998] = temp;
            renderApp();
        });

        const rows = container.querySelectorAll("tbody tr");
        const row1Text = rows[1].textContent;
        const row998Text = rows[998].textContent;

        expect(row1Text).toContain(String(id998));
        expect(row998Text).toContain(String(id1));
        console.log(`05_swap1k: ${duration.toFixed(2)}ms`);
    });

    it("06_remove_one_1k: removes one row", async () => {
        state.rows = buildData(1000);
        renderApp();
        const idToRemove = state.rows[1].id;

        const duration = await measureRAF(() => {
            const idx = state.rows.findIndex(r => r.id === idToRemove);
            state.rows.splice(idx, 1);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 999);
        console.log(`06_remove_one_1k: ${duration.toFixed(2)}ms`);
    });

    it("07_create10k: creates 10,000 rows", async () => {
        resetIdCounter();
        const duration = await measureRAF(() => {
            state.rows = buildData(10000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 10000);
        console.log(`07_create10k: ${duration.toFixed(2)}ms`);
    });

    it("08_append1k: appends 1,000 rows", async () => {
        state.rows = buildData(1000);
        renderApp();

        const duration = await measureRAF(() => {
            state.rows.push(...buildData(1000));
            renderApp();
        });

        assertElementCount(container, "tbody tr", 2000);
        console.log(`08_append1k: ${duration.toFixed(2)}ms`);
    });

    it("09_clear1k: clears all rows", async () => {
        state.rows = buildData(1000);
        renderApp();

        const duration = await measureRAF(() => {
            state.rows = [];
            renderApp();
        });

        assertElementCount(container, "tbody tr", 0);
        console.log(`09_clear1k: ${duration.toFixed(2)}ms`);
    });

});
