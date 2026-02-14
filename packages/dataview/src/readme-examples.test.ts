import { describe, expect, it } from "vitest";
import {
  addRows,
  applyDataview,
  createDataview,
  setParent,
  updateMeta,
  updateRows,
  removeRows,
  setLockedColumns,
  setSelectedRows,
  toggleExpanded,
  toggleSelectedRow,
} from "./index.js";

describe("README examples", () => {
  it("applies filters, sorters and paging (basic usage)", () => {
    const view = createDataview({
      filters: [
        { field: "a", op: "eq", value: "Foo" },
        { field: "b", op: "eq", value: "Bar" },
      ],
      sorters: [
        { field: "a", direction: "desc" },
        { field: "id", direction: "asc" },
      ],
      page: 0,
      pageSize: 1,
    });

    const someData = [
      { id: 2, a: "Foo", b: "Bar" },
      { id: 1, a: "Foo", b: "Bar" },
      { id: 3, a: "Foo", b: "Baz" },
      { id: 4, a: "Qux", b: "Bar" },
    ];

    const filteredAndOrderedAndPaged = applyDataview(someData, view);
    expect(filteredAndOrderedAndPaged).toEqual([
      {
        row: { id: 1, a: "Foo", b: "Bar" },
        meta: {
          depth: 0,
          hasChildren: false,
          isExpanded: false,
          isMatch: true,
          isSelected: false,
          parentId: null,
        },
      },
    ]);
  });

  it("persists selection and locked columns with helper functions", () => {
    let view = createDataview({
      sorters: [{ field: "id", direction: "asc" }],
    });

    view = setSelectedRows(view, [1, 2, 3]);
    view = toggleSelectedRow(view, 2);
    view = setLockedColumns(view, ["id", "name"]);

    expect(view.meta.selectedRowIds).toEqual([1, 3]);
    expect(view.meta.lockedColumns).toEqual(["id", "name"]);
  });

  it("uses updateMeta for UI-only state updates", () => {
    const base = createDataview({
      sorters: [{ field: "id", direction: "asc" }],
      filters: [{ field: "title", op: "contains", value: "task" }],
      page: 2,
      pageSize: 10,
    });

    const patched = updateMeta(base, {
      selectedRowIds: [11, 12],
      lockedColumns: ["id", "title"],
    });

    expect(patched.meta.selectedRowIds).toEqual([11, 12]);
    expect(patched.meta.lockedColumns).toEqual(["id", "title"]);
    expect(patched.filters).toEqual(base.filters);
    expect(patched.sorters).toEqual(base.sorters);
    expect(patched.page).toBe(2);
    expect(patched.pageSize).toBe(10);
  });

  it("follows the controlled UI integration pattern", () => {
    const rows = [
      { id: 1, parentId: null, title: "Root", score: 40 },
      { id: 2, parentId: 1, title: "Node A", score: 30 },
      { id: 3, parentId: 1, title: "Node B", score: 20 },
      { id: 4, parentId: null, title: "Other Root", score: 10 },
    ];

    let view = createDataview({
      page: 0,
      pageSize: 25,
      sorters: [{ field: "id", direction: "asc" }],
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [],
      },
    });

    const updateView = (next: typeof view) => {
      view = next;
      return applyDataview(rows, view);
    };

    let entries = updateView(toggleSelectedRow(view, 1));
    expect(view.meta.selectedRowIds).toEqual([1]);
    expect(entries.find((entry) => entry.row.id === 1)?.meta.isSelected).toBe(true);

    entries = applyDataview(rows, view);
    const visibleIds = entries.map((entry) => entry.row.id);
    updateView(updateMeta(view, { selectedRowIds: visibleIds }));
    expect(view.meta.selectedRowIds).toEqual(visibleIds);

    entries = updateView(toggleExpanded(view, 1));
    expect(view.tree?.expandedIds).toEqual([1]);
    expect(entries.map((entry) => entry.row.id)).toEqual([1, 2, 3, 4]);

    updateView(
      createDataview({
        ...view,
        sorters: [{ field: "score", direction: "desc" }],
        page: 0,
      }),
    );
    expect(view.sorters).toEqual([{ field: "score", direction: "desc" }]);
    expect(view.page).toBe(0);

    updateView(
      createDataview({
        ...view,
        filters: [{ field: "title", op: "contains", value: "Node" }],
        page: 0,
      }),
    );
    expect(view.filters).toEqual([{ field: "title", op: "contains", value: "Node" }]);
    expect(view.page).toBe(0);

    updateView(
      createDataview({
        ...view,
        page: 1,
      }),
    );
    expect(view.page).toBe(1);
  });

  it("enables tree behavior via tree options in createDataview", () => {
    const data = [
      { id: 1, parentId: null, title: "Root", score: 10 },
      { id: 2, parentId: 1, title: "Child", score: 20 },
      { id: 3, parentId: null, title: "Other", score: 30 },
      { id: 4, parentId: 2, title: "Grandchild", score: 40 },
      { id: 7, parentId: 1, title: "Another Child", score: 50 },
    ];

    let view = createDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
        includeAncestors: true,
        includeDescendantsOfMatch: false,
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    view = toggleExpanded(view, 2);
    view = setSelectedRows(view, [4, 7]);

    const entries = applyDataview(data, view);

    expect(entries.map((entry) => entry.row.id)).toEqual([1, 2, 4, 7, 3]);
    expect(entries.find((entry) => entry.row.id === 4)?.meta.isSelected).toBe(true);
    expect(entries.find((entry) => entry.row.id === 7)?.meta.isSelected).toBe(true);
    expect(entries.find((entry) => entry.row.id === 2)?.meta).toMatchObject({
      depth: 1,
      hasChildren: true,
      isExpanded: true,
      parentId: 1,
    });
  });

  it("treats empty filters as no filtering", () => {
    const rows = [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
      { id: 3, title: "C" },
    ];

    const view = createDataview({
      filters: [],
      sorters: [{ field: "id", direction: "asc" }],
    });

    const entries = applyDataview(rows, view);
    expect(entries.map((entry) => entry.row.id)).toEqual([1, 2, 3]);
    expect(entries.every((entry) => entry.meta.isMatch)).toBe(true);
  });

  it("patches and removes table rows, then reapplies view", () => {
    let data = [
      { id: 1, title: "A", score: 10 },
      { id: 2, title: "B", score: 20 },
      { id: 3, title: "C", score: 30 },
      { id: 5, title: "E", score: 50 },
      { id: 9, title: "I", score: 90 },
    ];

    const view = createDataview({ sorters: [{ field: "id", direction: "asc" }] });

    data = updateRows(data, [1, 3], [{ score: 99 }, { title: "Updated title" }]);
    data = addRows(data, [{ id: 8, title: "H", score: 80 }], 3, "after");
    data = removeRows(data, [5, 9]);

    const entries = applyDataview(data, view);

    expect(entries.map((entry) => entry.row.id)).toEqual([1, 2, 3, 8]);
    expect(entries.find((entry) => entry.row.id === 1)?.row.score).toBe(99);
    expect(entries.find((entry) => entry.row.id === 3)?.row.title).toBe("Updated title");
  });

  it("removes and patches tree nodes, then reapplies view", () => {
    let data = [
      { id: 1, parentId: null, title: "Root" },
      { id: 7, parentId: 1, title: "Node 7" },
      { id: 11, parentId: 7, title: "Node 11" },
      { id: 12, parentId: 7, title: "Node 12" },
      { id: 3, parentId: 1, title: "Sibling" },
    ];

    const view = createDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1, 7],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    data = updateRows(data, [7], [{ title: "Renamed node" }]);
    data = removeRows(data, [7, 11, 12]);
    data = setParent(data, 3, null);

    const entries = applyDataview(data, view);
    expect(entries.map((entry) => entry.row.id)).toEqual([1, 3]);
    expect(entries.some((entry) => entry.row.id === 7)).toBe(false);
  });
});
