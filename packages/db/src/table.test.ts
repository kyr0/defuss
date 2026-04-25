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
		expect(table).toHaveProperty("aggregate");
		expect(table).toHaveProperty("init");
		expect(table).toHaveProperty("insert");
		expect(table).toHaveProperty("update");
		expect(table).toHaveProperty("delete");
		expect(table).toHaveProperty("find");
		expect(table).toHaveProperty("findOne");
		expect(table).toHaveProperty("upsert");
	});

	it("creates an aggregation builder from the table entrypoint", () => {
		const table = new DefussTable(provider, testTable);
		const aggregation = table.aggregate();

		expect(aggregation).toBeDefined();
		expect(aggregation).toHaveProperty("execute");
		expect(aggregation).toHaveProperty("project");
		expect(aggregation).toHaveProperty("groupBy");
	});
});
