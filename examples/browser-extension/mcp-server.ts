/**
 * MCP Server for the defuss browser extension.
 *
 * Exposes every browser-extension tool to LLMs via the Model Context Protocol
 * (stdio transport). Under the hood it starts the same HTTP work-queue server
 * that the extension polls and delegates each MCP tool call to `doWorkItem`.
 *
 * Run with:  bun run mcp   (or:  tsx mcp-server.ts)
 */

// MCP stdio uses stdout for the JSON-RPC protocol — redirect console.log
// so that Express / RPC server output does not corrupt the stream.
const _origLog = console.log;
console.log = console.error;

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	ListToolsRequestSchema,
	CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { doWorkItem, server as httpServer } from "./src/server/server.js";
import { allMcpTools } from "./src/mcp-tools.js";
import type { McpToolMeta } from "./src/types.js";
import { fileRead, fileWrite, fileDelete } from "./src/server/file-ops.js";

// -- Build a lookup map: MCP tool name → metadata --------------------------
const toolsByName = new Map<string, McpToolMeta>(
	allMcpTools.map((t) => [t.name, t]),
);

// -- MCP server -------------------------------------------------------------
const mcp = new Server(
	{ name: "defuss-browser-extension", version: "0.0.1" },
	{ capabilities: { tools: {} } },
);

let shuttingDown = false;

async function shutdown(reason: string): Promise<void> {
	if (shuttingDown) return;
	shuttingDown = true;

	console.error(`[mcp] shutting down (${reason})`);

	await Promise.allSettled([mcp.close(), httpServer.stop()]);
}

// tools/list — announce every tool to the LLM
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: allMcpTools.map((t) => ({
		name: t.name,
		description: t.description,
		inputSchema: t.inputSchema,
	})),
}));

// tools/call — file tools run on server; browser tools go via doWorkItem
mcp.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	// -- Server-side file tools (no browser roundtrip) --
	try {
		if (name === "file_read") {
			const text = await fileRead((args as any).path);
			return { content: [{ type: "text", text }] };
		}
		if (name === "file_write") {
			await fileWrite((args as any).path, (args as any).content);
			return { content: [{ type: "text", text: "OK" }] };
		}
		if (name === "delete_file") {
			await fileDelete((args as any).path);
			return { content: [{ type: "text", text: "OK" }] };
		}
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			content: [{ type: "text", text: `File tool error: ${message}` }],
			isError: true,
		};
	}

	// -- Browser-extension tools (via doWorkItem queue) --
	const meta = toolsByName.get(name);

	if (!meta) {
		return {
			content: [{ type: "text", text: `Unknown tool: ${name}` }],
			isError: true,
		};
	}

	try {
		const item = await doWorkItem({
			type: meta.workItemType,
			payload: args ?? {},
			options: { focusAutomation: true, closeTab: true },
		});

		const text =
			typeof item.result === "string"
				? item.result
				: JSON.stringify(item.result, null, 2);

		return { content: [{ type: "text", text }] };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return {
			content: [{ type: "text", text: `Tool error: ${message}` }],
			isError: true,
		};
	}
});

// -- Start ------------------------------------------------------------------
await httpServer.start();
console.error(
	`[mcp] HTTP work-queue server running — waiting for MCP client on stdio…`,
);

const transport = new StdioServerTransport();
mcp.onclose = () => {
	void shutdown("transport closed");
};
process.stdin.on("end", () => {
	void shutdown("stdin closed");
});
process.once("SIGINT", () => {
	void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
	void shutdown("SIGTERM");
});
await mcp.connect(transport);
