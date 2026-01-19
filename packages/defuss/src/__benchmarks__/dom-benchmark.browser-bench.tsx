import { bench, describe, expect, beforeEach } from "vitest";
import { renderSync } from "../render/client.js";
import { buildData, measureRAF, type Row, assertElementCount, assertTextContent, resetIdCounter } from "./benchmark-utils.js";
import { Table } from "./components/Table.js";

// Re-render based benchmark following js-framework-benchmark methodology
// Using Mode A (double-RAF) timing for portable results

describe("DOM Benchmark", () => {
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

    // --- Benchmarks ---

    bench("01_run1k (Create 1,000 rows)", async () => {
        resetIdCounter();
        await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
    }, { iterations: 10 });

    bench("02_replace1k (Replace all rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows = buildData(1000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 1000);
    }, { iterations: 10 });

    bench("03_update10th1k (Update every 10th row)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            for (let i = 0; i < state.rows.length; i += 10) {
                state.rows[i].label += " !!!";
            }
            renderApp();
        });

        assertTextContent(container, "tbody tr:nth-child(1)", "!!!");
        assertTextContent(container, "tbody tr:nth-child(11)", "!!!");
    }, { iterations: 10 });

    bench("04_select1k (Select row)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.selectedId = state.rows[1].id;
            renderApp();
        });

        assertElementCount(container, "tr.danger", 1);
    }, { iterations: 10 });

    bench("05_swap1k (Swap rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        const id1 = state.rows[1].id;
        const id998 = state.rows[998].id;

        await measureRAF(() => {
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
    }, { iterations: 10 });

    bench("06_remove_one_1k (Remove one row)", async () => {
        state.rows = buildData(1000);
        renderApp();
        const idToRemove = state.rows[1].id;

        await measureRAF(() => {
            const idx = state.rows.findIndex(r => r.id === idToRemove);
            state.rows.splice(idx, 1);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 999);
    }, { iterations: 10 });

    bench("07_create10k (Create 10,000 rows)", async () => {
        resetIdCounter();
        await measureRAF(() => {
            state.rows = buildData(10000);
            renderApp();
        });

        assertElementCount(container, "tbody tr", 10000);
    }, { iterations: 5 });

    bench("08_append1k (Append 1,000 rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows.push(...buildData(1000));
            renderApp();
        });

        assertElementCount(container, "tbody tr", 2000);
    }, { iterations: 10 });

    bench("09_clear1k (Clear rows)", async () => {
        state.rows = buildData(1000);
        renderApp();

        await measureRAF(() => {
            state.rows = [];
            renderApp();
        });

        assertElementCount(container, "tbody tr", 0);
    }, { iterations: 10 });

});
