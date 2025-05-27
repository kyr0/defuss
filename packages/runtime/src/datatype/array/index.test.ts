import { describe, it, expect } from "vitest";
import * as arrayUtils from "./index.js";

describe("datatype/array index", () => {
  it("should export unique function", () => {
    expect(arrayUtils.unique).toBeDefined();
    expect(typeof arrayUtils.unique).toBe("function");
  });

  it("should re-export all array utilities", () => {
    const exportedFunctions = Object.keys(arrayUtils);
    expect(exportedFunctions).toContain("unique");
    expect(exportedFunctions.length).toBe(1);
  });
});
