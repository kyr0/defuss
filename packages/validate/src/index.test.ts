import { validate, validateAll } from "./index.js";

describe("API exports", () => {
  it("should export validate and validateAll functions", () => {
    expect(validate).toBeDefined();
    expect(validateAll).toBeDefined();
  });

  it("validate should be a function", () => {
    expect(typeof validate).toBe("function");
  });

  it("validateAll should be a function", () => {
    expect(typeof validateAll).toBe("function");
  });
});
