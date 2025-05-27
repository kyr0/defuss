import { describe, it, expect } from "vitest";
import * as stringUtils from "./index.js";

describe("datatype/string index", () => {
  it("should export path utility functions", () => {
    expect(stringUtils.getAllKeysFromPath).toBeDefined();
    expect(stringUtils.getByPath).toBeDefined();
    expect(stringUtils.setByPath).toBeDefined();
    expect(stringUtils.ensureKey).toBeDefined();
    expect(typeof stringUtils.getAllKeysFromPath).toBe("function");
    expect(typeof stringUtils.getByPath).toBe("function");
    expect(typeof stringUtils.setByPath).toBe("function");
    expect(typeof stringUtils.ensureKey).toBe("function");
  });

  it("should re-export all string utilities", () => {
    const exportedFunctions = Object.keys(stringUtils);
    expect(exportedFunctions).toContain("getAllKeysFromPath");
    expect(exportedFunctions).toContain("getByPath");
    expect(exportedFunctions).toContain("setByPath");
    expect(exportedFunctions).toContain("ensureKey");
    expect(exportedFunctions.length).toBe(4);
  });
});
