import { describe, expect, it } from "vitest";
import { validate } from "./validator.js";

describe("validate", () => {
	it("returns valid when all required fields are present", () => {
		const meta = { title: "My Page", date: "2025-09-06" };
		const schema = {
			title: { required: true },
			date: { required: true },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.data).toEqual(meta);
	});

	it("returns invalid when a required field is missing", () => {
		const meta = { title: "My Page" };
		const schema = {
			title: { required: true },
			date: { required: true },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Missing required field: date");
	});

	it("applies default values for missing optional fields", () => {
		const meta = { title: "My Page" };
		const schema = {
			title: { required: true },
			status: { required: false, default: "draft" },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(true);
		expect(result.data).toEqual({
			title: "My Page",
			status: "draft",
		});
	});

	it("validates type: number", () => {
		const meta = { count: "42" };
		const schema = {
			count: { required: true, type: "number" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("returns error for invalid number type", () => {
		const meta = { count: "not-a-number" };
		const schema = {
			count: { required: true, type: "number" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Field 'count' must be a number");
	});

	it("validates type: boolean", () => {
		const meta = { published: "true" };
		const schema = {
			published: { required: true, type: "boolean" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(true);
	});

	it("returns error for invalid boolean type", () => {
		const meta = { published: "yes" };
		const schema = {
			published: { required: true, type: "boolean" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Field 'published' must be a boolean");
	});

	it("validates type: date", () => {
		const meta = { date: "2025-09-06" };
		const schema = {
			date: { required: true, type: "date" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(true);
	});

	it("returns error for invalid date type", () => {
		const meta = { date: "not-a-date" };
		const schema = {
			date: { required: true, type: "date" as const },
		};
		const result = validate(meta, schema);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Field 'date' must be a date");
	});

	it("returns valid for empty schema", () => {
		const meta = { title: "My Page" };
		const result = validate(meta, {});

		expect(result.valid).toBe(true);
		expect(result.errors).toEqual([]);
		expect(result.data).toEqual(meta);
	});

	it("does not override existing values with defaults", () => {
		const meta = { title: "My Page", status: "published" };
		const schema = {
			title: { required: true },
			status: { required: false, default: "draft" },
		};
		const result = validate(meta, schema);

		expect(result.data.status).toBe("published");
	});

	it("collects multiple errors", () => {
	  const meta = {};
	  const schema = {
	    title: { required: true },
	    date: { required: true },
	    author: { required: true },
	  };
	  const result = validate(meta, schema);

	  expect(result.valid).toBe(false);
	  expect(result.errors.length).toBe(3);
	});

	it("validates type: string (always passes)", () => {
	  const meta = { name: "anything goes" };
	  const schema = {
	    name: { required: true, type: "string" as const },
	  };
	  const result = validate(meta, schema);

	  expect(result.valid).toBe(true);
	  expect(result.errors).toEqual([]);
	});

	it("skips type check when no type specified in schema", () => {
	  const meta = { count: "not-a-number" };
	  const schema = {
	    count: { required: true },
	    // no type specified -> should not validate type
	  };
	  const result = validate(meta, schema);

	  expect(result.valid).toBe(true);
	  expect(result.errors).toEqual([]);
	});

	it("handles field present with no type constraint (falls through switch)", () => {
	  const meta = { anything: "value" };
	  const schema = {
	    anything: {}, // no required, no type
	  };
	  const result = validate(meta, schema);

	  expect(result.valid).toBe(true);
	  expect(result.errors).toEqual([]);
	});
});
