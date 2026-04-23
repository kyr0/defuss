import { DefussTable } from "./table.js";
import { LibsqlProvider } from "./provider/libsql.js";
import { defineTable } from "./types.js";

describe("Test the API contract", () => {
  const provider = new LibsqlProvider();
  const testTable = defineTable({
    name: "test_table",
    indexes: [
      {
        name: "name",
        source: "name",
      },
    ],
  });

  beforeAll(async () => {
    await provider.connect({
      url: ":memory:",
    });
  });

  it("should export DefussTable", () => {
    expect(DefussTable).toBeDefined();
  });

  it("should have the expected methods", () => {
    const table = new DefussTable(provider, testTable);
    expect(table).toBeDefined();
    expect(table).toHaveProperty("init");
    expect(table).toHaveProperty("insert");
    expect(table).toHaveProperty("update");
    expect(table).toHaveProperty("delete");
    expect(table).toHaveProperty("find");
    expect(table).toHaveProperty("findOne");
    expect(table).toHaveProperty("upsert");
  });
});
