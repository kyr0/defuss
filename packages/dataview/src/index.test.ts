import { describe, expect, it } from "vitest";
import {
  Dataview,
  ExperimentalDataview,
  applyDataview,
  applyTreeDataview,
  applyTreeDataviewWithMeta,
  createDataview,
  createTreeDataview,
  setExpandedIds,
  setLockedColumns,
  setSelectedRows,
  toggleExpanded,
  toggleSelectedRow,
} from "./index.js";

describe("index exports", () => {
  it("exports procedural API and namespace object", () => {
    expect(typeof createDataview).toBe("function");
    expect(typeof applyDataview).toBe("function");
    expect(typeof createTreeDataview).toBe("function");
    expect(typeof applyTreeDataview).toBe("function");
    expect(typeof applyTreeDataviewWithMeta).toBe("function");
    expect(typeof setSelectedRows).toBe("function");
    expect(typeof toggleSelectedRow).toBe("function");
    expect(typeof setLockedColumns).toBe("function");
    expect(typeof setExpandedIds).toBe("function");
    expect(typeof toggleExpanded).toBe("function");
    expect(Dataview.createDataview).toBe(createDataview);
    expect(Dataview.applyDataview).toBe(applyDataview);
    expect(Dataview.setSelectedRows).toBe(setSelectedRows);
    expect(Dataview.toggleSelectedRow).toBe(toggleSelectedRow);
    expect(Dataview.setLockedColumns).toBe(setLockedColumns);
    expect(ExperimentalDataview.createTreeDataview).toBe(createTreeDataview);
    expect(ExperimentalDataview.applyTreeDataview).toBe(applyTreeDataview);
    expect(ExperimentalDataview.applyTreeDataviewWithMeta).toBe(
      applyTreeDataviewWithMeta,
    );
    expect(ExperimentalDataview.setExpandedIds).toBe(setExpandedIds);
    expect(ExperimentalDataview.toggleExpanded).toBe(toggleExpanded);
  });
});
