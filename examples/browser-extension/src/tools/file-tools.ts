import type { McpToolMeta } from "../types.js";

export const fileReadMeta: McpToolMeta = {
  workItemType: "file_read" as any,
  name: "file_read",
  description:
    "Read the contents of a file relative to the workspace directory.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path within the workspace",
      },
    },
    required: ["path"],
  },
};

export const fileWriteMeta: McpToolMeta = {
  workItemType: "file_write" as any,
  name: "file_write",
  description:
    "Write content to a file relative to the workspace directory. Creates or overwrites.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path within the workspace",
      },
      content: {
        type: "string",
        description: "The text content to write",
      },
    },
    required: ["path", "content"],
  },
};

export const deleteFileMeta: McpToolMeta = {
  workItemType: "delete_file" as any,
  name: "delete_file",
  description:
    "Delete a file relative to the workspace directory. No-op if the file doesn't exist.",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Relative file path within the workspace",
      },
    },
    required: ["path"],
  },
};
