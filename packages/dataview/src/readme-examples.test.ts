import { describe, expect, it } from "vitest";
import { applyDataview, createDataview } from "./index.js";

describe("README examples", () => {
  it("applies filters, sorters and paging", () => {
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
    expect(filteredAndOrderedAndPaged).toEqual([{ id: 1, a: "Foo", b: "Bar" }]);
  });
});
