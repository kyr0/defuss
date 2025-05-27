import { describe, it, expect } from "vitest";
import * as datatype from "./index.js";

describe("datatype index", () => {
  it("should export array utilities", () => {
    expect(datatype.unique).toBeDefined();
    expect(typeof datatype.unique).toBe("function");
  });

  it("should export object utilities", () => {
    expect(datatype.equalsJSON).toBeDefined();
    expect(datatype.omit).toBeDefined();
    expect(datatype.pick).toBeDefined();
    expect(typeof datatype.equalsJSON).toBe("function");
    expect(typeof datatype.omit).toBe("function");
    expect(typeof datatype.pick).toBe("function");
  });

  it("should export string utilities", () => {
    expect(datatype.getAllKeysFromPath).toBeDefined();
    expect(datatype.getByPath).toBeDefined();
    expect(datatype.setByPath).toBeDefined();
    expect(datatype.ensureKey).toBeDefined();
    expect(typeof datatype.getAllKeysFromPath).toBe("function");
    expect(typeof datatype.getByPath).toBe("function");
    expect(typeof datatype.setByPath).toBe("function");
    expect(typeof datatype.ensureKey).toBe("function");
  });

  it("should re-export all datatype utilities", () => {
    const exportedFunctions = Object.keys(datatype);
    expect(exportedFunctions).toContain("unique");
    expect(exportedFunctions).toContain("equalsJSON");
    expect(exportedFunctions).toContain("omit");
    expect(exportedFunctions).toContain("pick");
    expect(exportedFunctions).toContain("getAllKeysFromPath");
    expect(exportedFunctions).toContain("getByPath");
    expect(exportedFunctions).toContain("setByPath");
    expect(exportedFunctions).toContain("ensureKey");
  });
});
