import glob from "fast-glob";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

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
import {
	createContentModulePlugin,
	hasContentModuleImporters,
	invalidateContentModule,
} from "./content-vite.js";
import {
	filePathToRoute,
	getPageSourceRootDir,
	pageSourceFileToOutputPath,
	resolvePageSourceFileForPath,
	resolveSsgPaths,
} from "./path.js";
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

const HMR_CLIENT_MODULE_ID = "virtual:defuss-ssg/hmr-client";
const HMR_CLIENT_RESOLVED_ID = "\0virtual:defuss-ssg/hmr-client";
const HMR_CLIENT_CODE = `
import { $ } from "defuss";

if (import.meta.hot) {
	const noticeId = "__defuss-ssg-dev-connection-notice";
	const noticeStyleId = "__defuss-ssg-dev-connection-notice-style";
	const noticeText = "Dev server connection lost. Reconnecting...";

	const ensureNoticeStyles = () => {
		if (document.getElementById(noticeStyleId)) {
			return;
		}

		const style = document.createElement("style");
		style.id = noticeStyleId;
		style.textContent = [
			"#" + noticeId + " {",
			"\tposition: fixed;",
			"\ttop: 1rem;",
			"\tright: 1rem;",
			"\tz-index: 2147483647;",
			"\tmax-width: min(24rem, calc(100vw - 2rem));",
			"\tpadding: 0.75rem 1rem;",
			"\tborder-radius: 0.75rem;",
			"\tbackground: #b91c1c;",
			"\tcolor: #ffffff;",
			"\tfont: 600 0.875rem/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;",
			"\tbox-shadow: 0 12px 32px rgba(127, 29, 29, 0.35);",
			"\tpointer-events: none;",
			"\topacity: 0;",
			"\ttransform: translateY(-0.5rem);",
			"\ttransition: opacity 140ms ease, transform 140ms ease;",
			"}",
			"#" + noticeId + "[data-visible='true'] {",
			"\topacity: 1;",
			"\ttransform: translateY(0);",
			"}",
		].join("\\n");
		(document.head || document.documentElement).append(style);
	};

	const getNotice = () => {
		let notice = document.getElementById(noticeId);
		if (notice) {
			return notice;
		}

		ensureNoticeStyles();

		notice = document.createElement("div");
		notice.id = noticeId;
		notice.setAttribute("role", "status");
		notice.setAttribute("aria-live", "polite");
		notice.textContent = noticeText;
		(document.body || document.documentElement).append(notice);
		return notice;
	};

	const showDisconnectNotice = () => {
		const notice = getNotice();
		notice.textContent = noticeText;
		notice.setAttribute("data-visible", "true");
	};

	const hideDisconnectNotice = () => {
		const notice = document.getElementById(noticeId);
		if (!notice) {
			return;
		}

		notice.remove();
	};

	const getConnectionState = () => {
		if (window.__defuss_ssg_dev_connection_state) {
			return window.__defuss_ssg_dev_connection_state;
		}

		window.__defuss_ssg_dev_connection_state = {
			fallbackSocket: null,
			fallbackSocketPingId: 0,
			reconnectPromise: null,
			reconnectUrl: "",
		};

		return window.__defuss_ssg_dev_connection_state;
	};

	const wait = (ms) => new Promise((resolve) => {
		window.setTimeout(resolve, ms);
	});

	const closeFallbackSocket = () => {
		const state = getConnectionState();

		if (state.fallbackSocketPingId) {
			window.clearInterval(state.fallbackSocketPingId);
			state.fallbackSocketPingId = 0;
		}

		if (!state.fallbackSocket) {
			return;
		}

		const socket = state.fallbackSocket;
		state.fallbackSocket = null;

		try {
			socket.close();
		} catch {
			// Ignore close races during reconnect.
		}
	};

	const waitForSuccessfulPing = async (socketUrl) => {
		const pingUrl = new URL(socketUrl);
		pingUrl.search = "";

		const ping = async () => {
			try {
				const socket = new WebSocket(pingUrl.href, "vite-ping");
				return await new Promise((resolve) => {
					const onOpen = () => {
						cleanup();
						resolve(true);
					};

					const onError = () => {
						cleanup();
						resolve(false);
					};

					const cleanup = () => {
						socket.removeEventListener("open", onOpen);
						socket.removeEventListener("error", onError);
						try {
							socket.close();
						} catch {
							// Ignore close races while probing for restart.
						}
					};

					socket.addEventListener("open", onOpen, { once: true });
					socket.addEventListener("error", onError, { once: true });
				});
			} catch {
				return false;
			}
		};

		while (!(await ping())) {
			await wait(1000);
		}
	};

	const syncElementAttributes = (currentEl, nextEl) => {
		const nextAttrNames = new Set(nextEl.getAttributeNames());

		for (const attrName of currentEl.getAttributeNames()) {
			if (!nextAttrNames.has(attrName)) {
				currentEl.removeAttribute(attrName);
			}
		}

		for (const attrName of nextAttrNames) {
			const nextValue = nextEl.getAttribute(attrName);
			if (nextValue === null) {
				currentEl.removeAttribute(attrName);
				continue;
			}

			if (currentEl.getAttribute(attrName) !== nextValue) {
				currentEl.setAttribute(attrName, nextValue);
			}
		}
	};

	const updateHead = (doc) => {
		const newTitle = doc.querySelector("title");
		if (newTitle) {
			document.title = newTitle.textContent || "";
		}

		const newMetas = doc.querySelectorAll("meta");
		for (const meta of newMetas) {
			const name = meta.getAttribute("name") || meta.getAttribute("property");
			if (!name) {
				continue;
			}

			const existing = document.querySelector(
				'meta[name="' + name + '"], meta[property="' + name + '"]',
			);
			if (existing) {
				existing.setAttribute("content", meta.getAttribute("content") || "");
			} else {
				document.head.appendChild(meta.cloneNode(true));
			}
		}

		const newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
		for (const link of newLinks) {
			const href = link.getAttribute("href");
			if (href && !document.querySelector('link[href="' + href + '"]')) {
				document.head.appendChild(link.cloneNode(true));
			}
		}
	};

	const hasMeaningfulChildNodes = (element) =>
		Array.from(element.childNodes).some((node) => {
			if (node.nodeType === Node.TEXT_NODE) {
				return Boolean(node.textContent && node.textContent.trim());
			}

			return true;
		});

	const preserveClientRenderedRoots = (nextBody) => {
		const nextRoots = nextBody.querySelectorAll("[id]");

		for (const nextRoot of nextRoots) {
			const id = nextRoot.getAttribute("id");
			if (!id || hasMeaningfulChildNodes(nextRoot)) {
				continue;
			}

			const currentRoot = document.getElementById(id);
			if (!currentRoot || currentRoot.tagName !== nextRoot.tagName) {
				continue;
			}

			if (!hasMeaningfulChildNodes(currentRoot)) {
				continue;
			}

			nextRoot.innerHTML = currentRoot.innerHTML;
		}
	};

	const softRefreshWithoutRuntime = async () => {
		const requestUrl = new URL(window.location.href);
		requestUrl.searchParams.set("__defuss_ssg_hmr", String(Date.now()));

		const response = await fetch(requestUrl.toString(), {
			cache: "no-store",
			credentials: "same-origin",
		});
		const contentType = response.headers.get("content-type") || "";

		if (!response.ok || !contentType.includes("text/html")) {
			window.location.reload();
			return;
		}

		const html = await response.text();
		const doc = new DOMParser().parseFromString(html, "text/html");
		if (!doc.documentElement || !doc.body) {
			window.location.reload();
			return;
		}

		const scrollX = window.scrollX;
		const scrollY = window.scrollY;

		syncElementAttributes(document.documentElement, doc.documentElement);
		syncElementAttributes(document.body, doc.body);
		updateHead(doc);
		preserveClientRenderedRoots(doc.body);
		await $(document.body).update(doc.body.innerHTML);
		window.scrollTo(scrollX, scrollY);
	};

	const softRefreshCurrentPage = async (kind = "other") => {
		const runtime = window.__defuss_ssg_runtime;

		if (!runtime?.navigateTo) {
			await softRefreshWithoutRuntime();
			return;
		}

		runtime.pageCache?.clear();
		runtime.bustCache = true;
		await runtime.navigateTo(window.location.pathname, true, {
			preserveHydratedState: true,
			kind,
		});
	};

	const handleFallbackPayload = async (payload) => {
		switch (payload?.type) {
			case "custom":
				if (payload.event === "defuss:ssg-reload") {
					await onReload(payload.data);
				}
				return;
			case "full-reload":
				await softRefreshCurrentPage("other");
				return;
			case "error":
				console.error("[vite]", payload.err);
				return;
			default:
				return;
		}
	};

	const openFallbackSocket = async (socketUrl) => {
		while (true) {
			try {
				const socket = await new Promise((resolve, reject) => {
					const nextSocket = new WebSocket(socketUrl, "vite-hmr");
					let settled = false;

					const cleanup = () => {
						nextSocket.removeEventListener("open", onOpen);
						nextSocket.removeEventListener("error", onError);
						nextSocket.removeEventListener("close", onCloseBeforeOpen);
					};

					const onOpen = () => {
						if (settled) {
							return;
						}

						settled = true;
						cleanup();
						resolve(nextSocket);
					};

					const onError = () => {
						if (settled) {
							return;
						}

						settled = true;
						cleanup();

						try {
							nextSocket.close();
						} catch {
							// Ignore socket teardown races while probing for restart.
						}

						reject(new Error("fallback socket connection failed"));
					};

					const onCloseBeforeOpen = () => {
						if (settled) {
							return;
						}

						settled = true;
						cleanup();
						reject(new Error("fallback socket closed before opening"));
					};

					nextSocket.addEventListener("open", onOpen, { once: true });
					nextSocket.addEventListener("error", onError, { once: true });
					nextSocket.addEventListener("close", onCloseBeforeOpen, {
						once: true,
					});
				});

				const state = getConnectionState();
				state.fallbackSocket = socket;
				state.fallbackSocketPingId = window.setInterval(() => {
					if (socket.readyState === socket.OPEN) {
						socket.send(JSON.stringify({ type: "ping" }));
					}
				}, 30000);

				socket.addEventListener("message", (event) => {
					void (async () => {
						try {
							await handleFallbackPayload(JSON.parse(event.data));
						} catch (error) {
							console.error(
								"[defuss-ssg] failed to process fallback HMR payload",
								error,
							);
						}
					})();
				});

				socket.addEventListener("error", () => {
					try {
						socket.close();
					} catch {
						// Ignore socket teardown races during reconnect.
					}
				});

				socket.addEventListener(
					"close",
					() => {
						const state = getConnectionState();

						if (state.fallbackSocket !== socket) {
							return;
						}

						if (state.fallbackSocketPingId) {
							window.clearInterval(state.fallbackSocketPingId);
							state.fallbackSocketPingId = 0;
						}

						state.fallbackSocket = null;
						showDisconnectNotice();

						if (state.reconnectUrl) {
							void startReconnect(state.reconnectUrl);
						}
					},
					{ once: true },
				);

				return socket;
			} catch {
				await wait(1000);
			}
		}
	};

	const startReconnect = (socketUrl) => {
		const state = getConnectionState();

		if (!socketUrl) {
			return Promise.resolve();
		}

		state.reconnectUrl = socketUrl;

		if (state.reconnectPromise) {
			return state.reconnectPromise;
		}

		state.reconnectPromise = (async () => {
			closeFallbackSocket();
			await waitForSuccessfulPing(socketUrl);
			window.location.reload();
		})().finally(() => {
			state.reconnectPromise = null;
		});

		return state.reconnectPromise;
	};

	const suppressViteDisconnectReload = () => {
		window.dispatchEvent(new Event("beforeunload"));
	};

	const existingHandlers = import.meta.hot.data.defussSsgConnectionHandlers;
	if (existingHandlers) {
		import.meta.hot.off("vite:ws:disconnect", existingHandlers.onDisconnect);
		import.meta.hot.off("vite:ws:connect", existingHandlers.onConnect);
		import.meta.hot.off("defuss:ssg-reload", existingHandlers.onReload);
	}

	const onDisconnect = (data) => {
		showDisconnectNotice();

		const state = getConnectionState();
		if (data?.webSocket?.url) {
			state.reconnectUrl = data.webSocket.url;
		}
		closeFallbackSocket();
	};

	const onConnect = (data) => {
		const state = getConnectionState();

		if (data?.webSocket?.url) {
			state.reconnectUrl = data.webSocket.url;
		}

		if (!state.reconnectPromise) {
			hideDisconnectNotice();
		}
	};

	const onReload = async (data) => {
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
			try {
				await softRefreshCurrentPage(data?.kind || "other");
			} catch (error) {
				console.error("[defuss-ssg] failed to soft refresh current page", error);
				window.location.reload();
			}
		}
	};

	import.meta.hot.on("vite:ws:disconnect", onDisconnect);
	import.meta.hot.on("vite:ws:connect", onConnect);
	import.meta.hot.on("defuss:ssg-reload", onReload);
	import.meta.hot.data.defussSsgConnectionHandlers = {
		onConnect,
		onDisconnect,
		onReload,
	};
}
`.trim();

