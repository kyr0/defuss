import { describe, expect, it } from "vitest";
import {
  applyDataview,
  createDataview,
  setExpandedIds,
  setLockedColumns,
  setSelectedRows,
  toggleExpanded,
  toggleSelectedRow,
} from "./index.js";

describe("index exports", () => {
  it("exports procedural API", () => {
    expect(typeof createDataview).toBe("function");
    expect(typeof applyDataview).toBe("function");
    expect(typeof setSelectedRows).toBe("function");
    expect(typeof toggleSelectedRow).toBe("function");
    expect(typeof setLockedColumns).toBe("function");
    expect(typeof setExpandedIds).toBe("function");
    expect(typeof toggleExpanded).toBe("function");
  });
});
