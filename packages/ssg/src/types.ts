import type { Options } from "@mdx-js/esbuild";
import type { VNode } from "defuss/server";

export type RemarkPlugins = Options["remarkPlugins"];
export type RehypePlugins = Options["rehypePlugins"];

export type StatusCode =
	| "OK"
	| "MISSING_PROJECT_DIR"
	| "MISSING_PACKAGE_JSON"
	| "MISSING_BUILD_OUTPUT"
	| "INVALID_JSON"
	| "UNSUPPORTED_PM"
	| "INSTALL_FAILED"
	| "INVALID_CONFIG"
	| "INVALID_PROJECT_DIR"
	| "PORT_IN_USE"
	| "SERVER_START_FAILED";

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
	 * "build" for static site generation mode, or "both" when building and then serving;
	 * Defaults to "build"
	 */
	mode: BuildMode;

	/**
	 * When set, only the changed file is rebuilt instead of the entire project.
	 * This is used by the dev server for incremental rebuilds.
	 * The path should be absolute.
	 */
	changedFile?: string;

	/**
	 * When true, the serve command spawns one worker per CPU core
	 * for load-balanced multi-process serving (useful for benchmarks).
	 * Defaults to false (single process).
	 */
	multicore?: boolean;
}

export interface DevOptions {
	/**
	 * Enable debug logging during the dev server lifecycle.
	 */
	debug?: boolean;

	/**
	 * The project root containing pages, components, assets and config.ts.
	 */
	projectDir: string;

	/**
	 * Port passed through to the Vite dev server.
	 * Defaults to 3000.
	 */
	port?: number;

	/**
	 * Host passed through to the Vite dev server.
	 * Defaults to true (listen on all interfaces).
	 */
	host?: string | boolean;

	/**
	 * Compatibility flag for dev mode.
	 * When true, dev also refreshes static output in dist alongside request-time SSR.
	 * Defaults to true for the CLI-backed dev command.
	 */
	writeDevOutput?: boolean;
}

export interface ServeOptions {
	/**
	 * Enable debug logging during the production runtime startup.
	 */
	debug?: boolean;

	/**
	 * The already-built project root to serve.
	 */
	projectDir: string;

	/**
	 * Public host for the production HTTP runtime.
	 * Defaults to defuss-express' configured host.
	 */
	host?: string;

	/**
	 * Public port for the production HTTP runtime.
	 * Defaults to 3000.
	 */
	port?: number;

	/**
	 * Worker count for defuss-express.
	 * Defaults to 1.
	 */
	workers?: number | "auto";
}

export type DevChangeKind =
	| "page"
	| "endpoint"
	| "component"
	| "asset"
	| "dependency"
	| "config"
	| "rpc"
	| "other";

export interface DefussSsgViteOptions {
	/**
	 * The project root. Defaults to Vite's resolved root.
	 */
	projectDir?: string;

	/**
	 * Enable debug logging.
	 */
	debug?: boolean;

	/**
	 * Compatibility flag for the Vite plugin's dev bridge.
	 * When true, request-time SSR also keeps dist output refreshed for middleware fallbacks.
	 */
	writeDevOutput?: boolean;
}

export interface ContentGlobOptions {
	/**
	 * Directory the glob patterns are resolved from.
	 * Defaults to the current working directory.
	 */
	cwd?: string;

	/**
	 * Directory used to derive public routes for matched page files.
	 * Defaults to "pages".
	 */
	pagesDir?: string;

	/**
	 * Optional ignore globs passed through to fast-glob.
	 */
	ignore?: string[];
}

export interface ContentEntry {
	/**
	 * Absolute file path on disk.
	 */
	filePath: string;

	/**
	 * Path relative to the glob `cwd`.
	 */
	relativePath: string;

	/**
	 * Route-friendly identifier without a leading slash.
	 */
	slug: string;

	/**
	 * Public route when the file lives under the configured pages directory.
	 */
	route?: string;

	/**
	 * Parsed YAML or TOML frontmatter.
	 */
	meta: Record<string, unknown>;
}

export type EndpointRouteMethod =
	| "get"
	| "post"
	| "put"
	| "delete"
	| "patch"
	| "head"
	| "options"
	| "all";

export interface EndpointRouteContext {
	request: Request;
	params: Record<string, string | undefined>;
}

export type EndpointRouteResponder = (
	context: EndpointRouteContext,
) => Promise<Response>;

export interface EndpointRouteRegistrar {
	register(
		method: EndpointRouteMethod,
		route: string,
		handler: EndpointRouteResponder,
	): void;
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
	 */
	remarkPlugins: Options["remarkPlugins"];

	/**
	 * Rehype plugins to use for MDX processing
	 */
	rehypePlugins: Options["rehypePlugins"];

	/**
	 * RPC configuration.
	 * - `true` (default): auto-discover `rpc.ts` or `rpc.js` in the project root
	 * - `false`: disable RPC support
	 * - `string`: path to a custom RPC file (relative to project root)
	 */
	rpc?: string | boolean;
}
