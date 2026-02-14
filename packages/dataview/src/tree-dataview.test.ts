import { describe, expect, it } from "vitest";
import {
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  createTreeDataview,
} from "./tree-dataview.js";

type Row = {
  id: number;
  parentId: number | null;
  title: string;
  score: number;
};

const rows: Row[] = [
  { id: 1, parentId: null, title: "Root A", score: 50 },
  { id: 2, parentId: 1, title: "A-Child 1", score: 80 },
  { id: 3, parentId: 1, title: "A-Child 2", score: 20 },
  { id: 4, parentId: 2, title: "A-Grandchild", score: 10 },
  { id: 5, parentId: null, title: "Root B", score: 70 },
  { id: 6, parentId: 5, title: "B-Child", score: 60 },
];

describe("createTreeDataview", () => {
  it("creates defaults for tree options", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
      },
    });

    expect(view.tree.includeAncestors).toBe(true);
    expect(view.tree.includeDescendantsOfMatch).toBe(false);
    expect(view.tree.expandedIds).toEqual([]);
  });
});

describe("applyTreeDataview", () => {
  it("flattens tree in stable hierarchical order with sibling sorting", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
      },
      sorters: [{ field: "score", direction: "desc" }],
    });

    const result = applyTreeDataview(rows, view);
    expect(result.map((row) => row.id)).toEqual([5, 6, 1, 2, 4, 3]);
  });

  it("respects expandedIds for visibility of descendants", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    const result = applyTreeDataview(rows, view);
    expect(result.map((row) => row.id)).toEqual([1, 2, 3, 5]);
  });

  it("includes ancestors for child matches by default", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
      },
      filters: [{ field: "title", op: "contains", value: "Grandchild" }],
      sorters: [{ field: "id", direction: "asc" }],
    });

    const result = applyTreeDataview(rows, view);
    expect(result.map((row) => row.id)).toEqual([1, 2, 4]);
  });

  it("can include descendants of matched nodes", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        includeDescendantsOfMatch: true,
      },
      filters: [{ field: "id", op: "eq", value: 2 }],
      sorters: [{ field: "id", direction: "asc" }],
    });

    const result = applyTreeDataview(rows, view);
    expect(result.map((row) => row.id)).toEqual([1, 2, 4]);
  });

  it("applies paging to flattened visible rows", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
      },
      sorters: [{ field: "id", direction: "asc" }],
      page: 1,
      pageSize: 2,
    });

    const result = applyTreeDataview(rows, view);
    expect(result.map((row) => row.id)).toEqual([4, 3]);
  });

  it("returns row metadata for TreeGrid rendering", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    const result = applyTreeDataviewWithMeta(rows, view);

    expect(result.map((entry) => entry.row.id)).toEqual([1, 2, 3, 5]);

    const rootA = result.find((entry) => entry.row.id === 1);
    const childA1 = result.find((entry) => entry.row.id === 2);
    const rootB = result.find((entry) => entry.row.id === 5);

    expect(rootA?.meta).toMatchObject({
      depth: 0,
      hasChildren: true,
      isExpanded: true,
      isMatch: true,
      parentId: null,
    });

    expect(childA1?.meta).toMatchObject({
      depth: 1,
      hasChildren: true,
      isExpanded: false,
      isMatch: true,
      parentId: 1,
    });

    expect(rootB?.meta).toMatchObject({
      depth: 0,
      hasChildren: true,
      isExpanded: false,
      isMatch: true,
      parentId: null,
    });
  });

  it("keeps row order identical between plain and meta tree apply", () => {
    const view = createTreeDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
      },
      sorters: [{ field: "score", direction: "desc" }],
      page: 0,
      pageSize: 5,
    });

    const plain = applyTreeDataview(rows, view).map((row) => row.id);
    const withMeta = applyTreeDataviewWithMeta(rows, view).map((entry) => entry.row.id);

    expect(withMeta).toEqual(plain);
  });
});
