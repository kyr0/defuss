import { describe, expect, it } from "vitest";
import { applyDataview, createDataview } from "./dataview.js";

const rowIds = <T extends { id: number }>(entries: Array<{ row: T }>) =>
  entries.map((entry) => entry.row.id);

describe("createDataview", () => {
  it("creates defaults", () => {
    const view = createDataview();

    expect(view).toEqual({
      filters: [],
      sorters: [],
      page: 0,
      pageSize: undefined,
      meta: {
        selectedRowIds: [],
        lockedColumns: [],
      },
      tree: undefined,
    });
  });

  it("throws for invalid page", () => {
    expect(() => createDataview({ page: -1 })).toThrow();
  });

  it("throws for invalid pageSize", () => {
    expect(() => createDataview({ pageSize: 0 })).toThrow();
  });
});

describe("applyDataview", () => {
  const rows = [
    { id: 1, a: "Foo", b: "Bar", score: 10, group: "alpha" },
    { id: 2, a: "Foo", b: "Bar", score: 5, group: "beta" },
    { id: 3, a: "Foo", b: "Baz", score: 8, group: "alpha" },
    { id: 4, a: "Qux", b: "Bar", score: 7, group: "gamma" },
  ];

  it("filters by multiple columns and sorts by multiple sorters", () => {
    const view = createDataview({
      filters: [
        { field: "a", op: "eq", value: "Foo" },
        { field: "b", op: "eq", value: "Bar" },
      ],
      sorters: [
        { field: "a", direction: "desc" },
        { field: "score", direction: "asc" },
      ],
    });

    const result = applyDataview(rows, view);

    expect(rowIds(result)).toEqual([2, 1]);
  });

  it("supports paging with zero-based page index", () => {
    const view = createDataview({
      sorters: [{ field: "id", direction: "asc" }],
      page: 1,
      pageSize: 2,
    });

    const result = applyDataview(rows, view);

    expect(rowIds(result)).toEqual([3, 4]);
  });

  it("keeps sort stable for equal values", () => {
    const view = createDataview({
      sorters: [{ field: "group", direction: "asc" }],
    });

    const result = applyDataview(rows, view);

    expect(
      result.filter((entry) => entry.row.group === "alpha").map((entry) => entry.row.id),
    ).toEqual([1, 3]);
  });

  it("supports all requested operators", () => {
    const operatorRows = [
      { id: 1, text: "Foobar", n: 2, tags: ["x", "y"] },
      { id: 2, text: "Barfoo", n: 5, tags: ["y"] },
      { id: 3, text: "Foo", n: 9, tags: ["z"] },
    ];

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "neq", value: 5 }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "gt", value: 2 }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([2, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "gte", value: 5 }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([2, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "lt", value: 5 }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "lte", value: 5 }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1, 2]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "n", op: "in", value: [2, 9] }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "text", op: "contains", value: "oo" }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1, 2, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "text", op: "startsWith", value: "Foo" }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([1, 3]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "text", op: "endsWith", value: "foo" }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([2]);

    expect(
      applyDataview(
        operatorRows,
        createDataview({ filters: [{ field: "tags", op: "contains", value: "z" }] }),
      ).map((entry) => entry.row.id),
    ).toEqual([3]);
  });

  it("supports nested dot-path fields", () => {
    const nestedRows = [
      { id: 1, user: { profile: { city: "Berlin" } } },
      { id: 2, user: { profile: { city: "Munich" } } },
    ];

    const view = createDataview({
      filters: [{ field: "user.profile.city", op: "eq", value: "Berlin" }],
    });

    const result = applyDataview(nestedRows, view);
    expect(result.map((entry) => entry.row.id)).toEqual([1]);
  });

  it("uses deterministic null ordering", () => {
    const values = [
      { id: 1, value: null },
      { id: 2, value: 2 },
      { id: 3, value: 1 },
      { id: 4, value: undefined },
    ];

    const asc = applyDataview(
      values,
      createDataview({ sorters: [{ field: "value", direction: "asc" }] }),
    );

    const desc = applyDataview(
      values,
      createDataview({ sorters: [{ field: "value", direction: "desc" }] }),
    );

    expect(asc.map((entry) => entry.row.id)).toEqual([3, 2, 1, 4]);
    expect(desc.map((entry) => entry.row.id)).toEqual([1, 4, 2, 3]);
  });

  it("can be applied repeatedly on the same backing array without mutation", () => {
    const backing = [
      { id: 3, group: "b", score: 10 },
      { id: 1, group: "a", score: 30 },
      { id: 2, group: "a", score: 20 },
      { id: 4, group: "c", score: 5 },
    ];

    const backingOrderBefore = backing.map((row) => row.id);

    const firstView = createDataview({
      filters: [{ field: "group", op: "eq", value: "a" }],
      sorters: [{ field: "score", direction: "desc" }],
      page: 0,
      pageSize: 1,
    });

    const secondView = createDataview({
      sorters: [{ field: "id", direction: "asc" }],
      page: 1,
      pageSize: 2,
    });

    const firstRunA = applyDataview(backing, firstView);
    const firstRunB = applyDataview(backing, firstView);
    const secondRun = applyDataview(backing, secondView);

    expect(firstRunA.map((entry) => entry.row.id)).toEqual([1]);
    expect(firstRunB.map((entry) => entry.row.id)).toEqual([1]);
    expect(secondRun.map((entry) => entry.row.id)).toEqual([3, 4]);
    expect(backing.map((row) => row.id)).toEqual(backingOrderBefore);
  });

  it("handles complex filter/sort/paging on 10k rows", () => {
    const largeRows = Array.from({ length: 10_000 }, (_, index) => ({
      id: index,
      name: `User-${index}`,
      score: index % 100,
      status: index % 2 === 0 ? "active" : "inactive",
      tags: [index % 3 === 0 ? "vip" : "regular", `tier-${index % 5}`],
      meta: {
        city: index % 7 === 0 ? "Berlin" : "Munich",
      },
    }));

    const view = createDataview({
      filters: [
        { field: "status", op: "eq", value: "active" },
        { field: "tags", op: "contains", value: "vip" },
        { field: "meta.city", op: "eq", value: "Berlin" },
        { field: "score", op: "gte", value: 50 },
      ],
      sorters: [
        { field: "score", direction: "desc" },
        { field: "id", direction: "asc" },
      ],
      page: 2,
      pageSize: 25,
    });

    const result = applyDataview(largeRows, view);

    expect(result).toHaveLength(25);
    for (let index = 1; index < result.length; index++) {
      const previous = result[index - 1].row;
      const current = result[index].row;

      if (previous.score === current.score) {
        expect(previous.id).toBeLessThanOrEqual(current.id);
      } else {
        expect(previous.score).toBeGreaterThanOrEqual(current.score);
      }

      expect(current.status).toBe("active");
      expect(current.tags).toContain("vip");
      expect(current.meta.city).toBe("Berlin");
      expect(current.score).toBeGreaterThanOrEqual(50);
    }
  });

  it("applies tree behavior when tree config is provided", () => {
    const treeRows = [
      { id: 1, parentId: null, title: "Root A", score: 50 },
      { id: 2, parentId: 1, title: "A-Child 1", score: 80 },
      { id: 3, parentId: 1, title: "A-Child 2", score: 20 },
      { id: 4, parentId: 2, title: "A-Grandchild", score: 10 },
      { id: 5, parentId: null, title: "Root B", score: 70 },
      { id: 6, parentId: 5, title: "B-Child", score: 60 },
    ];

    const view = createDataview({
      tree: {
        idField: "id",
        parentIdField: "parentId",
        expandedIds: [1],
      },
      sorters: [{ field: "id", direction: "asc" }],
    });

    const result = applyDataview(treeRows, view);
    expect(result.map((entry) => entry.row.id)).toEqual([1, 2, 3, 5]);
    expect(result.find((entry) => entry.row.id === 2)?.meta).toMatchObject({
      depth: 1,
      hasChildren: true,
      isExpanded: false,
      isMatch: true,
      parentId: 1,
    });
  });
});
