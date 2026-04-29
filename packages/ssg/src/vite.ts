import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";

import type { PluginOption, ResolvedConfig, ViteDevServer } from "vite";

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

				await enqueue(async () => {
					await rebuildOutput();
				});
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

			await enqueue(async () => {
				await rebuildOutput(ctx.file);
			});

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
