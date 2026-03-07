import { resolve, join } from "node:path";
import { existsSync } from "node:fs";
import type {
  StorybookConfig,
  ResolvedStorybookConfig,
  ThemeConfig,
} from "./types.js";

/** Default configuration values */
const defaults = {
  stories: ["src/**/*.storybook.{tsx,mdx}"],
  port: 6006,
  browsers: ["chromium"] as ("chromium" | "firefox" | "webkit")[],
  title: "defuss Storybook",
  outDir: ".storybook",
  css: [] as string[],
  themes: [] as ThemeConfig[],
};

/**
 * Load storybook configuration from the project directory.
 * Looks for `storybook.config.ts` - bun handles .ts imports natively.
 */
export async function loadConfig(
  projectDir: string,
): Promise<ResolvedStorybookConfig> {
  const absProjectDir = resolve(projectDir);
  let userConfig: StorybookConfig = {};

  const configPath = join(absProjectDir, "storybook.config.ts");
  if (existsSync(configPath)) {
    try {
      const mod = await import(configPath);
      userConfig = mod.default ?? mod;
    } catch (err) {
      console.warn(`Warning: Failed to load ${configPath}:`, err);
    }
  }

  return {
    stories: userConfig.stories ?? defaults.stories,
    port: userConfig.port ?? defaults.port,
    browsers: userConfig.browsers ?? defaults.browsers,
    title: userConfig.title ?? defaults.title,
    outDir: userConfig.outDir ?? defaults.outDir,
    css: userConfig.css ?? defaults.css,
    themes: userConfig.themes ?? defaults.themes,
    projectDir: absProjectDir,
  };
}

/** Type-safe config helper for storybook.config.ts files */
export function defineConfig(config: StorybookConfig): StorybookConfig {
  return config;
}
