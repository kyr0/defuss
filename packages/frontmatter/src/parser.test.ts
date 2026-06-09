import { describe, expect, it } from "vitest";
import { parse } from "./parser.js";

describe("parse", () => {
	it("parses simple key-value frontmatter", () => {
		const input = "---\ntitle: My Page\ndate: 2025-09-06\n---\n\nBody text here.";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "My Page",
			date: "2025-09-06",
		});
		expect(result.body).toBe("Body text here.");
	});

	it("parses frontmatter with quoted values", () => {
		const input = '---\ntitle: "Hello: World"\n---\n\nBody';
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "Hello: World",
		});
		expect(result.body).toBe("Body");
	});

	it("returns empty meta and full body when no frontmatter present", () => {
		const input = "Just plain text\nwith no frontmatter.";
		const result = parse(input);

		expect(result.meta).toEqual({});
		expect(result.body).toBe("Just plain text\nwith no frontmatter.");
	});

	it("returns empty meta when frontmatter block is empty", () => {
		const input = "---\n---\n\nBody content";
		const result = parse(input);

		expect(result.meta).toEqual({});
		expect(result.body).toBe("Body content");
	});

	it("handles frontmatter with no body", () => {
		const input = "---\ntitle: Only Frontmatter\n---";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "Only Frontmatter",
		});
		expect(result.body).toBe("");
	});

	it("handles empty string input", () => {
		const result = parse("");

		expect(result.meta).toEqual({});
		expect(result.body).toBe("");
	});

	it("ignores --- not at the start of the text", () => {
		const input = "Some text\n---\ntitle: Not frontmatter\n---\n\nBody";
		const result = parse(input);

		expect(result.meta).toEqual({});
		expect(result.body).toBe("Some text\n---\ntitle: Not frontmatter\n---\n\nBody");
	});

	it("trims values correctly", () => {
		const input = "---\ntitle:   Spaced Value   \n---\n\nBody";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "Spaced Value",
		});
	});

	it("handles single quotes in values", () => {
		const input = "---\ntitle: 'Single quoted'\n---\n\nBody";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "Single quoted",
		});
	});

	it("handles keys with no value", () => {
		const input = "---\ntitle\n---\n\nBody";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "",
		});
	});

	it("handles multiple spaces around colon", () => {
		const input = "---\ntitle   :   Value\n---\n\nBody";
		const result = parse(input);

		expect(result.meta).toEqual({
			title: "Value",
		});
	});

	it("preserves body content with leading/trailing whitespace trimmed", () => {
		const input = "---\ntitle: Test\n---\n\n  Body with spaces  \n";
		const result = parse(input);

		expect(result.body).toBe("Body with spaces");
	});

	it("handles frontmatter with blank lines inside", () => {
	  const input = "---\ntitle: Test\n\nauthor: Me\n---\n\nBody";
	  const result = parse(input);

	  expect(result.meta).toEqual({
	    title: "Test",
	    author: "Me",
	  });
	  expect(result.body).toBe("Body");
	});

	it("returns empty meta for single-line --- with no newline", () => {
	  const result = parse("---");

	  expect(result.meta).toEqual({});
	  expect(result.body).toBe("---");
	});

	it("skips false closing --- embedded in content and finds real one", () => {
	  // "---" appears in a value line without newline after it, should keep searching
	  const input = "---\ntitle: test---\nauthor: Me\n---\n\nBody";
	  const result = parse(input);

	  expect(result.meta).toEqual({
	    title: "test---",
	    author: "Me",
	  });
	  expect(result.body).toBe("Body");
	});

	it("skips --- not at start of line and continues searching", () => {
	  // \n---more is not a valid closing delimiter (not followed by \n or EOL)
	  // It gets parsed as a key with no value inside the frontmatter block
	  const input = "---\ntitle: test\n---more\nauthor: Me\n---\n\nBody";
	  const result = parse(input);

	  expect(result.meta).toEqual({
	    title: "test",
	    "---more": "",
	    author: "Me",
	  });
	  expect(result.body).toBe("Body");
	});

	it("handles closing --- at end of string without trailing newline", () => {
	  const input = "---\ntitle: Test\n---";
	  const result = parse(input);

	  expect(result.meta).toEqual({
	    title: "Test",
	  });
	  expect(result.body).toBe("");
	});

	it("returns empty meta when opening --- exists but no closing --- found", () => {
	  const input = "---\ntitle: No closing delimiter";
	  const result = parse(input);

	  expect(result.meta).toEqual({});
	  expect(result.body).toBe("---\ntitle: No closing delimiter");
	});
});
