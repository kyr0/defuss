/**
 * Example: Doctor Search via the MCP server + browser extension
 *
 * 1. Launch the MCP server over stdio
 * 2. delete_file    → clear previous doctor-search-result.json
 * 3. 116117_search  → search the 116117 doctor directory via the extension
 * 4. file_write     → write the JSON result to workspace/doctor-search-result.json
 *
 * Run with: bun run test:doctor-search
 *
 * Do not run `bun run mcp` in parallel with this example. This script spawns
 * its own MCP server child process, which in turn owns the HTTP work queue
 * that the extension polls.
 */
import { createExampleMcpSession } from "./example-mcp-client.js";

const session = await createExampleMcpSession("example-mcp-doctor-search");

const query = "Allgemeinmediziner";
const place = "10115 Berlin";
const outputPath = "doctor-search-result.json";

try {
	const requiredTools = ["delete_file", "file_write", "116117_search"];
	const toolNames = await session.ensureTools(requiredTools);

	console.log(
		`[example] MCP tools ready: ${Array.from(toolNames).sort().join(", ")}`,
	);
	console.log(`[example] Doctor search query: "${query}" in "${place}"`);

	await session.callTextTool("delete_file", { path: outputPath });
	console.log(`[example] Cleared ${outputPath}`);

	const rawResult = await session.callTextTool("116117_search", {
		query,
		place,
	});

	await session.callTextTool("file_write", {
		path: outputPath,
		content: rawResult,
	});

	let entryCount = "unknown";
	try {
		const parsed = JSON.parse(rawResult) as { arztPraxisDatas?: unknown[] };
		if (Array.isArray(parsed.arztPraxisDatas)) {
			entryCount = String(parsed.arztPraxisDatas.length);
		}
	} catch {
		// Keep the raw result on disk even if parsing fails.
	}

	console.log(`[example] Wrote ${outputPath} (${entryCount} entries)`);
} finally {
	await session.close();
}
