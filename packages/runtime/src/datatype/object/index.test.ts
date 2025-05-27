import { describe, it, expect } from "vitest";
import * as objectUtils from "./index.js";

describe("datatype/object index", () => {
  it("should export pick function", () => {
    expect(objectUtils.pick).toBeDefined();
    expect(typeof objectUtils.pick).toBe("function");
  });

  it("should export omit function", () => {
    expect(objectUtils.omit).toBeDefined();
    expect(typeof objectUtils.omit).toBe("function");
  });

  it("should export equals-json function", () => {
    expect(objectUtils.equalsJSON).toBeDefined();
    expect(typeof objectUtils.equalsJSON).toBe("function");
  });

  it("should re-export all object utilities", () => {
    const exportedFunctions = Object.keys(objectUtils);
    expect(exportedFunctions).toContain("pick");
    expect(exportedFunctions).toContain("omit");
    expect(exportedFunctions).toContain("equalsJSON");
    expect(exportedFunctions.length).toBe(3);
  });
});
