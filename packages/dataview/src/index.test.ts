import { describe, expect, it } from "vitest";
import {
  addRows,
  applyDataview,
  createDataview,
  removeRows,
  setParent,
  setExpandedIds,
  setLockedColumns,
  setSelectedRows,
  toggleExpanded,
  toggleSelectedRow,
  updateMeta,
  updateRows,
} from "./index.js";
import * as mod from "./index.js";

describe("index exports", () => {
  it("exports procedural API", () => {
    expect(typeof createDataview).toBe("function");
    expect(typeof applyDataview).toBe("function");
    expect(typeof setSelectedRows).toBe("function");
    expect(typeof toggleSelectedRow).toBe("function");
    expect(typeof setLockedColumns).toBe("function");
    expect(typeof setExpandedIds).toBe("function");
    expect(typeof toggleExpanded).toBe("function");
    expect(typeof updateMeta).toBe("function");
    expect(typeof updateRows).toBe("function");
    expect(typeof addRows).toBe("function");
    expect(typeof removeRows).toBe("function");
    expect(typeof setParent).toBe("function");
  });

  it("does not expose removed legacy API names", () => {
    expect("patchMeta" in mod).toBe(false);
    expect("patchRows" in mod).toBe(false);
    expect("Dataview" in mod).toBe(false);
    expect("createTreeDataview" in mod).toBe(false);
    expect("applyTreeDataview" in mod).toBe(false);
    expect("applyTreeDataviewWithMeta" in mod).toBe(false);
  });
});
