import {
	DefussTable,
	countRows,
	createAggregation,
	defineTable,
	sumBy,
} from "./index.js";

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

	it("should export aggregation reducer helpers", () => {
		expect(countRows).toBeDefined();
		expect(sumBy).toBeDefined();
	});
});
