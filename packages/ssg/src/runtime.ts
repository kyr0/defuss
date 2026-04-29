import { $ } from "defuss";
import { hydrate } from "defuss/client"; // CSR package with hydration support

export const LiveReloadUrl = `${document.location.origin
	.replace(/https/, "wss")
	.replace(/http/, "ws")}/livereload`;

export const setupLiveReload = () => {
	// Close any previous WebSocket (e.g. from a prior cache-busted import)
	const prev = (window as any).__defuss_lr_ws as WebSocket | undefined;
	if (prev) {
		prev.onclose = null; // prevent auto-reconnect of the old socket
		prev.close();
	}

	console.log(`[live-reload] trying to (re-)connect to: ${LiveReloadUrl}...`);
	const liveReloadSocket = new WebSocket(LiveReloadUrl);
	(window as any).__defuss_lr_ws = liveReloadSocket;

	liveReloadSocket.onmessage = (event) => {
		console.log("[live-reload] message received", event);
		const eventData = JSON.parse(event.data);
		if (eventData.command === "reload") {
			const path = eventData.path || "/";

			const currentNorm = normalisePath(location.pathname);
			const eventNorm = normalisePath(path);
			const pathMatch = currentNorm === eventNorm;
			console.log(
				`[live-reload] path=${path}, currentNorm=${currentNorm}, eventNorm=${eventNorm}, pathMatch=${pathMatch}`,
			);
			if (!eventData.path || pathMatch) {
				// Clear prefetch cache and bust browser HTTP cache so we get
				// fresh rebuilt content after the server-side rebuild.
				console.log(
					"[live-reload] Clearing pageCache and triggering navigateTo with cache bust",
				);
				pageCache.clear();
				bustCache = true;
				navigateTo(location.pathname, true);
			} else {
				console.log("[live-reload] Path mismatch, skipping reload");
			}
		}
	};
	liveReloadSocket.onclose = () => {
		// Only reconnect if this is still the active socket
		if ((window as any).__defuss_lr_ws === liveReloadSocket) {
			setTimeout(setupLiveReload, 5000);
		}
	};
};

// -- Client-side navigation with prefetch ------------------------------

/** Cache of prefetched HTML pages (url → html string) */
const pageCache = new Map<string, string>();

/** Set of URLs currently being fetched (dedup in-flight requests) */
const fetching = new Set<string>();

/** When true, the next prefetch bypasses the browser HTTP cache (set by live-reload) */
let bustCache = false;

/** Normalise a pathname so /foo and /foo/ and /index.html all compare equally */
const normalisePath = (path: string): string => {
	let p = path.split("#")[0].split("?")[0]; // strip hash & query
	if (p.endsWith("/")) p += "index.html";
	if (!p.includes(".")) p += ".html"; // /tos → /tos.html
	return p;
};

/** Check if a URL is an internal same-origin link worth prefetching */
const isInternalLink = (anchor: HTMLAnchorElement): boolean => {
	if (!anchor.href) return false;
	try {
		const url = new URL(anchor.href, location.origin);
		if (url.origin !== location.origin) return false;
		// skip anchors, javascript:, mailto: etc.
		if (anchor.getAttribute("href")?.startsWith("#")) return false;
		if (url.protocol !== "http:" && url.protocol !== "https:") return false;
		// skip if target opens a new window
		if (anchor.target === "_blank") return false;
		// skip download links
		if (anchor.hasAttribute("download")) return false;
		// skip links explicitly opting out
		if (anchor.dataset.noNav !== undefined) return false;
		return true;
	} catch {
		return false;
	}
};

/** Prefetch a URL and store in cache */
const prefetch = async (url: string): Promise<void> => {
	const key = normalisePath(url);
	if (pageCache.has(key) || fetching.has(key)) {
		console.log(
			`[prefetch] SKIP url=${key} cached=${pageCache.has(key)} fetching=${fetching.has(key)}`,
		);
		return;
	}
	fetching.add(key);
	try {
		const fetchOpts: RequestInit = { credentials: "same-origin" };
		if (bustCache) {
			fetchOpts.cache = "reload";
			bustCache = false;
		}
		console.log(
			`[prefetch] fetching url=${key} cache=${fetchOpts.cache || "default"}`,
		);
		const res = await fetch(key, fetchOpts);
		if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
			const text = await res.text();
			pageCache.set(key, text);
			console.log(`[prefetch] cached url=${key} length=${text.length}`);
		} else {
			console.log(
				`[prefetch] not cached: status=${res.status} content-type=${res.headers.get("content-type")}`,
			);
		}
	} catch (err) {
		console.error("[prefetch] error:", err);
	} finally {
		fetching.delete(key);
	}
};

