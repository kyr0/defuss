/** Story meta - describes a component and its available props */
export interface StoryMeta {
  /** Display title, slash-separated for grouping (e.g. "Components/Button") */
  title: string;
  /** Reference to the component function (used for prop introspection) */
  component?: Function;
  /** Optional description shown in the docs panel */
  description?: string;
  /** Explicit prop control declarations - overrides auto-detected props */
  argTypes?: Record<string, ArgType>;
  /** Default arg values applied to all stories unless overridden */
  args?: Record<string, unknown>;
}

/** Control definition for a single prop */
export interface ArgType {
  /** Which control widget to render */
  control:
    | "text"
    | "number"
    | "boolean"
    | "select"
    | "color"
    | "object"
    | "range";
  /** Options for select controls */
  options?: string[];
  /** Default value for this prop */
  defaultValue?: unknown;
  /** Human-readable description */
  description?: string;
  /** Min value for number/range controls */
  min?: number;
  /** Max value for number/range controls */
  max?: number;
  /** Step for number/range controls */
  step?: number;
}

/** A story module as loaded from a .storybook.tsx file */
export interface StoryModule {
  meta: StoryMeta;
  /** All named exports (excluding meta) are story functions */
  [storyName: string]: StoryFunction | StoryMeta | unknown;
}

/** A story render function - returns JSX */
export type StoryFunction = (args?: Record<string, unknown>) => unknown;

/** Manifest entry for a discovered story file */
export interface StoryManifestEntry {
  /** Unique id derived from file path (e.g. "components-button") */
  id: string;
  /** Display title from meta or filename */
  title: string;
  /** Absolute path to the story file */
  filePath: string;
  /** Relative path from project root */
  relativePath: string;
  /** Named export names that are stories (excludes "meta", "default") */
  storyNames: string[];
  /** File type */
  type: "tsx" | "mdx";
}

/** Configuration for defuss-storybook */
export interface StorybookConfig {
  /** Glob patterns to find story files (default: ["src/**\/*.storybook.{tsx,mdx}"]) */
  stories?: string[];
  /** Dev server port (default: 6006) */
  port?: number;
  /** Browsers for Playwright tests (default: ["chromium"]) */
  browsers?: ("chromium" | "firefox" | "webkit")[];
  /** Title shown in the storybook shell (default: "defuss Storybook") */
  title?: string;
  /** Build output directory relative to project root (default: ".storybook") */
  outDir?: string;
  /** CSS files to include in the storybook shell */
  css?: string[];
  /** Theme CSS file paths to register as switchable themes */
  themes?: ThemeConfig[];
}

/** A theme that can be switched in the storybook UI */
export interface ThemeConfig {
  /** Display name for the theme */
  name: string;
  /** CSS class added to <html> when active (e.g. "theme-claude") */
  className: string;
  /** Path to the CSS file (relative to project root), imported at build time */
  cssPath?: string;
}

/** Resolved configuration with all defaults applied */
export interface ResolvedStorybookConfig {
  stories: string[];
  port: number;
  browsers: ("chromium" | "firefox" | "webkit")[];
  title: string;
  outDir: string;
  css: string[];
  themes: ThemeConfig[];
  /** Absolute path to the project directory */
  projectDir: string;
}

/** Viewport preset for the preview iframe */
export interface ViewportPreset {
  label: string;
  width: number;
  height: number;
}

/** Result of prop introspection */
export interface InspectedProp {
  name: string;
  control: ArgType["control"];
  defaultValue?: unknown;
  options?: string[];
  description?: string;
  min?: number;
  max?: number;
  step?: number;
}
