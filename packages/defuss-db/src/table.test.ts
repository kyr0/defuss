import { DefussTable } from "./table.js";
import { LibsqlProvider } from "./provider/libsql.js";

describe("Test the API contract", () => {
  const provider = new LibsqlProvider();
  beforeAll(() => {
    provider.connect({
      url: ":memory:",
    });
  });

  it("should export DefussTable", () => {
    expect(DefussTable).toBeDefined();
  });

  it("should have the expected methods", () => {
    const table = new DefussTable(provider, "test_table");
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
