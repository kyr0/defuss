import type { WorkItemType, WorkItemResult } from "../../types";

/** Interface that each content-script-side tool must implement */
export interface ContentScriptTool<P = unknown, R = unknown> {
  /** The work item type this tool handles (e.g. "google_search") */
  type: WorkItemType;
  /** Execute the tool inside the tab's content-script context */
  execute(data: P): Promise<WorkItemResult<R>>;
}

/** Registry of content-script-side tools, keyed by WorkItemType */
const tools = new Map<WorkItemType, ContentScriptTool>();

/** Register a content-script tool for a specific work item type */
export function registerContentScriptTool(tool: ContentScriptTool): void {
  tools.set(tool.type, tool);
  console.log(`[tab-tools] registered content-script tool for "${tool.type}"`);
}

/** Look up and execute a registered tool by type */
export async function executeTool(
  type: WorkItemType,
  data: unknown,
): Promise<WorkItemResult> {
  const tool = tools.get(type);
  if (!tool) {
    return {
      success: false,
      error: {
        name: "ToolNotFound",
        message: `No content-script tool registered for type "${type}"`,
      },
    };
  }
  return tool.execute(data);
}
