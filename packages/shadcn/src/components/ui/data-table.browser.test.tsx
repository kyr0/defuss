/**
 * DataTable Browser Tests
 *
 * Tests the DataTable component in a real browser (Playwright/Chromium)
 * to verify delegated click handling, sorting, row clicks, actions,
 * and the click-guard against double-fire from DOM morphing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore } from "defuss";
import { createDataview, applyDataview } from "defuss-dataview";
import type { DataviewState } from "defuss-dataview";
import { DataTable } from "../../index.js";
import type { DataTableColumn } from "../../index.js";

// ── Helpers ────────────────────────────────────────────────────────────

const createContainer = (): HTMLDivElement => {
  const el = document.createElement("div");
  el.id = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  document.body.appendChild(el);
  return el;
};

const cleanup = (el: HTMLElement) => el.remove();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const nextTick = () => new Promise<void>((r) => queueMicrotask(() => r()));

// ── Test Data ──────────────────────────────────────────────────────────

type Invoice = {
  id: string;
  amount: number;
  status: string;
  email: string;
};

const sampleData: Invoice[] = [
  { id: "INV001", amount: 250, status: "Paid", email: "alice@example.com" },
  { id: "INV002", amount: 150, status: "Pending", email: "bob@example.com" },
  { id: "INV003", amount: 350, status: "Unpaid", email: "carol@example.com" },
  { id: "INV004", amount: 450, status: "Paid", email: "dave@example.com" },
];

const columns: DataTableColumn[] = [
  { field: "id", label: "Invoice", sortable: true },
  { field: "email", label: "Email", sortable: true },
  { field: "amount", label: "Amount", sortable: true, className: "text-right" },
  { field: "status", label: "Status" },
];

const makeEntries = (data: Invoice[] = sampleData) => {
  const view = createDataview({
    sorters: [{ field: "id", direction: "asc" as const }],
  });
  return applyDataview(data, view);
};

// ── Suite ──────────────────────────────────────────────────────────────

let container: HTMLDivElement;

beforeEach(() => {
  container = createContainer();
});

afterEach(() => {
  cleanup(container);
});

describe("DataTable", () => {
  // ── Rendering ──────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("should render all rows", async () => {
      const entries = makeEntries();

      await $(container).jsx(<DataTable entries={entries} columns={columns} />);

      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBe(4);
    });

    it("should render column headers", async () => {
      const entries = makeEntries();

      await $(container).jsx(<DataTable entries={entries} columns={columns} />);

      const headers = container.querySelectorAll("th");
      expect(headers.length).toBe(4);
      expect(headers[0]?.textContent).toContain("Invoice");
      expect(headers[1]?.textContent).toContain("Email");
    });

    it("should show empty message when no entries", async () => {
      await $(container).jsx(
        <DataTable
          entries={[]}
          columns={columns}
          emptyMessage="Nothing here."
        />,
      );

      expect(container.textContent).toContain("Nothing here.");
      const rows = container.querySelectorAll("tbody tr");
      expect(rows.length).toBe(1); // single empty-state row
    });

    it("should render cell values", async () => {
      const entries = makeEntries();

      await $(container).jsx(<DataTable entries={entries} columns={columns} />);

      const firstRow = container.querySelector("tbody tr") as HTMLElement;
      expect(firstRow.textContent).toContain("INV001");
      expect(firstRow.textContent).toContain("alice@example.com");
    });

    it("should render custom cell renderers", async () => {
      const entries = makeEntries();
      const customColumns: DataTableColumn[] = [
        {
          field: "id",
          label: "ID",
          render: (value) => <strong class="custom-id">{String(value)}</strong>,
        },
      ];

      await $(container).jsx(
        <DataTable entries={entries} columns={customColumns} />,
      );

      const custom = container.querySelector(".custom-id");
      expect(custom).not.toBeNull();
      expect(custom?.textContent).toBe("INV001");
    });

    it("should render actions column when renderActions is provided", async () => {
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          renderActions={(entry) => (
            <button type="button" class="action-btn">
              Edit {String(entry.row.id)}
            </button>
          )}
        />,
      );

      const actionBtns = container.querySelectorAll(".action-btn");
      expect(actionBtns.length).toBe(4);
      expect(actionBtns[0]?.textContent).toBe("Edit INV001");

      // Actions header
      const headers = container.querySelectorAll("th");
      expect(headers[headers.length - 1]?.textContent).toContain("Actions");
    });
  });

  // ── Sorting ────────────────────────────────────────────────────────

  describe("Sorting", () => {
    it("should call onSort when a sortable header is clicked", async () => {
      const onSort = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable entries={entries} columns={columns} onSort={onSort} />,
      );

      const header = container.querySelector(
        "th[data-sortable]",
      ) as HTMLElement;
      expect(header).not.toBeNull();
      header.click();

      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledWith("id");
    });

    it("should NOT call onSort for non-sortable columns", async () => {
      const onSort = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable entries={entries} columns={columns} onSort={onSort} />,
      );

      // Status column is not sortable
      const headers = container.querySelectorAll("th");
      const statusHeader = Array.from(headers).find((h) =>
        h.textContent?.includes("Status"),
      ) as HTMLElement;
      statusHeader.click();

      expect(onSort).not.toHaveBeenCalled();
    });

    it("should show sort indicator on sorted column", async () => {
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          sortField="id"
          sortDirection="asc"
        />,
      );

      const idHeader = container.querySelector(
        'th[data-field="id"]',
      ) as HTMLElement;
      expect(idHeader.textContent).toContain("\u25B2");
    });

    it("should show desc indicator", async () => {
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          sortField="amount"
          sortDirection="desc"
        />,
      );

      const amtHeader = container.querySelector(
        'th[data-field="amount"]',
      ) as HTMLElement;
      expect(amtHeader.textContent).toContain("\u25BC");
    });

    it("should call onSort when clicking text inside sortable header", async () => {
      const onSort = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable entries={entries} columns={columns} onSort={onSort} />,
      );

      // Click the inner div/text, not the th itself
      const innerDiv = container.querySelector(
        'th[data-field="email"] div',
      ) as HTMLElement;
      innerDiv.click();

      expect(onSort).toHaveBeenCalledTimes(1);
      expect(onSort).toHaveBeenCalledWith("email");
    });
  });

  // ── Row Clicks ─────────────────────────────────────────────────────

  describe("Row clicks", () => {
    it("should call onRowClick when a row is clicked", async () => {
      const onRowClick = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          onRowClick={onRowClick}
        />,
      );

      const firstRow = container.querySelector("tbody tr") as HTMLElement;
      firstRow.click();

      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          row: expect.objectContaining({ id: "INV001" }),
        }),
      );
    });

    it("should call onRowClick when clicking a cell inside a row", async () => {
      const onRowClick = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          onRowClick={onRowClick}
        />,
      );

      const cell = container.querySelector("tbody tr td") as HTMLElement;
      cell.click();

      expect(onRowClick).toHaveBeenCalledTimes(1);
    });

    it("should NOT call onRowClick when action button is clicked", async () => {
      const onRowClick = vi.fn();
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          onRowClick={onRowClick}
          renderActions={() => (
            <button type="button" class="action-btn">
              Edit
            </button>
          )}
        />,
      );

      const actionBtn = container.querySelector(".action-btn") as HTMLElement;
      actionBtn.click();

      expect(onRowClick).not.toHaveBeenCalled();
    });
  });

  // ── Store-driven re-render ─────────────────────────────────────────

  describe("Store-driven re-render", () => {
    it("should re-render when store changes (sort toggle)", async () => {
      const tableRef = createRef<HTMLDivElement>();

      interface TableState {
        view: DataviewState;
      }

      const store = createStore<TableState>({
        view: createDataview({
          sorters: [{ field: "id", direction: "asc" as const }],
        }),
      });

      const renderTable = () => {
        const { view } = store.value;
        const entries = applyDataview(sampleData, view);
        const sortField = view.sorters[0]?.field;
        const sortDirection = view.sorters[0]?.direction;

        return (
          <DataTable
            entries={entries}
            columns={columns}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={(field) => {
              const { view } = store.value;
              const dir =
                view.sorters[0]?.field === field &&
                view.sorters[0].direction === "asc"
                  ? "desc"
                  : "asc";
              store.set({
                view: createDataview({
                  ...view,
                  sorters: [{ field, direction: dir }],
                }),
              });
            }}
          />
        );
      };

      await $(container).jsx(<div ref={tableRef}>{renderTable()}</div>);

      store.subscribe(() => {
        $(tableRef).jsx(renderTable());
      });

      // Initial: sorted by id asc - first row is INV001
      let firstCell = container.querySelector("tbody tr td") as HTMLElement;
      expect(firstCell.textContent).toContain("INV001");

      // Click amount header to sort by amount asc
      const amountHeader = container.querySelector(
        'th[data-field="amount"]',
      ) as HTMLElement;
      amountHeader.click();

      await nextTick();
      await wait(50);

      // After sort by amount asc: INV002 (150) should be first
      firstCell = container.querySelector("tbody tr td") as HTMLElement;
      expect(firstCell.textContent).toContain("INV002");
    });

    it("should handle delete via store re-render", async () => {
      const tableRef = createRef<HTMLDivElement>();

      const store = createStore<{ data: Invoice[] }>({
        data: [...sampleData],
      });

      const renderTable = () => {
        const entries = applyDataview(
          store.value.data,
          createDataview({
            sorters: [{ field: "id", direction: "asc" as const }],
          }),
        );
        return (
          <DataTable
            entries={entries}
            columns={columns}
            renderActions={(entry) => (
              <button
                type="button"
                class="delete-btn"
                onClick={() => {
                  store.set({
                    data: store.value.data.filter((r) => r.id !== entry.row.id),
                  });
                }}
              >
                Delete
              </button>
            )}
          />
        );
      };

      await $(container).jsx(<div ref={tableRef}>{renderTable()}</div>);

      store.subscribe(() => {
        $(tableRef).jsx(renderTable());
      });

      expect(container.querySelectorAll("tbody tr").length).toBe(4);

      // Click delete on first row
      const deleteBtn = container.querySelector(".delete-btn") as HTMLElement;
      deleteBtn.click();

      await nextTick();
      await wait(50);

      expect(container.querySelectorAll("tbody tr").length).toBe(3);
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────

  describe("Edge cases", () => {
    it("should handle numeric IDs", async () => {
      const data = [
        { id: 1, name: "Alpha" },
        { id: 2, name: "Beta" },
      ];
      const numColumns: DataTableColumn[] = [
        { field: "id", label: "ID" },
        { field: "name", label: "Name" },
      ];
      const entries = applyDataview(
        data,
        createDataview({
          sorters: [{ field: "id", direction: "asc" as const }],
        }),
      );

      const onRowClick = vi.fn();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={numColumns}
          onRowClick={onRowClick}
        />,
      );

      const firstRow = container.querySelector("tbody tr") as HTMLElement;
      firstRow.click();

      expect(onRowClick).toHaveBeenCalledTimes(1);
      expect(onRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          row: expect.objectContaining({ id: 1 }),
        }),
      );
    });

    it("should apply custom className to the wrapper", async () => {
      const entries = makeEntries();

      await $(container).jsx(
        <DataTable
          entries={entries}
          columns={columns}
          className="my-custom-table"
        />,
      );

      const wrapper = container.querySelector(".data-table") as HTMLElement;
      expect(wrapper.classList.contains("my-custom-table")).toBe(true);
    });
  });
});
