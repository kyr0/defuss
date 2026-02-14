import { describe, expect, it } from "vitest";
import { applyDataview, createDataview } from "./dataview.js";
import {
  updateMeta,
  setExpandedIds,
  setLockedColumns,
  setSelectedRows,
  toggleExpanded,
  toggleSelectedRow,
} from "./view-meta.js";

describe("view meta helpers", () => {
  it("stores and toggles grid selection and locked columns", () => {
    const base = createDataview({
      sorters: [{ field: "id", direction: "asc" }],
    });

    const withSelection = setSelectedRows(base, [1, 2]);
    expect(withSelection.meta.selectedRowIds).toEqual([1, 2]);

    const toggledSelection = toggleSelectedRow(withSelection, 2);
    expect(toggledSelection.meta.selectedRowIds).toEqual([1]);

    const withLockedColumns = setLockedColumns(toggledSelection, ["name", "id", "name"]);
    expect(withLockedColumns.meta.lockedColumns).toEqual(["name", "id"]);

    const patched = updateMeta(withLockedColumns, { selectedRowIds: [99] });
    expect(patched.meta.selectedRowIds).toEqual([99]);
    expect(patched.meta.lockedColumns).toEqual(["name", "id"]);
  });

  it("remembers expanded and selected tree state across applies", () => {
    const rows = [
      { id: 1, parentId: null, label: "root" },
      { id: 2, parentId: 1, label: "child-a" },
      { id: 3, parentId: 1, label: "child-b" },
      { id: 4, parentId: 2, label: "grandchild" },
    ];

    let view = createDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    let visible = applyDataview(rows, view);
    expect(visible.map((entry) => entry.row.id)).toEqual([1, 2, 3]);

    view = toggleExpanded(view, 2);
    visible = applyDataview(rows, view);
    expect(visible.map((entry) => entry.row.id)).toEqual([1, 2, 4, 3]);

    view = setSelectedRows(view, [4]);
    visible = applyDataview(rows, view);
    expect(visible.find((entry) => entry.row.id === 4)?.meta.isSelected).toBe(true);

    view = toggleSelectedRow(view, 4);
    visible = applyDataview(rows, view);
    expect(visible.find((entry) => entry.row.id === 4)?.meta.isSelected).toBe(false);

    view = toggleExpanded(view, 2);
    visible = applyDataview(rows, view);
    expect(visible.map((entry) => entry.row.id)).toEqual([1, 2, 3]);

    view = setExpandedIds(view, [1]);
    visible = applyDataview(rows, view);
    expect(visible.map((entry) => entry.row.id)).toEqual([1, 2, 3]);
  });

  it("keeps tree configuration intact when updating meta helpers", () => {
    const base = createDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    const withUpdatedMeta = updateMeta(base, { selectedRowIds: [2], lockedColumns: ["title"] });
    expect(withUpdatedMeta.tree).toEqual(base.tree);
    expect(withUpdatedMeta.meta.selectedRowIds).toEqual([2]);
    expect(withUpdatedMeta.meta.lockedColumns).toEqual(["title"]);

    const withSelectedRows = setSelectedRows(withUpdatedMeta, [1, 3]);
    expect(withSelectedRows.tree).toEqual(base.tree);
    expect(withSelectedRows.meta.selectedRowIds).toEqual([1, 3]);

    const withToggledRow = toggleSelectedRow(withSelectedRows, 3);
    expect(withToggledRow.tree).toEqual(base.tree);
    expect(withToggledRow.meta.selectedRowIds).toEqual([1]);

    const withLockedColumns = setLockedColumns(withToggledRow, ["id", "label"]);
    expect(withLockedColumns.tree).toEqual(base.tree);
    expect(withLockedColumns.meta.lockedColumns).toEqual(["id", "label"]);
  });

  it("treats expand helpers as no-op for flat dataviews", () => {
    const base = createDataview({ sorters: [{ field: "id", direction: "asc" }] });

    const withSet = setExpandedIds(base, [1, 2, 3]);
    const withToggle = toggleExpanded(withSet, 1);

    expect(withSet).toEqual(base);
    expect(withToggle).toEqual(base);
  });

});
