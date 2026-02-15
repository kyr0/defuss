import type { Options } from "@mdx-js/esbuild";
import type { VNode } from "defuss/server";

export type RemarkPlugins = Options["remarkPlugins"];
export type RehypePlugins = Options["rehypePlugins"];

export type StatusCode =
  | "OK"
  | "MISSING_PROJECT_DIR"
  | "MISSING_PACKAGE_JSON"
  | "INVALID_JSON"
  | "UNSUPPORTED_PM"
  | "INSTALL_FAILED"
  | "INVALID_CONFIG"
  | "INVALID_PROJECT_DIR"
  | "PORT_IN_USE";

export type Status = {
  code: StatusCode;
  message: string;
};

export type PluginFnPageHtml = (
  html: string,
  relativeOutputHtmlFilePath: string,
  projectDir: string,
  config: SsgConfig,
) => Promise<string> | string;

export type PluginFnPageVdom = (
  vdom: VNode,
  relativeOutputHtmlFilePath: string,
  projectDir: string,
  config: SsgConfig,
  props: Record<string, any>,
) => Promise<VNode> | VNode;

export type PluginFnPageDom = (
  dom: HTMLElement,
  relativeOutputHtmlFilePath: string,
  projectDir: string,
  config: SsgConfig,
) => Promise<HTMLElement> | HTMLElement;

export type PluginFnPrePost = (
  projectDir: string,
  config: SsgConfig,
) => Promise<void> | void;

export type BuildMode = "serve" | "build" | "both";

export interface BuildOptions {
  /**
   * Enable debug logging during the build process
   * Defaults to false
   */
  debug?: boolean;

  /**
   * The root directory of the project to build
   * No default - this must be provided
   */
  projectDir: string;

  /**
   * The mode in which to run the build: "serve" for development server mode,
   * "build" for static site generation mode;
   * Defaults to "build"
   */
  mode: Omit<BuildMode, "both">;

  /**
   * When set, only the changed file is rebuilt instead of the entire project.
   * This is used by the dev server for incremental rebuilds.
   * The path should be absolute.
   */
  changedFile?: string;
}

export type PluginFn =
  | PluginFnPageHtml
  | PluginFnPageVdom
  | PluginFnPageDom
  | PluginFnPrePost;

/**
 * Plugin interface for extending the SSG build process
 */
export interface SsgPlugin<T = PluginFn> {
  /**
   * The name of the plugin
   */
  name: string;

  /**
   * When to run the plugin: "pre" before the build starts, "post" after the build completes
   * "page-vdom" after the VDOM for each page is created, before rendering to DOM
   * "page-dom" after the DOM for each page is created, before serializing to HTML
   * "page-html" after the HTML for each page is created, before writing to disk
   */
  phase: "pre" | "page-vdom" | "page-dom" | "page-html" | "post";

  /**
   * The mode(s) in which the plugin should run: "serve" for development server mode,
   * "build" for static site generation mode, or "both" for both modes
   * Defaults to "both"
   */
  mode: BuildMode;

  /**
   * The plugin function to execute
   * @param config The current SsgConfig object
   */
  fn: T;
}

export interface SsgConfig {
  /**
   * Input directory containing page files (e.g., MDX files)
   * Defaults to "pages"
   */
  pages: string;

  /**
   * Output directory for generated static site files
   * Defaults to "dist"
   */
  output: string;

  /**
   * Directory containing reusable components (e.g., defuss components)
   * Defaults to "components"
   */
  components: string;

  /**
   * Directory containing static assets (e.g., images, fonts)
   * Defaults to "assets"
   */
  assets: string;

  /**
   * Temporary working directory for build process
   * Defaults to ".ssg-temp"
   */
  tmp: string;

  /**
   * Optional list of plugins to extend the build process
   */
  plugins: Array<SsgPlugin>;

  /**
   * Remark plugins to use for MDX processing
   * You can import the default set from "defuss-ssg" and extend it
   * like this: import { remarkPlugins as defaultRemarkPlugins } from "defuss-ssg"
   */
  remarkPlugins: Options["remarkPlugins"];

  /**
   * Rehype plugins to use for MDX processing
   * You can import the default set from "defuss-ssg" and extend it
   * like this: import { rehypePlugins as defaultRehypePlugins } from "defuss-ssg"
   */
  rehypePlugins: Options["rehypePlugins"];
}
