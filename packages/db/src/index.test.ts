import { DefussTable, createAggregation, defineTable } from "./index.js";

describe("Test the exports", () => {
	it("should export DefussTable", () => {
		expect(DefussTable).toBeDefined();
	});

	it("should export defineTable", () => {
		expect(defineTable).toBeDefined();
	});

	it("should export createAggregation", () => {
		expect(createAggregation).toBeDefined();
	});
});