const injectHmrClientModule = (html: string): string => {
	if (html.includes(HMR_CLIENT_MODULE_ID)) {
		return html;
	}

	const importTag = `<script type="module">import "${HMR_CLIENT_MODULE_ID}";</script>`;

	if (html.includes("</head>")) {
		return html.replace("</head>", `${importTag}</head>`);
	}

	return `${importTag}${html}`;
};

const injectStylesheetLinks = (html: string, hrefs: string[]): string => {
	const missingHrefs = hrefs.filter((href) => !html.includes(`href="${href}"`));
	if (missingHrefs.length === 0) {
		return html;
	}

	const linkTags = missingHrefs
		.map((href) => `<link rel="stylesheet" href="${href}">`)
		.join("");

	if (html.includes("</head>")) {
		return html.replace("</head>", `${linkTags}</head>`);
	}

	return `${linkTags}${html}`;
};

const getComponentStylesheetHrefs = async (
	componentsOutputDir: string,
	componentsPublicDir: string,
): Promise<string[]> => {
	if (!existsSync(componentsOutputDir)) {
		return [];
	}

	const cssFiles = await glob.async(join(componentsOutputDir, "**/*.css"));
	return cssFiles
		.sort((left, right) => left.localeCompare(right))
		.map((cssFile) =>
			`/${normalizePath(join(componentsPublicDir, relative(componentsOutputDir, cssFile)))}`,
		);
};

