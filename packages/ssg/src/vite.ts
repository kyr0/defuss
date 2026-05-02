import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PluginOption, ViteDevServer } from "vite";

import {
	getBrowserGlobals,
	getDocument,
	renderToString,
	renderSync,
	type VNode,
} from "defuss/server";

import { applyAutoHydrate } from "./hydration.js";
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

const HMR_CLIENT_MODULE_ID = "virtual:defuss-ssg/hmr-client";
const HMR_CLIENT_RESOLVED_ID = "\0virtual:defuss-ssg/hmr-client";
const HMR_CLIENT_CODE = `
if (import.meta.hot) {
	import.meta.hot.on("defuss:ssg-reload", (data) => {
		const runtime = window.__defuss_ssg_runtime;

		if (data?.kind === "asset" && data?.assetExt === ".css") {
			if (runtime?.refreshLocalStylesheets?.()) {
				return;
			}
		}

		const path = data?.path || window.location.pathname;
		const currentNorm = window.location.pathname.replace(/\\/$/, "") || "/";
		const eventNorm = (path || "/").replace(/\\/$/, "") || "/";
		const pathMatch = currentNorm === eventNorm;

		if (!data?.path || pathMatch) {
			if (runtime?.navigateTo) {
				runtime.pageCache?.clear();
				runtime.bustCache = true;
				runtime.navigateTo(window.location.pathname, true, {
					preserveHydratedState: true,
					kind: data?.kind,
					componentSrc: data?.componentSrc,
				});
			}
		}
	});
}
`.trim();

const resolveRuntimeHelperFile = (): string | null => {
	const candidates = [
		join(__dirname, "runtime.ts"),
		join(__dirname, "..", "src", "runtime.ts"),
		join(__dirname, "runtime.mjs"),
	];

	for (const candidate of candidates) {
		if (existsSync(candidate)) {
			return candidate;
		}
	}

	return null;
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
	const relativeFile = relative(projectDir, file)
		.replace(/^[\\/]+/, "")
		.replace(/\\/g, "/");

	if (relativeFile.startsWith("..")) {
		return "other";
	}

	if (relativeFile === "config.ts" || relativeFile === "config.js") {
		return "config";
	}

	if (rpcFile && resolve(file) === resolve(rpcFile)) {
		return "rpc";
	}

	if (relativeFile.startsWith(`${config.pages}/`)) {
		return isHtmlLikeFile(relativeFile) ? "page" : "endpoint";
	}

	if (relativeFile.startsWith(`${config.components}/`)) {
		return "component";
	}

	if (relativeFile.startsWith(`${config.assets}/`)) {
		return "asset";
	}

	return "dependency";
};

