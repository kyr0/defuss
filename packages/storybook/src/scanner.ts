import fg from "fast-glob";
import { readFileSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import type { StoryManifestEntry, ResolvedStorybookConfig } from "./types.js";

/** Extract order from MDX frontmatter YAML */
function extractMdxOrder(content: string): number {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return Infinity;
  const orderMatch = fmMatch[1].match(/^order:\s*(\d+)/m);
  return orderMatch ? Number.parseInt(orderMatch[1], 10) : Infinity;
}

/** Extract order from TSX meta object */
function extractTsxOrder(content: string): number {
  const metaMatch = content.match(/export\s+const\s+meta[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!metaMatch) return Infinity;
  const orderMatch = metaMatch[1].match(/order:\s*(\d+)/);
  return orderMatch ? Number.parseInt(orderMatch[1], 10) : Infinity;
}

/** Extract title from MDX frontmatter or TSX meta */
function extractTitle(content: string, isMdx: boolean): string | null {
  if (isMdx) {
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) return null;
    const titleMatch = fmMatch[1].match(/^title:\s*(.+)/m);
    return titleMatch ? titleMatch[1].trim().replace(/^["']|["']$/g, "") : null;
  }
  const metaMatch = content.match(/export\s+const\s+meta[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!metaMatch) return null;
  const titleMatch = metaMatch[1].match(/title:\s*["']([^"']+)["']/);
  return titleMatch ? titleMatch[1] : null;
}

/**
 * Scan the project directory for story files matching the configured globs.
 * Returns a manifest of discovered story entries.
 */
export async function scanStories(
  config: ResolvedStorybookConfig,
): Promise<StoryManifestEntry[]> {
  const { projectDir, stories: patterns } = config;

  const files = await fg(patterns, {
    cwd: projectDir,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.storybook/**"],
  });

  const entries: StoryManifestEntry[] = [];

  for (const filePath of files.sort()) {
    const relativePath = relative(projectDir, filePath);
    const fileName = basename(filePath);
    const isMdx = fileName.endsWith(".storybook.mdx");
    const type = isMdx ? ("mdx" as const) : ("tsx" as const);

    // Derive id from relative path: "src/components/Button.storybook.tsx" → "components-button"
    const id = relativePath
      .replace(/^src\//, "")
      .replace(/\.storybook\.(tsx|mdx)$/, "")
      .replace(/\//g, "-")
      .toLowerCase();

    // Read file to extract order and title from meta/frontmatter
    let content = "";
    try {
      content = readFileSync(filePath, "utf-8");
    } catch {}

    const order = isMdx ? extractMdxOrder(content) : extractTsxOrder(content);
    const metaTitle = extractTitle(content, isMdx);

    // Derive default title from filename: "Button.storybook.tsx" → "Button"
    const defaultTitle = fileName
      .replace(/\.storybook\.(tsx|mdx)$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2");

    const title = metaTitle || defaultTitle;

    entries.push({
      id,
      title,
      filePath: resolve(filePath),
      relativePath,
      storyNames: [],
      type,
      order,
    });
  }

  // Sort by order, then alphabetically by title
  entries.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  return entries;
}

/**
 * Generate the virtual module code for the story manifest.
 * This is imported as `virtual:storybook/manifest` in the shell app.
 */
export function generateManifestModule(entries: StoryManifestEntry[]): string {
  const manifest = entries.map(({ id, title, relativePath, type, order }) => ({
    id,
    title,
    relativePath,
    type,
    order,
  }));
  return `export default ${JSON.stringify(manifest, null, 2)};`;
}

/**
 * Generate the virtual module code for dynamic story imports.
 * This is imported as `virtual:storybook/stories` in the shell app.
 */
export function generateStoriesModule(entries: StoryManifestEntry[]): string {
  const imports = entries
    .map((entry) => `  "${entry.id}": () => import("${entry.filePath}")`)
    .join(",\n");
  return `export default {\n${imports}\n};`;
}

/**
 * Generate the virtual module code for raw story source code.
 * Maps storyId → raw file contents as string.
 */
export function generateSourcesModule(entries: StoryManifestEntry[]): string {
  const sources: Record<string, string> = {};
  for (const entry of entries) {
    try {
      sources[entry.id] = readFileSync(entry.filePath, "utf-8");
    } catch {
      sources[entry.id] = "// Source not available";
    }
  }
  return `export default ${JSON.stringify(sources)};`;
}
