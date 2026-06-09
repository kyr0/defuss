import type { ParseResult } from "./index.js";

/** Sentinel byte length for the frontmatter delimiter `---` */
const DELIMITER = "---";

/**
 * Parses frontmatter from the beginning of a text string.
 * Frontmatter must start at line 1 with --- and end with ---.
 * Each line inside is parsed as `key: value`.
 * Returns { meta: {}, body: text } if no frontmatter is found.
 */
export function parse(text: string): ParseResult {
	// Quick check: text must start with the delimiter
	if (!text.startsWith(DELIMITER)) {
		return { meta: {}, body: text };
	}

	// Find the first newline after the opening ---
	const firstNewline = text.indexOf("\n", DELIMITER.length);
	if (firstNewline === -1) {
		// Single line, no closing delimiter possible
		return { meta: {}, body: text };
	}

	// Check for empty frontmatter: ---\n--- immediately
	const afterFirstNewline = firstNewline + 1;
	if (text.startsWith(DELIMITER, afterFirstNewline)) {
		const closeEnd = afterFirstNewline + DELIMITER.length;
		const body = text.slice(closeEnd).trim();
		return { meta: {}, body };
	}

	// Find the closing --- on its own line
	// Search for \n---\n or \n--- at end of string
	let closeIndex = -1;
	let searchFrom = afterFirstNewline;

	while (searchFrom < text.length) {
		const idx = text.indexOf("\n" + DELIMITER, searchFrom);
		if (idx === -1) break;

		// Check that --- is followed by \n or end of string
		const after = idx + 1 + DELIMITER.length;
		if (after >= text.length || text[after] === "\n") {
			closeIndex = idx;
			break;
		}
		// Not a valid closing delimiter, keep searching
		searchFrom = idx + 1;
	}

	if (closeIndex === -1) {
		// No closing delimiter found
		return { meta: {}, body: text };
	}

	// Extract the frontmatter block (between opening and closing ---)
	const frontmatterBlock = text.slice(firstNewline + 1, closeIndex);
	const body = text.slice(closeIndex + 1 + DELIMITER.length).trim();

	// Parse key: value lines
	const meta: Record<string, string> = {};
	const lines = frontmatterBlock.split("\n");

	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line) continue;

		const colonIndex = line.indexOf(":");
		if (colonIndex === -1) {
			// Key with no value
			meta[line] = "";
		} else {
			const key = line.slice(0, colonIndex).trim();
			let value = line.slice(colonIndex + 1).trim();

			// Strip surrounding quotes (single or double)
			if (
				value.length >= 2 &&
				((value[0] === '"' && value[value.length - 1] === '"') ||
					(value[0] === "'" && value[value.length - 1] === "'"))
			) {
				value = value.slice(1, -1);
			}

			meta[key] = value;
		}
	}

	return { meta, body };
}
