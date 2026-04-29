import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import type { PluginOption, ResolvedConfig, ViteDevServer } from "vite";

import {
	getBrowserGlobals,
	getDocument,
	renderToString,
	renderSync,
	type VNode,
} from "defuss/server";

import { applyAutoHydrate } from "./plugins/auto-hydrate.js";
import { build } from "./build.js";
import { readConfig } from "./config.js";
import {
	handleEndpointRoute,
	matchRoutePattern,
	resolveEndpoints,
	type HttpMethod,
	type ResolvedEndpoint,
} from "./endpoints.js";
import {
	createWebRequest,
	readIncomingBody,
	sendWebResponse,
} from "./http-adapter.js";
import { filePathToRoute } from "./path.js";
import { discoverRpcFile, handleRpcRequest, initializeRpc } from "./rpc.js";
import type {
	DefussSsgViteOptions,
	DevChangeKind,
	SsgConfig,
} from "./types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIME_TYPES: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".gif": "image/gif",
	".html": "text/html; charset=utf-8",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".txt": "text/plain; charset=utf-8",
	".webp": "image/webp",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".xml": "application/xml; charset=utf-8",
};

const isHtmlLikeFile = (filePath: string): boolean => {
	const extension = extname(filePath);
	return extension === "" || extension === ".md" || extension === ".mdx" || extension === ".html";
};

const getOutputCandidates = (pathname: string): string[] => {
	if (pathname === "/") {
		return ["index.html"];
	}

	const trimmedPath = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
	if (trimmedPath.length === 0) {
		return ["index.html"];
	}

	if (extname(trimmedPath)) {
		return [trimmedPath];
	}

	return [`${trimmedPath}.html`, `${trimmedPath}/index.html`];
};

const classifyChangedFile = (
	file: string,
	projectDir: string,
	config: SsgConfig,
	rpcFile: string | null,
): DevChangeKind => {
	const relativeFile = file.startsWith(projectDir)
		? file.slice(projectDir.length).replace(/^[\\/]+/, "").replace(/\\/g, "/")
		: file.replace(/\\/g, "/");

	if (relativeFile === "config.ts" || relativeFile === "config.js") {
		return "config";
	}

	if (rpcFile && resolve(file) === resolve(rpcFile)) {
		return "rpc";
	}

	if (relativeFile.startsWith(`${config.pages}/`)) {
		return "page";
	}

	if (relativeFile.startsWith(`${config.components}/`)) {
		return "component";
	}

	if (relativeFile.startsWith(`${config.assets}/`)) {
		return "asset";
	}

	return "other";
};

const refreshDynamicEndpoints = async (
	projectDir: string,
	config: SsgConfig,
	debug: boolean,
): Promise<ResolvedEndpoint[]> => {
	const pagesDir = join(projectDir, config.pages);
	const endpointsDir = join(projectDir, ".endpoints");
	return (await resolveEndpoints(pagesDir, endpointsDir, debug)).filter(
		(endpoint) => !endpoint.prerender,
	);
};

const resolveOutputFile = async (
	outputDir: string,
	pathname: string,
): Promise<string | null> => {
	for (const candidate of getOutputCandidates(pathname)) {
		const filePath = join(outputDir, candidate);
		if (!existsSync(filePath)) {
			continue;
		}

		const fileStat = await stat(filePath);
		if (fileStat.isFile()) {
			return filePath;
		}
	}

	return null;
};

const shouldBypassSsgMiddleware = (pathname: string): boolean =>
	pathname.startsWith("/@") || pathname.startsWith("/__vite");