const isHtmlLikeFile = (filePath: string): boolean => {
	const extension = extname(filePath);
	return extension === "" || extension === ".md" || extension === ".mdx" || extension === ".html";
};

const normalizePath = (filePath: string): string => filePath.replace(/\\/g, "/");

const isPathInOrUnder = (filePath: string, dirPath: string): boolean => {
	const normalizedFilePath = normalizePath(filePath).replace(/\/+$/, "");
	const normalizedDirPath = normalizePath(dirPath).replace(/\/+$/, "");

	return (
		normalizedFilePath === normalizedDirPath ||
		normalizedFilePath.startsWith(`${normalizedDirPath}/`)
	);
};

const isRootIndexPageSource = (filePath: string): boolean =>
	/^index(?:\.mdx?|\.html)?$/i.test(normalizePath(filePath));

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
	const paths = resolveSsgPaths(projectDir, config);
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

	if (isPathInOrUnder(relativeFile, paths.pagesSourceDir)) {
		return isHtmlLikeFile(relativeFile) ? "page" : "endpoint";
	}

	if (!paths.hasPagesSourceDir && isRootIndexPageSource(relativeFile)) {
		return "page";
	}

	if (isPathInOrUnder(relativeFile, paths.componentsSourceDir)) {
		return "component";
	}

	if (isPathInOrUnder(relativeFile, paths.assetsSourceDir)) {
		return "asset";
	}

	if (isPathInOrUnder(relativeFile, "public")) {
		return "asset";
	}

	return "dependency";
};

