import { describe, expect, it } from "vitest";
import { addRows, removeRows, setParent, updateRows } from "./data-patch.js";

describe("data patch helpers", () => {
  it("patches multiple rows immutably while preserving order", () => {
    const rows = [
      { id: 1, title: "A", score: 10 },
      { id: 2, title: "B", score: 20 },
      { id: 3, title: "C", score: 30 },
    ];

    const next = updateRows(rows, [1, 3], [{ score: 11 }, { title: "C2", score: 31 }]);

    expect(next).toEqual([
      { id: 1, title: "A", score: 11 },
      { id: 2, title: "B", score: 20 },
      { id: 3, title: "C2", score: 31 },
    ]);
    expect(next).not.toBe(rows);
    expect(next[1]).toBe(rows[1]);
  });

  it("returns same reference when patch ids are not found", () => {
    const rows = [{ id: 1, title: "A" }];
    const next = updateRows(rows, [999], [{ title: "X" }]);
    expect(next).toBe(rows);
  });

  it("throws when ids and patches length differ", () => {
    expect(() => updateRows([{ id: 1 }], [1, 2], [{ id: 1 }])).toThrow();
  });

  it("returns same reference for updateRows when ids are empty", () => {
    const rows = [{ id: 1, title: "A" }];
    const next = updateRows(rows, [], []);
    expect(next).toBe(rows);
  });

  it("removes multiple rows by id", () => {
    const rows = [
      { id: 1, title: "A" },
      { id: 2, title: "B" },
      { id: 3, title: "C" },
    ];

    const next = removeRows(rows, [1, 3]);
    expect(next).toEqual([{ id: 2, title: "B" }]);
  });

  it("returns same reference when remove ids are not found", () => {
    const rows = [{ id: 1, title: "A" }];
    const next = removeRows(rows, [999]);
    expect(next).toBe(rows);
  });

  it("returns same reference for removeRows when ids are empty", () => {
    const rows = [{ id: 1, title: "A" }];
    const next = removeRows(rows, []);
    expect(next).toBe(rows);
  });

  it("adds rows at end by default", () => {
    const rows = [{ id: 1 }, { id: 2 }];
    const next = addRows(rows, [{ id: 3 }, { id: 4 }]);
    expect(next).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
  });

  it("adds rows before or after anchor id", () => {
    const rows = [{ id: 1 }, { id: 2 }, { id: 5 }];

    const before = addRows(rows, [{ id: 3 }], 5, "before");
    expect(before).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 5 }]);

    const after = addRows(rows, [{ id: 4 }], 2, "after");
    expect(after).toEqual([{ id: 1 }, { id: 2 }, { id: 4 }, { id: 5 }]);
  });

  it("handles empty newRows, empty base rows, and missing anchor", () => {
    const rows = [{ id: 1 }, { id: 2 }];

    const unchanged = addRows(rows, []);
    expect(unchanged).toBe(rows);

    const fromEmpty = addRows([], [{ id: 1 }]);
    expect(fromEmpty).toEqual([{ id: 1 }]);

    const missingAnchor = addRows(rows, [{ id: 3 }], 999, "before");
    expect(missingAnchor).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("supports custom idField for update/remove/add", () => {
    const rows = [
      { key: "a", label: "A" },
      { key: "b", label: "B" },
    ];

    const updated = updateRows(rows, ["b"], [{ label: "B2" }], "key");
    expect(updated).toEqual([
      { key: "a", label: "A" },
      { key: "b", label: "B2" },
    ]);

    const removed = removeRows(updated, ["a"], "key");
    expect(removed).toEqual([{ key: "b", label: "B2" }]);

    const inserted = addRows(removed, [{ key: "c", label: "C" }], "b", "before", "key");
    expect(inserted).toEqual([
      { key: "c", label: "C" },
      { key: "b", label: "B2" },
    ]);
  });

  it("moves a tree node by updating parent id", () => {
    const rows = [
      { id: 1, parentId: null, title: "Root" },
      { id: 2, parentId: 1, title: "Child" },
      { id: 3, parentId: 1, title: "Sibling" },
    ];

    const moved = setParent(rows, 2, 3);

    expect(moved).toEqual([
      { id: 1, parentId: null, title: "Root" },
      { id: 2, parentId: 3, title: "Child" },
      { id: 3, parentId: 1, title: "Sibling" },
    ]);
    expect(moved).not.toBe(rows);
    expect(moved[0]).toBe(rows[0]);
    expect(moved[2]).toBe(rows[2]);
  });

  it("returns same reference when setParent is a no-op", () => {
    const rows = [{ id: 1, parentId: null, title: "Root" }];

    const unchangedSameParent = setParent(rows, 1, null);
    expect(unchangedSameParent).toBe(rows);

    const unchangedMissingNode = setParent(rows, 999, 1);
    expect(unchangedMissingNode).toBe(rows);
  });

  it("supports custom id and parent fields in setParent", () => {
    const rows = [
      { key: "a", parentKey: null, title: "Root" },
      { key: "b", parentKey: "a", title: "Child" },
    ];

    const moved = setParent(rows, "b", null, "key", "parentKey");
    expect(moved).toEqual([
      { key: "a", parentKey: null, title: "Root" },
      { key: "b", parentKey: null, title: "Child" },
    ]);
  });

  it("returns same reference for setParent on empty rows", () => {
    const rows: Array<{ id: number; parentId: number | null }> = [];
    const next = setParent(rows, 1, null);
    expect(next).toBe(rows);
  });
});
