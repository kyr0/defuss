import { rule, transval } from "./index.js";

describe("API exports", () => {
  it("should export value and transval functions", () => {
    expect(rule).toBeDefined();
    expect(transval).toBeDefined();
  });

  it("value should be a function", () => {
    expect(typeof rule).toBe("function");
  });

  it("transval should be a function", () => {
    expect(typeof transval).toBe("function");
  });
});
