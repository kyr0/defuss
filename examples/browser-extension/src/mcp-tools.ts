import type { McpToolMeta } from "./types.js";
import { mcpMeta as googleSearch } from "./tools/google-search.js";
import { mcpMeta as arztSuche } from "./tools/116117-arztsuche.js";
import {
  fileReadMeta,
  fileWriteMeta,
  deleteFileMeta,
} from "./tools/file-tools.js";

const doctorSearchAlias: McpToolMeta = {
  ...arztSuche,
  name: "116117_search",
  description:
    "Alias for 116117_arztsuche. Search the German 116117 doctor directory by specialty and location.",
};

/** All MCP-exposed tools — add new tool imports here */
export const allMcpTools: McpToolMeta[] = [
  googleSearch,
  arztSuche,
  doctorSearchAlias,
  fileReadMeta,
  fileWriteMeta,
  deleteFileMeta,
];
