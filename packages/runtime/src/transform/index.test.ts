import { describe, it, expect } from "vitest";
import * as transform from "./index.js";

describe("transform index", () => {
  it("should export asString function", () => {
    expect(transform.asString).toBeDefined();
    expect(typeof transform.asString).toBe("function");
  });

  it("should export asNumber function", () => {
    expect(transform.asNumber).toBeDefined();
    expect(typeof transform.asNumber).toBe("function");
  });

  it("should export asBoolean function", () => {
    expect(transform.asBoolean).toBeDefined();
    expect(typeof transform.asBoolean).toBe("function");
  });

  it("should export asArray function", () => {
    expect(transform.asArray).toBeDefined();
    expect(typeof transform.asArray).toBe("function");
  });

  it("should export asDate function", () => {
    expect(transform.asDate).toBeDefined();
    expect(typeof transform.asDate).toBe("function");
  });

  it("should export asInteger function", () => {
    expect(transform.asInteger).toBeDefined();
    expect(typeof transform.asInteger).toBe("function");
  });

  it("should re-export all transform utilities", () => {
    const exportedFunctions = Object.keys(transform);
    expect(exportedFunctions).toContain("asString");
    expect(exportedFunctions).toContain("asNumber");
    expect(exportedFunctions).toContain("asBoolean");
    expect(exportedFunctions).toContain("asArray");
    expect(exportedFunctions).toContain("asDate");
    expect(exportedFunctions).toContain("asInteger");
  });
});
