import { join } from "node:path";
import type { SsgConfig } from "./types.js";

export const filePathToRoute = (
  filePath: string,
  config: SsgConfig,
  cwd: string,
): string => {
  // Normalize to use forward slashes
  let normalizedPath = filePath
    .replace(join(cwd, config.pages), "")
    .replace(/\\/g, "/");

  // Remove file extension
  normalizedPath = normalizedPath.replace(/\.(mdx?|html?)$/, "");

  // Handle index files
  if (normalizedPath.endsWith("/index")) {
    normalizedPath = normalizedPath.slice(0, -"/index".length);
  } else if (normalizedPath === "index") {
    normalizedPath = "";
  }

  // Ensure leading slash
  return `/${normalizedPath}`;
};
