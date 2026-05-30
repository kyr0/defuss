/**
 * Example: File-driven Google Search via the MCP server + browser extension
 *
 * 1. Launch the MCP server over stdio
 * 2. delete_file   → clear previous search-results.json (idempotency)
 * 3. file_read     → read workspace/search-queries.txt (one query per line)
 * 4. google_search → run each query through the browser extension via MCP
 * 5. file_write    → write workspace/search-results.json with all results
 *
 * Run with:  bun run test:file-search
 *
 * Do not run `bun run mcp` in parallel with this example. This script spawns
 * its own MCP server child process, which in turn owns the HTTP work queue
 * that the extension polls.
 */
import { createExampleMcpSession } from "./example-mcp-client.js";

const session = await createExampleMcpSession("example-mcp-file-search");

try {
  const requiredTools = [
    "delete_file",
    "file_read",
    "file_write",
    "google_search",
    "116117_search",
  ];
  const toolNames = await session.ensureTools(requiredTools);

  console.log(
    `[example] MCP tools ready: ${Array.from(toolNames).sort().join(", ")}`,
  );

  // 1. Clear previous results (idempotent)
  await session.callTextTool("delete_file", { path: "search-results.json" });
  console.log("[example] Cleared search-results.json");

  // 2. Read search queries
  const raw = await session.callTextTool("file_read", {
    path: "search-queries.txt",
  });
  const queries = raw
    .split("\n")
    .map((query) => query.trim())
    .filter(Boolean);
  console.log(`[example] Found ${queries.length} queries:`, queries);

  // 3. Run each query through Google Search
  const results: Record<string, string> = {};

  for (const query of queries) {
    console.log(`[example] Searching via MCP: "${query}"`);
    results[query] = await session.callTextTool("google_search", {
      query,
      aiSummary: true,
    });
    console.log(`[example] Done: "${query}"`);
  }

  // 4. Write results
  await session.callTextTool("file_write", {
    path: "search-results.json",
    content: JSON.stringify(results, null, 2),
  });
  console.log("[example] Wrote search-results.json");
} finally {
  await session.close();
}