/**
 * Trigger hydration for all wrappers in the given container.
 * Reads hydration metadata from data-* attributes and performs hydration programmatically.
 */
const triggerHydration = async (container: Element): Promise<void> => {
	const wrappers = container.querySelectorAll('[data-hydrate="true"]');
	console.log(
		`[triggerHydration] Found ${wrappers.length} hydration wrapper(s)`,
	);

	const promises: Promise<void>[] = [];

	for (const wrapper of wrappers) {
		const id = wrapper.getAttribute("data-hydrate-id");
		const src = wrapper.getAttribute("data-hydrate-src");
		const propsStr = wrapper.getAttribute("data-hydrate-props");
		const runtimeUrl = wrapper.getAttribute("data-hydrate-runtime");

		if (!id || !src || !propsStr || !runtimeUrl) {
			console.warn(
				`[triggerHydration] Wrapper missing metadata: id=${id} src=${src}`,
			);
			continue;
		}

		const promise = (async () => {
			try {
				const cacheBust = `?v=${Date.now()}`;
				console.log(
					`[hydrate:${id}] Starting hydration for ${src}${cacheBust}`,
				);

				const { hydrate: doHydrate } = await import(
					/* @vite-ignore */ `${runtimeUrl}${cacheBust}`
				);
				const exports = await import(
					/* @vite-ignore */ `${src}${cacheBust}`
				);

				if (!exports || typeof exports.default !== "function") {
					console.error(
						`[hydrate:${id}] No default export in ${src}`,
					);
					return;
				}

				const Component = exports.default;
				const props = JSON.parse(propsStr);

				console.log(
					`[hydrate:${id}] Rendering component ${Component.name || "(anon)"} with props:`,
					props,
				);

				let roots = Component(props);
				if (!Array.isArray(roots)) {
					roots = [roots];
				}

				// Filter out script nodes and comments
				const hydratableNodes = Array.from(wrapper.childNodes).filter(
					(node) => {
						if (node instanceof HTMLScriptElement) return false;
						if (node.nodeType === Node.COMMENT_NODE) return false;
						if (node.nodeType === Node.TEXT_NODE) {
							return (node.textContent ?? "").trim().length !== 0;
						}
						return true;
					},
				);

				console.log(
					`[hydrate:${id}] Hydrating ${hydratableNodes.length} node(s)`,
				);

				doHydrate(roots, hydratableNodes);

				// Unwrap - replace wrapper with its hydrated children
				wrapper.replaceWith(...hydratableNodes);
				console.log(`[hydrate:${id}] Hydration complete`);
			} catch (e) {
				console.error(`[hydrate:${id}] Error:`, e);
			}
		})();

		promises.push(promise);
	}

	await Promise.all(promises);
};

/** Extract <head> metadata (title, meta tags, stylesheets) from HTML string */
const updateHead = (doc: Document): void => {
	// Update title
	const newTitle = doc.querySelector("title");
	if (newTitle) document.title = newTitle.textContent || "";

	// Update meta tags (viewport, description, etc.)
	const newMetas = doc.querySelectorAll("meta");
	for (const meta of newMetas) {
		const name = meta.getAttribute("name") || meta.getAttribute("property");
		if (!name) continue;
		const existing = document.querySelector(
			`meta[name="${name}"], meta[property="${name}"]`,
		);
		if (existing) {
			existing.setAttribute("content", meta.getAttribute("content") || "");
		} else {
			document.head.appendChild(meta.cloneNode(true));
		}
	}

	// Inject any new stylesheets not already present
	const newLinks = doc.querySelectorAll('link[rel="stylesheet"]');
	for (const link of newLinks) {
		const href = link.getAttribute("href");
		if (href && !document.querySelector(`link[href="${href}"]`)) {
			document.head.appendChild(link.cloneNode(true));
		}
	}
};

/**
 * Navigate to a URL using client-side DOM patching.
 * Fetches the target page HTML, swaps <body> content, re-runs hydration scripts,
 * and updates browser history - no full page reload needed.
 * @param url The target pathname
 * @param replace If true, uses replaceState instead of pushState (for live-reload)
 */
