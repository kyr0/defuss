import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ListToolsResultSchema } from "@modelcontextprotocol/sdk/types.js";

type TextContentBlock = {
  type: string;
  text?: string;
};

function getTextContent(content: ReadonlyArray<TextContentBlock>): string {
  return content
    .flatMap((item) =>
      item.type === "text" && typeof item.text === "string" ? [item.text] : [],
    )
    .join("\n")
    .trim();
}

export async function createExampleMcpSession(clientName: string) {
  const exampleDir = fileURLToPath(new URL(".", import.meta.url));
  const client = new Client({
    name: clientName,
    version: "0.0.1",
  });

  const transport = new StdioClientTransport({
    command: "bun",
    args: ["run", "mcp"],
    cwd: exampleDir,
    stderr: "inherit",
  });

  await client.connect(transport);

  async function ensureTools(requiredTools: string[]): Promise<Set<string>> {
    const tools = await client.request(
      { method: "tools/list", params: {} },
      ListToolsResultSchema,
    );
    const toolNames = new Set(tools.tools.map((tool) => tool.name));
    const missingTools = requiredTools.filter((toolName) => !toolNames.has(toolName));

    if (missingTools.length > 0) {
      throw new Error(
        `MCP server is missing required tool(s): ${missingTools.join(", ")}`,
      );
    }

    return toolNames;
  }

  async function callTextTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const result = await client.callTool({ name, arguments: args });
    const text = getTextContent(result.content as ReadonlyArray<TextContentBlock>);

    if (result.isError) {
      throw new Error(text || `MCP tool failed: ${name}`);
    }

    return text;
  }

  async function close(): Promise<void> {
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
  }

  return {
    ensureTools,
    callTextTool,
    close,
  };
}