const filePathToComponentPublicPath = (
	file: string,
	projectDir: string,
	componentsDir: string,
): string | undefined => {
	const componentsRoot = join(projectDir, componentsDir);
	const relativeComponentPath = relative(componentsRoot, file).replace(/\\/g, "/");

	if (
		relativeComponentPath.startsWith("..") ||
		relativeComponentPath.length === 0
	) {
		return undefined;
	}

	return `/${join(componentsDir, relativeComponentPath)
		.replace(/\\/g, "/")
		.replace(/\.t?sx?$/, ".js")}`;
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

const sendCustomEvent = (
	server: ViteDevServer,
	event: string,
	data: Record<string, unknown> = {},
): void => {
	server.ws.send({
		type: "custom",
		event,
		data,
	});
};

export function defussSsg(
	options: DefussSsgViteOptions = {},
): PluginOption[] {
	let projectDir = "";
	let config: SsgConfig;
	let dynamicEndpoints: ResolvedEndpoint[] = [];
	let rpcFile: string | null = null;
	let rebuildQueue: Promise<void> = Promise.resolve();
	const debug = options.debug ?? false;
	const writeDevOutput = options.writeDevOutput ?? true;

	const invalidateChangedFile = (
		server: ViteDevServer,
		file: string,
		timestamp: number,
	) => {
		for (const environment of Object.values(server.environments)) {
			const modules = environment.moduleGraph.getModulesByFile(file);
			if (!modules) {
				continue;
			}

			for (const module of modules) {
				environment.moduleGraph.invalidateModule(
					module,
					new Set(),
					timestamp,
					true,
				);
			}
		}
	};

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

	let pendingRpcReload:
		| {
			promise: Promise<boolean>;
			resolve: (value: boolean) => void;
			reject: (error: unknown) => void;
		}
		| null = null;
	let rpcReloadTimer: ReturnType<typeof setTimeout> | null = null;
	let lastRpcReloadSignature: string | null = null;
	let lastRpcReloadResult = false;
	const pendingSsgReloads = new Map<
		string,
		{
			promise: Promise<void>;
			resolve: () => void;
			reject: (error: unknown) => void;
		}
	>();
	const ssgReloadTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const lastSsgReloadSignatures = new Map<string, string>();
	const pendingEndpointReloads = new Map<
		string,
		{
			promise: Promise<void>;
			resolve: () => void;
			reject: (error: unknown) => void;
		}
	>();
	const endpointReloadTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const lastEndpointReloadSignatures = new Map<string, string>();
	const pendingAssetReloads = new Map<
		string,
		{
			promise: Promise<void>;
			resolve: () => void;
			reject: (error: unknown) => void;
		}
	>();
	const assetReloadTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const lastAssetReloadSignatures = new Map<string, string>();

	const scheduleRpcReload = (server: ViteDevServer): Promise<boolean> => {
		if (rpcReloadTimer) {
			clearTimeout(rpcReloadTimer);
		}

		if (!pendingRpcReload) {
			let resolvePending!: (value: boolean) => void;
			let rejectPending!: (error: unknown) => void;
			const promise = new Promise<boolean>((resolve, reject) => {
				resolvePending = resolve;
				rejectPending = reject;
			});

			pendingRpcReload = {
				promise,
				resolve: resolvePending,
				reject: rejectPending,
			};
		}

		rpcReloadTimer = setTimeout(() => {
			const currentReload = pendingRpcReload;
			pendingRpcReload = null;
			rpcReloadTimer = null;

			void enqueue(async () => {
				await refreshConfig();
				const currentRpcFile = rpcFile && existsSync(rpcFile) ? rpcFile : null;
				const rpcReloadSignature =
					config.rpc === false
						? "rpc:disabled"
						: currentRpcFile
							? `${resolve(currentRpcFile)}:${(await stat(currentRpcFile)).mtimeMs}:${(await stat(currentRpcFile)).size}`
							: "rpc:missing";

				if (lastRpcReloadSignature === rpcReloadSignature) {
					currentReload?.resolve(lastRpcReloadResult);
					return;
				}

				lastRpcReloadSignature = rpcReloadSignature;
				const ok =
					config.rpc === false
						? false
						: await initializeRpc(projectDir, config, debug);
				lastRpcReloadResult = ok;

				if (ok) {
					sendCustomEvent(server, "defuss:rpc-reloaded");
				}
				currentReload?.resolve(ok);
			})
				.catch((error) => {
					currentReload?.reject(error);
				});
		}, 40);

		return pendingRpcReload.promise;
	};

	const scheduleSsgReload = (
		server: ViteDevServer,
		file: string,
		kind: Extract<DevChangeKind, "page" | "component" | "dependency">,
	): Promise<void> => {
		const absoluteFile = resolve(file);
		const reloadKey = `${kind}:${absoluteFile}`;
		const existingTimer = ssgReloadTimers.get(reloadKey);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		let pendingReload = pendingSsgReloads.get(reloadKey);
		if (!pendingReload) {
			let resolvePending!: () => void;
			let rejectPending!: (error: unknown) => void;
			const promise = new Promise<void>((resolve, reject) => {
				resolvePending = resolve;
				rejectPending = reject;
			});

			pendingReload = {
				promise,
				resolve: resolvePending,
				reject: rejectPending,
			};
			pendingSsgReloads.set(reloadKey, pendingReload);
		}

		ssgReloadTimers.set(
			reloadKey,
			setTimeout(() => {
				ssgReloadTimers.delete(reloadKey);
				const currentReload = pendingSsgReloads.get(reloadKey);
				pendingSsgReloads.delete(reloadKey);

				void enqueue(async () => {
					const reloadSignature = existsSync(absoluteFile)
						? `${absoluteFile}:${(await stat(absoluteFile)).mtimeMs}:${(await stat(absoluteFile)).size}`
						: `${absoluteFile}:missing`;

					if (
						lastSsgReloadSignatures.get(reloadKey) === reloadSignature
					) {
						currentReload?.resolve();
						return;
					}

					lastSsgReloadSignatures.set(reloadKey, reloadSignature);
				})
					.then(() => {
						sendCustomEvent(server, "defuss:ssg-reload", {
							path:
								kind === "page" && isHtmlLikeFile(absoluteFile)
									? filePathToRoute(absoluteFile, config, projectDir)
									: undefined,
							kind,
							componentSrc:
								kind === "component"
									? filePathToComponentPublicPath(
										absoluteFile,
										projectDir,
										config.components,
									)
									: undefined,
						});
						currentReload?.resolve();
					})
					.catch((error) => {
						currentReload?.reject(error);
					});
			}, 40),
		);

		return pendingReload.promise;
	};

	const scheduleEndpointReload = (
		server: ViteDevServer,
		file: string,
	): Promise<void> => {
		const absoluteFile = resolve(file);
		const existingTimer = endpointReloadTimers.get(absoluteFile);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		let pendingReload = pendingEndpointReloads.get(absoluteFile);
		if (!pendingReload) {
			let resolvePending!: () => void;
			let rejectPending!: (error: unknown) => void;
			const promise = new Promise<void>((resolve, reject) => {
				resolvePending = resolve;
				rejectPending = reject;
			});

			pendingReload = {
				promise,
				resolve: resolvePending,
				reject: rejectPending,
			};
			pendingEndpointReloads.set(absoluteFile, pendingReload);
		}

		endpointReloadTimers.set(
			absoluteFile,
			setTimeout(() => {
				endpointReloadTimers.delete(absoluteFile);
				const currentReload = pendingEndpointReloads.get(absoluteFile);
				pendingEndpointReloads.delete(absoluteFile);

				void enqueue(async () => {
					const endpointSignature = existsSync(absoluteFile)
						? `${absoluteFile}:${(await stat(absoluteFile)).mtimeMs}:${(await stat(absoluteFile)).size}`
						: `${absoluteFile}:missing`;

					if (
						lastEndpointReloadSignatures.get(absoluteFile) === endpointSignature
					) {
						currentReload?.resolve();
						return;
					}

					lastEndpointReloadSignatures.set(absoluteFile, endpointSignature);
					await refreshConfig();
					await rebuildOutput(existsSync(absoluteFile) ? absoluteFile : undefined);
				})
					.then(() => {
						sendCustomEvent(server, "defuss:ssg-reload", {
							kind: "endpoint",
						});
						currentReload?.resolve();
					})
					.catch((error) => {
						currentReload?.reject(error);
					});
			}, 40),
		);

		return pendingReload.promise;
	};

	const scheduleAssetReload = (
		server: ViteDevServer,
		file: string,
	): Promise<void> => {
		const absoluteFile = resolve(file);
		const existingTimer = assetReloadTimers.get(absoluteFile);
		if (existingTimer) {
			clearTimeout(existingTimer);
		}

		let pendingReload = pendingAssetReloads.get(absoluteFile);
		if (!pendingReload) {
			let resolvePending!: () => void;
			let rejectPending!: (error: unknown) => void;
			const promise = new Promise<void>((resolve, reject) => {
				resolvePending = resolve;
				rejectPending = reject;
			});

			pendingReload = {
				promise,
				resolve: resolvePending,
				reject: rejectPending,
			};
			pendingAssetReloads.set(absoluteFile, pendingReload);
		}

		assetReloadTimers.set(
			absoluteFile,
			setTimeout(() => {
				assetReloadTimers.delete(absoluteFile);
				const currentReload = pendingAssetReloads.get(absoluteFile);
				pendingAssetReloads.delete(absoluteFile);

				void enqueue(async () => {
					const assetSignature = existsSync(absoluteFile)
						? `${absoluteFile}:${(await stat(absoluteFile)).mtimeMs}:${(await stat(absoluteFile)).size}`
						: `${absoluteFile}:missing`;

					if (lastAssetReloadSignatures.get(absoluteFile) === assetSignature) {
						currentReload?.resolve();
						return;
					}

					lastAssetReloadSignatures.set(absoluteFile, assetSignature);
					await rebuildOutput(absoluteFile);
				})
					.then(() => {
						sendCustomEvent(server, "defuss:ssg-reload", {
							kind: "asset",
							assetExt: extname(absoluteFile).toLowerCase() || undefined,
						});
						currentReload?.resolve();
					})
					.catch((error) => {
						currentReload?.reject(error);
					});
			}, 40),
		);

		return pendingReload.promise;
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
			const relativePagePath = relative(join(projectDir, config.pages), sourceFile)
				.replace(/\\/g, "/");
			const relativeOutputHtmlFilePath = relativePagePath.replace(
				/\.(mdx|md|html)$/,
				".html",
			);

			// Apply auto-hydration: wrap defuss components with hydration wrappers + scripts
			const componentsDir = join(projectDir, config.components);
			vdom = applyAutoHydrate(
				vdom,
				componentsDir,
				config.components,
				relativeOutputHtmlFilePath,
			);

			const el = renderSync(vdom, document.documentElement, { browserGlobals }) as any;
			let html = renderToString(el);

			// Inject our HMR client before Vite transforms the HTML so the
			// virtual module import is rewritten into a browser-loadable URL.
			html = html.replace(
				"</head>",
				`<script type="module">import "${HMR_CLIENT_MODULE_ID}";</script></head>`,
			);

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

		const componentRoutePrefix = `/${config.components}/`;

		// Handle runtime.js - served from the package
		if (pathname === `/${config.components}/runtime.js`) {
			const runtimePath = resolveRuntimeHelperFile();
			if (!runtimePath) {
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
		const relativeComponentPath = pathname.slice(componentRoutePrefix.length);
		const isBuiltComponentAsset =
			relativeComponentPath.startsWith("chunks/") ||
			/^chunk-|^client-/.test(relativeComponentPath);

		if (isBuiltComponentAsset) {
			return false;
		}

		const componentBase = relativeComponentPath.replace(
			extname(relativeComponentPath),
			"",
		);
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
			res.setHeader("Cache-Control", "no-store");
			res.statusCode = 404;
			res.end();
			return true;
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
		resolveId(id) {
			if (id === HMR_CLIENT_MODULE_ID) {
				return HMR_CLIENT_RESOLVED_ID;
			}

			return null;
		},
		async load(id) {
			if (id !== HMR_CLIENT_RESOLVED_ID) {
				return null;
			}

			return HMR_CLIENT_CODE;
		},
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
					await scheduleRpcReload(server);
					return;
				}

				if (kind === "endpoint") {
					await scheduleEndpointReload(server, file);
					return;
				}

				if (
					kind === "page" ||
					kind === "component" ||
					kind === "dependency"
				) {
					await scheduleSsgReload(server, file, kind);
					return;
				}

				if (kind === "asset") {
					await scheduleAssetReload(server, file);
					return;
				}
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
		async hotUpdate(ctx) {
			const kind = classifyChangedFile(ctx.file, projectDir, config, rpcFile);
			if (kind === "other") {
				return;
			}

			if (kind === "config") {
				await ctx.server.restart();
				return [];
			}

			if (kind === "rpc") {
				await scheduleRpcReload(ctx.server);
				return [];
			}

			if (kind === "endpoint") {
				await scheduleEndpointReload(ctx.server, ctx.file);
				return [];
			}

			if (
				kind === "page" ||
				kind === "component" ||
				kind === "dependency"
			) {
				if (ctx.type === "update") {
					await ctx.read();
				}

				invalidateChangedFile(ctx.server, ctx.file, ctx.timestamp);
				await scheduleSsgReload(ctx.server, ctx.file, kind);
				return [];
			}

			if (kind === "asset") {
				await scheduleAssetReload(ctx.server, ctx.file);
				return [];
			}

			if (ctx.type === "update") {
				await ctx.read();
			}

			invalidateChangedFile(ctx.server, ctx.file, ctx.timestamp);

			return [];
		},
	};

	return [plugin];
}