export function defussSsg(
	options: DefussSsgViteOptions = {},
): PluginOption[] {
	let viteConfig: ResolvedConfig;
	let projectDir = "";
	let config: SsgConfig;
	let dynamicEndpoints: ResolvedEndpoint[] = [];
	let rpcFile: string | null = null;
	let rebuildQueue: Promise<void> = Promise.resolve();
	const debug = options.debug ?? false;
	const writeDevOutput = options.writeDevOutput ?? true;

	const refreshConfig = async () => {
		config = await readConfig(projectDir, debug);
		rpcFile =
			typeof config.rpc === "string"
				? resolve(projectDir, config.rpc)
				: discoverRpcFile(projectDir);
	};

	const enqueue = (task: () => Promise<void>): Promise<void> => {
		const next = rebuildQueue.then(task, task);
		rebuildQueue = next.catch(() => undefined);
		return next;
	};

	const rebuildOutput = async (changedFile?: string) => {
		if (!writeDevOutput) {
			return;
		}

		await build({
			projectDir,
			debug,
			mode: "serve",
			changedFile,
		});

		dynamicEndpoints = await refreshDynamicEndpoints(projectDir, config, debug);
	};

	const maybeHandleRpcRequest = async (
		req: any,
		res: any,
	): Promise<boolean> => {
		const requestUrl = new URL(req.url || "/", "http://localhost");
		if (req.method !== "POST") {
			return false;
		}
		if (requestUrl.pathname !== "/rpc" && requestUrl.pathname !== "/rpc/schema") {
			return false;
		}
		if (!rpcFile || config.rpc === false) {
			return false;
		}

		const rawBody = await readIncomingBody(req);
		const request = createWebRequest(req, rawBody);
		const response = await handleRpcRequest({
			request,
		});
		await sendWebResponse(res, response, request.method === "HEAD");
		return true;
	};

	const maybeHandleDynamicEndpoint = async (
		req: any,
		res: any,
	): Promise<boolean> => {
		const requestUrl = new URL(req.url || "/", "http://localhost");

		for (const endpoint of dynamicEndpoints) {
			const params = matchRoutePattern(endpoint.routePattern, requestUrl.pathname);
			if (!params) {
				continue;
			}

			const rawBody = await readIncomingBody(req);
			const request = createWebRequest(req, rawBody);
			const method = String(request.method).toUpperCase() as HttpMethod;
			let response = await handleEndpointRoute(
				{ request, params },
				endpoint.compiledFile,
				endpoint.routePattern,
				method,
			);

			if (request.method === "HEAD" && response.status === 405) {
				response = await handleEndpointRoute(
					{ request, params },
					endpoint.compiledFile,
					endpoint.routePattern,
					"GET",
				);
			}

			await sendWebResponse(res, response, request.method === "HEAD");
			return true;
		}

		return false;
	};

	const resolveSourceFileForPath = async (
		pathname: string,
	): Promise<string | null> => {
		const candidates = getOutputCandidates(pathname);
		const pagesDir = join(projectDir, config.pages);

		for (const candidate of candidates) {
			// Try .mdx, .md, .html extensions
			for (const ext of [".mdx", ".md", ".html"]) {
				const withoutExt = candidate.replace(/\.html$/, "");
				const sourceFile = join(pagesDir, withoutExt + ext);
				if (existsSync(sourceFile)) {
					return sourceFile;
				}
			}
		}
		return null;
	};

	const maybeServeSSRPage = async (
		server: ViteDevServer,
		req: any,
		res: any,
	): Promise<boolean> => {
		const method = String(req.method || "GET").toUpperCase();
		if (method !== "GET" && method !== "HEAD") {
			return false;
		}

		const requestUrl = new URL(req.url || "/", "http://localhost");
		if (shouldBypassSsgMiddleware(requestUrl.pathname)) {
			return false;
		}

		// Try to find a source file for this path
		const sourceFile = await resolveSourceFileForPath(requestUrl.pathname);
		if (!sourceFile) {
			return false;
		}

		// Only handle MDX/MD files through SSR (let Vite handle other assets)
		const ext = extname(sourceFile);
		if (ext !== ".mdx" && ext !== ".md") {
			return false;
		}

		try {
			// Use Vite's ssrLoadModule to load the transformed MDX module
			const modulePath = `/${relative(server.config.root, sourceFile)}`;
			const moduleExports = await server.ssrLoadModule(modulePath);
			const PageComponent = moduleExports.default;

			if (!PageComponent) {
				return false;
			}

			// Render the component to HTML using defuss SSR
			const browserGlobals = getBrowserGlobals();
			const document = getDocument(false, browserGlobals);
			let vdom = PageComponent() as VNode;

			// Apply auto-hydration: wrap defuss components with hydration wrappers + scripts
			const componentsDir = join(projectDir, config.components);
			vdom = applyAutoHydrate(vdom, componentsDir, config.components, requestUrl.pathname);

			const el = renderSync(vdom, document.documentElement, { browserGlobals }) as any;
			let html = renderToString(el);

			// Inject Vite HMR client
			html = await server.transformIndexHtml(requestUrl.pathname, html);

			res.setHeader("Cache-Control", "no-store");
			res.setHeader("Content-Type", "text/html; charset=utf-8");
			res.statusCode = 200;
			res.end(method === "HEAD" ? undefined : html);
			return true;
		} catch {
			// If SSR fails, fall through to Vite dev server
			return false;
		}
	};

	// Serve /components/runtime.js and /components/*.js during dev
	const maybeServeComponent = async (
		server: ViteDevServer,
		req: any,
		res: any,
	): Promise<boolean> => {
		const requestUrl = new URL(req.url || "/", "http://localhost");
		const pathname = requestUrl.pathname;

		if (!pathname.startsWith(`/${config.components}/`)) {
			return false;
		}

		// Handle runtime.js - served from the package
		if (pathname === `/${config.components}/runtime.js`) {
			const runtimePath = join(__dirname, "runtime.ts");
			if (!existsSync(runtimePath)) {
				return false;
			}
			const transformed = await server.transformRequest(runtimePath);
			if (transformed) {
				res.setHeader("Cache-Control", "no-store");
				res.setHeader("Content-Type", "text/javascript; charset=utf-8");
				res.statusCode = 200;
				res.end(transformed.code);
				return true;
			}
			return false;
		}

		// Handle component files: /components/foo.js -> projectDir/components/foo.tsx
		const relativePath = pathname.slice(1);
		const componentBase = relativePath.replace(extname(relativePath), "");
		const componentsDir = join(projectDir, config.components);
		const extensions = [".tsx", ".ts", ".jsx", ".js"];
		let sourceFile: string | null = null;

		for (const ext of extensions) {
			const candidate = join(componentsDir, `${componentBase}${ext}`);
			if (existsSync(candidate)) {
				sourceFile = candidate;
				break;
			}
		}

		if (!sourceFile) {
			return false;
		}

		const transformed = await server.transformRequest(sourceFile);
		if (transformed) {
			res.setHeader("Cache-Control", "no-store");
			res.setHeader("Content-Type", "text/javascript; charset=utf-8");
			res.statusCode = 200;
			res.end(transformed.code);
			return true;
		}

		return false;
	};

	const maybeServeBuiltOutput = async (
		server: ViteDevServer,
		req: any,
		res: any,
	): Promise<boolean> => {
		if (!writeDevOutput) {
			return false;
		}

		const method = String(req.method || "GET").toUpperCase();
		if (method !== "GET" && method !== "HEAD") {
			return false;
		}

		const requestUrl = new URL(req.url || "/", "http://localhost");
		if (shouldBypassSsgMiddleware(requestUrl.pathname)) {
			return false;
		}

		const outputFile = await resolveOutputFile(
			join(projectDir, config.output),
			requestUrl.pathname,
		);
		if (!outputFile) {
			return false;
		}

		const body = await readFile(outputFile);
		res.setHeader("Cache-Control", "no-store");
		res.setHeader(
			"Content-Type",
			MIME_TYPES[extname(outputFile)] ?? "application/octet-stream",
		);

		if (outputFile.endsWith(".html")) {
			const html = await server.transformIndexHtml(
				requestUrl.pathname,
				body.toString("utf8"),
			);
			res.statusCode = 200;
			res.end(method === "HEAD" ? undefined : html);
			return true;
		}

		res.statusCode = 200;
		res.end(method === "HEAD" ? undefined : body);
		return true;
	};

	const plugin: PluginOption = {
		name: "vite:defuss-ssg",
		apply: "serve",
		config() {
			return {
				server: {
					watch: {
						ignored: [
							"**/node_modules/**",
							"**/dist/**",
							"**/.ssg-temp/**",
							"**/.endpoints/**",
							"**/.rpc/**",
						],
					},
				},
			};
		},
		async configResolved(resolvedConfig) {
			viteConfig = resolvedConfig;
			projectDir = resolve(options.projectDir ?? resolvedConfig.root);
			await refreshConfig();
		},
		async configureServer(server) {
			const watchedPaths = [
				join(projectDir, config.pages),
				join(projectDir, config.components),
				join(projectDir, config.assets),
				join(projectDir, "config.ts"),
			];
			if (rpcFile) {
				watchedPaths.push(rpcFile);
			}
			server.watcher.add(watchedPaths);

			await enqueue(async () => {
				await rebuildOutput();
				if (config.rpc !== false) {
					await initializeRpc(projectDir, config, debug);
				}
			});

			const handleStructuralChange = async (file: string) => {
				const kind = classifyChangedFile(file, projectDir, config, rpcFile);
				if (kind === "other") {
					return;
				}

				if (kind === "config") {
					await server.restart();
					return;
				}

				if (kind === "rpc") {
					await enqueue(async () => {
						await refreshConfig();
						if (config.rpc !== false) {
							await initializeRpc(projectDir, config, debug);
						}
					});
					server.ws.send({ type: "custom", event: "defuss:rpc-reloaded" });
					return;
				}

				server.ws.send({ type: "full-reload" });
			};

			server.watcher.on("add", (file) => {
				void handleStructuralChange(file);
			});
			server.watcher.on("unlink", (file) => {
				void handleStructuralChange(file);
			});

			server.middlewares.use(async (req, res, next) => {
				try {
					if (await maybeHandleRpcRequest(req, res)) {
						return;
					}
					if (await maybeHandleDynamicEndpoint(req, res)) {
						return;
					}
					// Serve hydration runtime + components
					if (await maybeServeComponent(server, req, res)) {
						return;
					}
					// Try SSR rendering first for MDX files
					if (await maybeServeSSRPage(server, req, res)) {
						return;
					}
					// Fall back to pre-built output if available
					if (await maybeServeBuiltOutput(server, req, res)) {
						return;
					}
				} catch (error) {
					next(error as Error);
					return;
				}

				next();
			});
		},
		async handleHotUpdate(ctx) {
			const kind = classifyChangedFile(ctx.file, projectDir, config, rpcFile);
			if (kind === "other") {
				return;
			}

			if (kind === "config") {
				await ctx.server.restart();
				return [];
			}

			if (kind === "rpc") {
				await enqueue(async () => {
					await refreshConfig();
					if (config.rpc !== false) {
						await initializeRpc(projectDir, config, debug);
					}
				});
				ctx.server.ws.send({ type: "custom", event: "defuss:rpc-reloaded" });
				return [];
			}

			const reloadPath =
				kind === "page" && isHtmlLikeFile(ctx.file)
					? filePathToRoute(ctx.file, config, projectDir)
					: undefined;

			ctx.server.ws.send({
				type: "full-reload",
				...(reloadPath ? { path: reloadPath } : {}),
			});

			return [];
		},
	};

	return [plugin];
}