let navigating = false;
export const navigateTo = async (
	url: string,
	replace = false,
): Promise<void> => {
	// Prevent concurrent navigations (e.g. multiple WebSocket messages)
	if (navigating) return;
	navigating = true;

	try {
		const key = normalisePath(url);
		console.log(
			`[navigateTo] url=${url} key=${key} replace=${replace} cached=${pageCache.has(key)}`,
		);

		// Fetch if not cached
		if (!pageCache.has(key)) {
			await prefetch(url);
		}

		const html = pageCache.get(key);
		if (!html) {
			console.log(
				"[navigateTo] No HTML available, falling back to hard navigation",
			);
			// Fallback to hard navigation if fetch failed
			location.href = url;
			return;
		}

		console.log(`[navigateTo] HTML length=${html.length}`);

		// Keep cache for instant back/forward; schedule a background refresh
		// so the *next* visit gets fresh content without blocking this one.
		setTimeout(() => prefetch(url), 500);

		// Parse fetched HTML
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, "text/html");
		const newBody = doc.body;

		if (!newBody) {
			console.log("[navigateTo] Parsed document has no body, hard navigating");
			location.href = url;
			return;
		}

		// Save scroll position for current page (for back/forward)
		const scrollY = window.scrollY;
		history.replaceState({ ...history.state, scrollY }, "");

		// Update <head> (title, meta, styles)
		updateHead(doc);

		// Morph <body> content in place
		const bodyHtml = newBody.innerHTML;
		console.log(
			`[navigateTo] Morphing body content (new length=${bodyHtml.length})`,
		);
		await $(document.body).update(bodyHtml);

		// Trigger hydration for all wrappers in the new body
		await triggerHydration(document.body);

		// Update history
		if (replace) {
			history.replaceState({ navigated: true }, "", url);
		} else {
			history.pushState({ navigated: true }, "", url);
		}

		// Scroll to top for new pages, or to anchor if present
		const hash = url.split("#")[1];
		if (hash) {
			const target = document.getElementById(hash);
			if (target) {
				target.scrollIntoView();
			}
		} else {
			window.scrollTo(0, 0);
		}
	} finally {
		navigating = false;
	}
};

/** Set up click interception for internal links */
const setupClientNav = (): void => {
	// Delegate click events on the document for all <a> tags
	document.addEventListener("click", (e: MouseEvent) => {
		// Don't intercept modified clicks (ctrl+click, cmd+click etc.)
		if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		if (e.button !== 0) return; // only left click

		const anchor = (e.target as Element)?.closest?.(
			"a",
		) as HTMLAnchorElement | null;
		if (!anchor || !isInternalLink(anchor)) return;

		e.preventDefault();

		// Don't navigate to the same page (but always prevent the default hard nav)
		const targetPath = normalisePath(new URL(anchor.href).pathname);
		const currentPath = normalisePath(location.pathname);
		if (targetPath === currentPath && !anchor.hash) return;

		navigateTo(anchor.getAttribute("href")!);
	});

	// Handle back/forward navigation
	window.addEventListener("popstate", (e: PopStateEvent) => {
		navigateTo(location.pathname, true).then(() => {
			// Restore scroll position if available
			if (e.state?.scrollY != null) {
				window.scrollTo(0, e.state.scrollY);
			}
		});
	});
};

/** Observe visible links and prefetch them; also prefetch on hover/touch */
const setupPrefetch = (): void => {
	const observed = new WeakSet<Element>();

	// -- Hover / touch prefetch (fastest: ~200ms before click) ----------
	const onHoverIn = (e: Event) => {
		const anchor = (e.target as Element)?.closest?.(
			"a",
		) as HTMLAnchorElement | null;
		if (!anchor || !isInternalLink(anchor)) return;
		prefetch(anchor.getAttribute("href")!);
	};
	document.addEventListener("mouseover", onHoverIn, { passive: true });
	document.addEventListener("touchstart", onHoverIn, { passive: true });

	// -- IntersectionObserver prefetch (visible links, background) ------
	if (!("IntersectionObserver" in window)) return;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					const anchor = entry.target as HTMLAnchorElement;
					prefetch(anchor.getAttribute("href")!);
					observer.unobserve(anchor);
				}
			}
		},
		{ rootMargin: "200px" }, // start prefetching slightly before links scroll into view
	);

	const scan = () => {
		const links = document.querySelectorAll("a[href]");
		for (const link of links) {
			if (observed.has(link)) continue;
			if (isInternalLink(link as HTMLAnchorElement)) {
				observed.add(link);
				observer.observe(link);
			}
		}
	};

	// Initial scan
	scan();

	// Re-scan after DOM changes (e.g. after hydration / navigation)
	new MutationObserver(scan).observe(document.body, {
		childList: true,
		subtree: true,
	});
};

// -- Bootstrap ---------------------------------------------------------

// Guard: only initialise once, even when runtime.js is re-imported with a
// different cache-busting query string (each ?v=... is a new ES module identity).
if (!(window as any).__defuss_runtime_init) {
	(window as any).__defuss_runtime_init = true;

	// Set up client-side navigation and prefetch
	setupClientNav();
	setupPrefetch();
}

// Live-reload WebSocket is always (re-)initialised so the newest module
// closure is used - but setupLiveReload itself deduplicates the connection.
setupLiveReload();

export { hydrate };
