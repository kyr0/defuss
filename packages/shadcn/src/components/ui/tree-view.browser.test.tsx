/**
 * TreeView Browser Tests
 *
 * Tests the TreeView component in a real browser (Playwright/Chromium)
 * to verify event handling, expand/collapse, selection, and rendering.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore } from "defuss";
import { createDataview, applyDataview, toggleExpanded } from "defuss-dataview";
import type { DataviewState, DataviewJsonValue } from "defuss-dataview";
import { TreeView } from "../../index.js";
import type { TreeViewColumn } from "../../index.js";

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

type FileNode = {
  id: string;
  parentId: string | null;
  name: string;
  size: string;
};

const sampleData: FileNode[] = [
  { id: "src", parentId: null, name: "src", size: "-" },
  { id: "src/a.ts", parentId: "src", name: "a.ts", size: "1 KB" },
  { id: "src/b.ts", parentId: "src", name: "b.ts", size: "2 KB" },
  { id: "lib", parentId: null, name: "lib", size: "-" },
  { id: "lib/c.ts", parentId: "lib", name: "c.ts", size: "3 KB" },
  { id: "readme", parentId: null, name: "README.md", size: "0.5 KB" },
];

const makeView = (expandedIds: (string | number)[] = []): DataviewState =>
  createDataview({
    sorters: [{ field: "name", direction: "asc" as const }],
    tree: {
      idField: "id",
      parentIdField: "parentId",
      expandedIds,
    },
  });

// ── Suite ──────────────────────────────────────────────────────────────

let container: HTMLDivElement;

beforeEach(() => {
  container = createContainer();
});

afterEach(() => {
  cleanup(container);
});

describe("TreeView", () => {
  // ── Rendering ──────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("should render top-level nodes when nothing is expanded", async () => {
      const view = makeView();
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView entries={entries} idField="id" nameField="name" />,
      );

      const rows = container.querySelectorAll('[role="treeitem"]');
      // applyDataview with empty expandedIds returns all nodes
      expect(rows.length).toBe(6);
    });

    it("should render children when a node is expanded", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView entries={entries} idField="id" nameField="name" />,
      );

      const rows = container.querySelectorAll('[role="treeitem"]');
      // src (expanded) + a.ts + b.ts + lib + README.md = 5
      expect(rows.length).toBe(5);
    });

    it("should set correct aria attributes", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView entries={entries} idField="id" nameField="name" />,
      );

      const srcRow = container.querySelector(
        "[data-node-id='\"src\"']",
      ) as HTMLElement;
      expect(srcRow).not.toBeNull();
      expect(srcRow.getAttribute("aria-expanded")).toBe("true");
      expect(srcRow.getAttribute("aria-level")).toBe("1");
      expect(srcRow.getAttribute("role")).toBe("treeitem");

      // Leaf node should NOT have aria-expanded
      const aRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      expect(aRow).not.toBeNull();
      expect(aRow.getAttribute("aria-expanded")).toBeNull();
    });

    it("should render the tree root with role='tree'", async () => {
      const entries = applyDataview(sampleData, makeView());

      await $(container).jsx(
        <TreeView entries={entries} idField="id" nameField="name" />,
      );

      const root = container.querySelector('[role="tree"]');
      expect(root).not.toBeNull();
    });

    it("should show 'No items' when entries is empty", async () => {
      await $(container).jsx(
        <TreeView entries={[]} idField="id" nameField="name" />,
      );

      expect(container.textContent).toContain("No items to display");
    });

    it("should render additional columns", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);
      const columns: TreeViewColumn[] = [
        { field: "size", label: "Size", className: "w-20" },
      ];

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          columns={columns}
        />,
      );

      // Each row should have a cell with the size value
      const aRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      expect(aRow?.textContent).toContain("1 KB");
    });
  });

  // ── Selection ──────────────────────────────────────────────────────

  describe("Selection (click on row)", () => {
    it("should call onNodeSelect when a row is clicked", async () => {
      const onSelect = vi.fn();
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          onNodeSelect={onSelect}
        />,
      );

      const aRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      aRow.click();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("src/a.ts");
    });

    it("should highlight the selected row", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          selectedId="src/a.ts"
        />,
      );

      const aRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      expect(aRow.getAttribute("aria-selected")).toBe("true");
      expect(aRow.classList.contains("bg-accent")).toBe(true);
    });

    it("should call onNodeSelect when clicking a row's text content", async () => {
      const onSelect = vi.fn();
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          onNodeSelect={onSelect}
        />,
      );

      // Click on the span (text child) inside the row
      const span = container.querySelector(
        "[data-node-id='\"src/a.ts\"'] .truncate",
      ) as HTMLElement;
      span.click();

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onSelect).toHaveBeenCalledWith("src/a.ts");
    });
  });

  // ── Expand/Collapse ────────────────────────────────────────────────

  describe("Expand / Collapse (click on chevron)", () => {
    it("should call onNodeToggle when the chevron button is clicked", async () => {
      const onToggle = vi.fn();
      const view = makeView();
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          onNodeToggle={onToggle}
        />,
      );

      const toggle = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-toggle",
      ) as HTMLElement;
      expect(toggle).not.toBeNull();
      toggle.click();

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onToggle).toHaveBeenCalledWith("src");
    });

    it("should NOT call onNodeSelect when the chevron is clicked", async () => {
      const onSelect = vi.fn();
      const onToggle = vi.fn();
      const view = makeView();
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          onNodeToggle={onToggle}
          onNodeSelect={onSelect}
        />,
      );

      const toggle = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-toggle",
      ) as HTMLElement;
      toggle.click();

      expect(onToggle).toHaveBeenCalledTimes(1);
      expect(onSelect).not.toHaveBeenCalled();
    });

    it("should show chevron only for nodes with children", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView entries={entries} idField="id" nameField="name" />,
      );

      // Folders have chevrons
      const srcChevron = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-toggle",
      );
      expect(srcChevron).not.toBeNull();

      // Leaf files have no chevron
      const aChevron = container.querySelector(
        "[data-node-id='\"src/a.ts\"'] .tree-view-toggle",
      );
      expect(aChevron).toBeNull();
    });
  });

  // ── Store-driven re-render ─────────────────────────────────────────

  describe("Store-driven re-render", () => {
    it("should expand/collapse when store updates and tree re-renders", async () => {
      const treeRef = createRef<HTMLDivElement>();

      const store = createStore<{
        view: DataviewState;
        selectedId: string | null;
      }>({
        view: makeView(),
        selectedId: null,
      });

      const renderTree = () => {
        const { view, selectedId } = store.value;
        const entries = applyDataview(sampleData, view);
        return (
          <TreeView
            entries={entries}
            idField="id"
            nameField="name"
            selectedId={selectedId}
            onNodeToggle={(id) => {
              store.set({
                ...store.value,
                view: toggleExpanded(store.value.view, id),
              });
            }}
            onNodeSelect={(id) => {
              store.set({ ...store.value, selectedId: id as string });
            }}
          />
        );
      };

      // Initial render
      await $(container).jsx(<div ref={treeRef}>{renderTree()}</div>);

      store.subscribe(() => {
        $(treeRef).jsx(renderTree());
      });

      // applyDataview with empty expandedIds returns all nodes
      let rows = container.querySelectorAll('[role="treeitem"]');
      expect(rows.length).toBe(6);

      // Click the chevron on "src" to expand
      const srcToggle = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-toggle",
      ) as HTMLElement;
      srcToggle.click();

      await nextTick();
      await wait(50);

      // Children should now be visible
      rows = container.querySelectorAll('[role="treeitem"]');
      expect(rows.length).toBe(5);

      // Click chevron again to collapse
      const srcToggle2 = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-toggle",
      ) as HTMLElement;
      srcToggle2.click();

      await nextTick();
      await wait(50);

      rows = container.querySelectorAll('[role="treeitem"]');
      expect(rows.length).toBe(6);
    });

    it("should update selection when store changes", async () => {
      const treeRef = createRef<HTMLDivElement>();

      const store = createStore<{
        view: DataviewState;
        selectedId: string | null;
      }>({
        view: makeView(["src"]),
        selectedId: null,
      });

      const renderTree = () => {
        const { view, selectedId } = store.value;
        const entries = applyDataview(sampleData, view);
        return (
          <TreeView
            entries={entries}
            idField="id"
            nameField="name"
            selectedId={selectedId}
            onNodeSelect={(id) => {
              store.set({ ...store.value, selectedId: id as string });
            }}
          />
        );
      };

      await $(container).jsx(<div ref={treeRef}>{renderTree()}</div>);

      store.subscribe(() => {
        $(treeRef).jsx(renderTree());
      });

      // Click on a.ts
      const aRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      aRow.click();

      await nextTick();
      await wait(50);

      const updatedRow = container.querySelector(
        "[data-node-id='\"src/a.ts\"']",
      ) as HTMLElement;
      expect(updatedRow.getAttribute("aria-selected")).toBe("true");
    });
  });

  // ── Numeric IDs ────────────────────────────────────────────────────

  describe("Numeric IDs", () => {
    const numData = [
      { id: 1, parentId: null, name: "Root" },
      { id: 2, parentId: 1, name: "Child A" },
      { id: 3, parentId: 1, name: "Child B" },
    ];

    it("should handle numeric IDs correctly", async () => {
      const onSelect = vi.fn();
      const view = createDataview({
        tree: { idField: "id", parentIdField: "parentId", expandedIds: [1] },
      });
      const entries = applyDataview(numData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          onNodeSelect={onSelect}
        />,
      );

      const childA = container.querySelector(
        '[data-node-id="2"]',
      ) as HTMLElement;
      expect(childA).not.toBeNull();
      childA.click();

      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  // ── Indentation ────────────────────────────────────────────────────

  describe("Indentation", () => {
    it("should indent children with paddingLeft based on depth", async () => {
      const view = makeView(["src"]);
      const entries = applyDataview(sampleData, view);

      await $(container).jsx(
        <TreeView
          entries={entries}
          idField="id"
          nameField="name"
          indentSize={24}
        />,
      );

      // Root level (depth 0) should have 0px padding
      const srcCell = container.querySelector(
        "[data-node-id='\"src\"'] .tree-view-cell",
      ) as HTMLElement;
      expect(srcCell.style.paddingLeft).toBe("0px");

      // Child (depth 1) should have 24px padding
      const aCell = container.querySelector(
        "[data-node-id='\"src/a.ts\"'] .tree-view-cell",
      ) as HTMLElement;
      expect(aCell.style.paddingLeft).toBe("24px");
    });
  });
});
