import fg from "fast-glob";
import { basename, relative, resolve } from "node:path";
import type { StoryManifestEntry, ResolvedStorybookConfig } from "./types.js";

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

    // Derive default title from filename: "Button.storybook.tsx" → "Button"
    const title = fileName
      .replace(/\.storybook\.(tsx|mdx)$/, "")
      .replace(/([a-z])([A-Z])/g, "$1 $2"); // CamelCase → "Camel Case"

    entries.push({
      id,
      title,
      filePath: resolve(filePath),
      relativePath,
      storyNames: [], // populated at runtime after module import
      type,
    });
  }

  return entries;
}

/**
 * Generate the virtual module code for the story manifest.
 * This is imported as `virtual:storybook/manifest` in the shell app.
 */
export function generateManifestModule(entries: StoryManifestEntry[]): string {
  const manifest = entries.map(({ id, title, relativePath, type }) => ({
    id,
    title,
    relativePath,
    type,
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
