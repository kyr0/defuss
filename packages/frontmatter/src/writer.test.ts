import { describe, expect, it } from "vitest";
import { write } from "./writer.js";

describe("write", () => {
	it("writes simple key-value pairs", () => {
		const meta = { title: "My Page", date: "2025-09-06" };
		const result = write(meta);

		expect(result).toBe("---\ntitle: My Page\ndate: 2025-09-06\n---\n");
	});

	it("writes empty frontmatter for empty object", () => {
		const result = write({});

		expect(result).toBe("---\n---\n");
	});

	it("quotes values containing colons", () => {
		const meta = { title: "Hello: World" };
		const result = write(meta);

		expect(result).toBe('---\ntitle: "Hello: World"\n---\n');
	});

	it("quotes values containing newlines", () => {
		const meta = { description: "Line 1\nLine 2" };
		const result = write(meta);

		expect(result).toBe('---\ndescription: "Line 1\\nLine 2"\n---\n');
	});

	it("quotes values containing double quotes", () => {
		const meta = { title: 'Say "Hello"' };
		const result = write(meta);

		expect(result).toBe('---\ntitle: "Say \\"Hello\\""\n---\n');
	});

	it("does not quote simple values", () => {
		const meta = { title: "Hello World", count: "42" };
		const result = write(meta);

		expect(result).toBe("---\ntitle: Hello World\ncount: 42\n---\n");
	});

	it("handles values with leading/trailing spaces by quoting", () => {
		const meta = { title: " spaced " };
		const result = write(meta);

		expect(result).toBe('---\ntitle: " spaced "\n---\n');
	});

	it("handles empty string values", () => {
		const meta = { title: "" };
		const result = write(meta);

		expect(result).toBe("---\ntitle: \n---\n");
	});
});
