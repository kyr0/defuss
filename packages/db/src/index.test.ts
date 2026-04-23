import { DefussTable, defineTable } from "./index.js";

describe("Test the exports", () => {
  it("should export DefussTable", () => {
    expect(DefussTable).toBeDefined();
  });

  it("should export defineTable", () => {
    expect(defineTable).toBeDefined();
  });
});