const filePathToComponentPublicPath = (
	file: string,
	componentsSourceDir: string,
	componentsPublicDir: string,
): string | undefined => {
	const relativeComponentPath = relative(componentsSourceDir, file).replace(
		/\\/g,
		"/",
	);

	if (
		relativeComponentPath.startsWith("..") ||
		relativeComponentPath.length === 0
	) {
		return undefined;
	}

	return `/${join(componentsPublicDir, relativeComponentPath)
		.replace(/\\/g, "/")
		.replace(/\.t?sx?$/, ".js")}`;
};

const refreshDynamicEndpoints = async (
	projectDir: string,
	config: SsgConfig,
	debug: boolean,
): Promise<ResolvedEndpoint[]> => {
	const pagesDir = resolveSsgPaths(projectDir, config).pagesSourceDirAbsolute;
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
	let paths: ReturnType<typeof resolveSsgPaths>;
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
		paths = resolveSsgPaths(projectDir, config);
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
		reloadCurrentPage = false,
	): Promise<void> => {
		const absoluteFile = resolve(file);
		const reloadKey = `${kind}:${absoluteFile}:${reloadCurrentPage ? "current" : "target"}`;
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
					await rebuildOutput(existsSync(absoluteFile) ? absoluteFile : undefined);
				})
					.then(() => {
						const currentPaths = resolveSsgPaths(projectDir, config);
						sendCustomEvent(server, "defuss:ssg-reload", {
							path:
								!reloadCurrentPage &&
								kind === "page" &&
								isHtmlLikeFile(absoluteFile)
									? filePathToRoute(absoluteFile, config, projectDir)
									: undefined,
							kind,
							componentSrc:
								kind === "component"
									? filePathToComponentPublicPath(
										absoluteFile,
										currentPaths.componentsSourceDirAbsolute,
										currentPaths.componentsPublicDir,
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
		const pathname = requestUrl.pathname;
		const isRpcRequest =
			pathname === "/rpc" ||
			pathname === "/rpc/schema" ||
			pathname === "/rpc/upload" ||
			pathname.startsWith("/rpc/upload/");

		if (!isRpcRequest) {
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
		const currentPaths = resolveSsgPaths(projectDir, config);
		return resolvePageSourceFileForPath(
			pathname,
			getPageSourceRootDir(projectDir, currentPaths),
			currentPaths.hasPagesSourceDir,
		);
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
			const currentPaths = resolveSsgPaths(projectDir, config);
			const relativeOutputHtmlFilePath = pageSourceFileToOutputPath(
				sourceFile,
				getPageSourceRootDir(projectDir, currentPaths),
			);

			// Apply auto-hydration: wrap defuss components with hydration wrappers + scripts
			vdom = applyAutoHydrate(
				vdom,
				currentPaths.componentsSourceDirAbsolute,
				currentPaths.componentsPublicDir,
				relativeOutputHtmlFilePath,
			);

			const el = renderSync(vdom, document.documentElement, { browserGlobals }) as any;
			let html = renderToString(el);
			html = injectStylesheetLinks(
				html,
				await getComponentStylesheetHrefs(
					join(projectDir, config.output, currentPaths.componentsPublicDir),
					currentPaths.componentsPublicDir,
				),
			);

			// Inject our HMR client before Vite transforms the HTML so the
			// virtual module import is rewritten into a browser-loadable URL.
			html = injectHmrClientModule(html);

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
		const currentPaths = resolveSsgPaths(projectDir, config);
		const componentRoutePrefix = `/${currentPaths.componentsPublicDir}/`;

		if (!pathname.startsWith(componentRoutePrefix)) {
			return false;
		}

		// Handle component files: /components/foo.js -> projectDir/components/foo.tsx
		const relativeComponentPath = pathname.slice(componentRoutePrefix.length);
		const componentExtension = extname(relativeComponentPath).toLowerCase();
		const sourceExtensions = new Set([".tsx", ".ts", ".jsx", ".js"]);
		const isBuiltComponentAsset =
			relativeComponentPath === "runtime.js" ||
			relativeComponentPath.startsWith("chunks/") ||
			/^chunk-|^client-/.test(relativeComponentPath) ||
			!sourceExtensions.has(componentExtension);

		if (isBuiltComponentAsset) {
			return false;
		}

		let sourceFile: string | null = null;

		if (componentExtension !== ".js") {
			const directSourceCandidate = join(
				currentPaths.componentsSourceDirAbsolute,
				relativeComponentPath,
			);
			if (existsSync(directSourceCandidate)) {
				sourceFile = directSourceCandidate;
			}
		}

		if (!sourceFile) {
			const componentBase = relativeComponentPath.replace(
				extname(relativeComponentPath),
				"",
			);
			for (const ext of sourceExtensions) {
				const candidate = join(
					currentPaths.componentsSourceDirAbsolute,
					`${componentBase}${ext}`,
				);
				if (existsSync(candidate)) {
					sourceFile = candidate;
					break;
				}
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
			const currentPaths = resolveSsgPaths(projectDir, config);
			const html = await server.transformIndexHtml(
				requestUrl.pathname,
				injectHmrClientModule(
					injectStylesheetLinks(
						body.toString("utf8"),
						await getComponentStylesheetHrefs(
							join(projectDir, config.output, currentPaths.componentsPublicDir),
							currentPaths.componentsPublicDir,
						),
					),
				),
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
				...paths.pagesSourceDirCandidates.map((candidateDir) =>
					join(projectDir, candidateDir),
				),
				...paths.componentsSourceDirCandidates.map((candidateDir) =>
					join(projectDir, candidateDir),
				),
				...paths.assetsSourceDirCandidates.map((candidateDir) =>
					join(projectDir, candidateDir),
				),
				join(projectDir, "public"),
				join(projectDir, "config.ts"),
				join(projectDir, "config.js"),
			];
			if (!paths.hasPagesSourceDir) {
				watchedPaths.push(
					join(projectDir, "index.mdx"),
					join(projectDir, "index.md"),
					join(projectDir, "index.html"),
				);
			}
			if (rpcFile) {
				watchedPaths.push(rpcFile);
			}
			server.watcher.add([...new Set(watchedPaths)]);

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

				if (kind === "page") {
					invalidateContentModule(server, Date.now());
					await scheduleSsgReload(
						server,
						file,
						kind,
						hasContentModuleImporters(server),
					);
					return;
				}

				if (kind === "component" || kind === "dependency") {
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

			if (kind === "page") {
				if (ctx.type === "update") {
					await ctx.read();
				}

				invalidateChangedFile(ctx.server, ctx.file, ctx.timestamp);
				invalidateContentModule(ctx.server, ctx.timestamp);
				await scheduleSsgReload(
					ctx.server,
					ctx.file,
					kind,
					hasContentModuleImporters(ctx.server),
				);
				return [];
			}

			if (kind === "component" || kind === "dependency") {
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

	return [
		createContentModulePlugin({
			projectDir: () => projectDir,
			pagesDir: () => config.pages,
		}),
		plugin,
	];
}
