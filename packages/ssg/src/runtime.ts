import { $ } from "defuss";
import { hydrate } from "defuss/client"; // CSR package with hydration support

/**
 * Expose runtime functions on window for HMR client to call.
 * The HMR client module (injected by Vite) listens for custom
 * WebSocket events and triggers soft reload through these functions.
 */
export const setupLiveReload = () => {
	// No-op: HMR is now handled by the Vite HMR client module
};

// -- Client-side navigation with prefetch ------------------------------

type RuntimeWindow = Window & {
	__defuss_pageCache?: Map<string, string>;
	__defuss_fetching?: Set<string>;
	__defuss_bustCache?: boolean;
	__defuss_runtime_init?: boolean;
	__defuss_ssg_runtime?: {
		navigateTo?: typeof navigateTo;
		refreshLocalStylesheets?: typeof refreshLocalStylesheets;
		pageCache?: Map<string, string>;
		bustCache?: boolean;
	};
};

const runtimeWindow = window as RuntimeWindow;

/** Cache of prefetched HTML pages (url => html string) */
const pageCache = runtimeWindow.__defuss_pageCache ?? new Map<string, string>();

type LiveReloadKind =
	| "page"
	| "endpoint"
	| "component"
	| "asset"
	| "dependency"
	| "config"
	| "rpc"
	| "other";

type NavigateOptions = {
	preserveHydratedState?: boolean;
	preserveHydratedBoundaries?: boolean;
	kind?: LiveReloadKind;
	componentSrc?: string;
};

type HydrateBoundaryOptions = {
	fromWrapper?: boolean;
};

type HydratableComponent = (props: Record<string, any>) => any;

const isHydratableComponent = (
	value: unknown,
): value is HydratableComponent => typeof value === "function";

const pickHydrationComponent = (
	moduleExports: Record<string, unknown>,
	preferredExportName: string | null,
): HydratableComponent | null => {
	if (isHydratableComponent(moduleExports.default)) {
		return moduleExports.default;
	}

	if (
		preferredExportName &&
		isHydratableComponent(moduleExports[preferredExportName])
	) {
		return moduleExports[preferredExportName];
	}

	const functionExports = Object.entries(moduleExports).filter(
		([key, value]) => key !== "default" && isHydratableComponent(value),
	);

	if (functionExports.length === 1) {
		return functionExports[0][1] as HydratableComponent;
	}

	return null;
};

type RestorableFormControl =
	| HTMLInputElement
	| HTMLTextAreaElement
	| HTMLSelectElement;

type ElementLocator = {
	id?: string;
	name?: string;
	nameIndex?: number;
	path: number[];
	tagName: string;
	inputType?: string;
};

type ControlStateSnapshot = {
	locator: ElementLocator;
	value?: string;
	checked?: boolean;
	selectedValues?: string[];
	selectionStart?: number | null;
	selectionEnd?: number | null;
	selectionDirection?: SelectionDirection | null;
	active?: boolean;
};

type ScrollStateSnapshot = {
	locator: ElementLocator;
	scrollTop: number;
	scrollLeft: number;
};

type BoundaryStateSnapshot = {
	id: string;
	controlStates: ControlStateSnapshot[];
	scrollStates: ScrollStateSnapshot[];
};

const HYDRATION_ATTRIBUTE_NAMES = [
	"data-hydrate-id",
	"data-hydrate",
	"data-hydrate-src",
	"data-hydrate-props",
	"data-hydrate-runtime",
] as const;

/** Set of URLs currently being fetched (dedup in-flight requests) */
const fetching = runtimeWindow.__defuss_fetching ?? new Set<string>();

/** When true, the next prefetch bypasses the browser HTTP cache (set by HMR client) */
// Accessed via window.__defuss_bustCache so HMR client can modify it

/** Normalise a pathname so /foo and /foo/ and /index.html all compare equally */
const normalisePath = (path: string): string => {
	let p = path.split("#")[0].split("?")[0]; // strip hash & query
	if (p.endsWith("/")) p += "index.html";
	if (!p.includes(".")) p += ".html"; // /tos => /tos.html
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
		if ((window as any).__defuss_bustCache) {
			fetchOpts.cache = "reload";
			(window as any).__defuss_bustCache = false;
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
const copyHydrationAttributes = (
	from: Element,
	to: Element,
	markHydrated: boolean,
): void => {
	for (const attributeName of HYDRATION_ATTRIBUTE_NAMES) {
		const value = from.getAttribute(attributeName);
		if (value == null) {
			to.removeAttribute(attributeName);
			continue;
		}
		to.setAttribute(attributeName, value);
	}

	if (markHydrated) {
		to.setAttribute("data-hydrated", "true");
	} else {
		to.removeAttribute("data-hydrated");
	}
};

const isHydrationScript = (
	node: Node,
	id: string,
): node is HTMLScriptElement => {
	if (!(node instanceof HTMLScriptElement)) {
		return false;
	}

	if (node.id === id) {
		return true;
	}

	const src = node.getAttribute("src") ?? "";
	return node.type === "module" && src.includes("html-proxy");
};

const getHydratableNodes = (boundary: Element, id: string): Node[] => {
	const nodes = Array.from(boundary.childNodes).filter((node) => {
		if (node.nodeType === Node.COMMENT_NODE) return false;
		if (node.nodeType === Node.TEXT_NODE) {
			return (node.textContent ?? "").trim().length !== 0;
		}
		return true;
	});

	while (nodes.length > 0 && isHydrationScript(nodes[nodes.length - 1], id)) {
		nodes.pop();
	}

	return nodes;
};

const getHydrationRootElement = (nodes: Node[]): Element | null => {
	for (const node of nodes) {
		if (node instanceof Element) {
			return node;
		}
	}

	return null;
};

/**
 * Unwrap hydration wrappers in the new HTML so the morph engine sees
 * the same element structure as the live DOM.
 *
 * For boundaries that are already hydrated in the live DOM, we skip
 * unwrapping and instead preserve the wrapper. The caller (navigateTo)
 * will inject the live hydrated content into these wrappers so the
 * morph sees matching tags and morphs in-place rather than replacing.
 */
const normaliseHydrationMarkup = (
	container: ParentNode,
	preserveHydrated: boolean,
): Map<string, Element> => {
	const boundaries = Array.from(
		container.querySelectorAll('[data-hydrate="true"]'),
	);
	const preservedWrappers = new Map<string, Element>();

	for (const boundary of boundaries) {
		const id = boundary.getAttribute("data-hydrate-id");
		if (!id) {
			continue;
		}

		const hydratableNodes = getHydratableNodes(boundary, id);
		const rootElement = getHydrationRootElement(hydratableNodes);
		if (!rootElement || rootElement === boundary) {
			continue;
		}

		if (preserveHydrated) {
			const liveBoundary = document.querySelector(
				`[data-hydrate-id="${id}"][data-hydrated="true"]`,
			);
			if (liveBoundary instanceof Element) {
				preservedWrappers.set(id, boundary);
				continue;
			}
		}

		copyHydrationAttributes(boundary, rootElement, false);
		boundary.replaceWith(...hydratableNodes);
	}

	return preservedWrappers;
};

const isRestorableFormControl = (
	element: Element,
): element is RestorableFormControl =>
	element instanceof HTMLInputElement ||
	element instanceof HTMLTextAreaElement ||
	element instanceof HTMLSelectElement;

const isInsideNestedHydratedBoundary = (
	root: Element,
	element: Element,
): boolean => {
	const boundary = element.closest('[data-hydrate="true"]');
	return boundary instanceof Element && boundary !== root;
};

const getElementPathWithinRoot = (root: Element, element: Element): number[] => {
	if (root === element) {
		return [];
	}

	const path: number[] = [];
	let current: Element | null = element;
	while (current && current !== root) {
		const parentElement: HTMLElement | null = current.parentElement;
		if (!parentElement) {
			return [];
		}

		path.unshift(Array.from(parentElement.children).indexOf(current));
		current = parentElement;
	}

	return path;
};

const resolveElementPathWithinRoot = (
	root: Element,
	path: number[],
): Element | null => {
	let current: Element | null = root;
	for (const index of path) {
		if (!current || index < 0 || index >= current.children.length) {
			return null;
		}
		current = current.children[index] as Element;
	}

	return current;
};

const elementMatchesLocator = (
	element: Element,
	locator: ElementLocator,
): boolean => {
	if (element.tagName.toLowerCase() !== locator.tagName) {
		return false;
	}

	if (
		locator.inputType &&
		element instanceof HTMLInputElement &&
		element.type !== locator.inputType
	) {
		return false;
	}

	if (locator.inputType && !(element instanceof HTMLInputElement)) {
		return false;
	}

	return true;
};

const getNamedElementsWithinRoot = (
	root: Element,
	name: string,
	tagName: string,
	inputType?: string,
): Element[] => {
	const candidates: Element[] = [];
	if (root.getAttribute("name") === name) {
		candidates.push(root);
	}

	for (const candidate of root.querySelectorAll("[name]")) {
		if (!(candidate instanceof Element)) {
			continue;
		}
		if (candidate.getAttribute("name") === name) {
			candidates.push(candidate);
		}
	}

	return candidates.filter((candidate) => {
		if (candidate.tagName.toLowerCase() !== tagName) {
			return false;
		}

		if (inputType && candidate instanceof HTMLInputElement) {
			return candidate.type === inputType;
		}

		return !inputType || candidate instanceof HTMLInputElement;
	});
};

const createElementLocator = (root: Element, element: Element): ElementLocator => {
	const name = element.getAttribute("name") ?? undefined;
	const tagName = element.tagName.toLowerCase();
	const inputType =
		element instanceof HTMLInputElement ? element.type : undefined;
	const locator: ElementLocator = {
		id: element.id || undefined,
		name,
		path: getElementPathWithinRoot(root, element),
		tagName,
		inputType,
	};

	if (name) {
		const namedElements = getNamedElementsWithinRoot(
			root,
			name,
			tagName,
			inputType,
		);
		const nameIndex = namedElements.indexOf(element);
		if (nameIndex >= 0) {
			locator.nameIndex = nameIndex;
		}
	}

	return locator;
};

const resolveElementWithinRoot = (
	root: Element,
	locator: ElementLocator,
): Element | null => {
	if (locator.id) {
		if (root.id === locator.id && elementMatchesLocator(root, locator)) {
			return root;
		}

		for (const candidate of root.querySelectorAll("[id]")) {
			if (
				candidate instanceof Element &&
				candidate.id === locator.id &&
				elementMatchesLocator(candidate, locator)
			) {
				return candidate;
			}
		}
	}

	if (locator.name) {
		const namedElements = getNamedElementsWithinRoot(
			root,
			locator.name,
			locator.tagName,
			locator.inputType,
		);
		if (
			typeof locator.nameIndex === "number" &&
			locator.nameIndex >= 0 &&
			locator.nameIndex < namedElements.length
		) {
			return namedElements[locator.nameIndex] ?? null;
		}

		if (namedElements.length === 1) {
			return namedElements[0] ?? null;
		}
	}

	const candidate = resolveElementPathWithinRoot(root, locator.path);
	if (candidate && elementMatchesLocator(candidate, locator)) {
		return candidate;
	}

	return null;
};

const getRestorableFormControls = (
	root: Element,
	excludeHydratedDescendants = false,
): RestorableFormControl[] => {
	const controls: RestorableFormControl[] = [];
	const candidates: RestorableFormControl[] = [];
	if (isRestorableFormControl(root)) {
		candidates.push(root);
	}

	for (const candidate of root.querySelectorAll("input, textarea, select")) {
		if (candidate instanceof Element && isRestorableFormControl(candidate)) {
			candidates.push(candidate);
		}
	}

	for (const candidate of candidates) {
		if (
			excludeHydratedDescendants &&
			isInsideNestedHydratedBoundary(root, candidate)
		) {
			continue;
		}
		controls.push(candidate);
	}

	return controls;
};

const readSelectionState = (
	control: HTMLInputElement | HTMLTextAreaElement,
): Pick<
	ControlStateSnapshot,
	"selectionStart" | "selectionEnd" | "selectionDirection"
> => {
	try {
		return {
			selectionStart: control.selectionStart,
			selectionEnd: control.selectionEnd,
			selectionDirection: control.selectionDirection,
		};
	} catch {
		return {};
	}
};

const snapshotControlState = (
	root: Element,
	control: RestorableFormControl,
): ControlStateSnapshot => {
	const snapshot: ControlStateSnapshot = {
		locator: createElementLocator(root, control),
		active: document.activeElement === control,
	};

	if (control instanceof HTMLInputElement) {
		if (control.type !== "file") {
			snapshot.value = control.value;
		}
		if (control.type === "checkbox" || control.type === "radio") {
			snapshot.checked = control.checked;
		}
		Object.assign(snapshot, readSelectionState(control));
		return snapshot;
	}

	if (control instanceof HTMLTextAreaElement) {
		snapshot.value = control.value;
		Object.assign(snapshot, readSelectionState(control));
		return snapshot;
	}

	snapshot.selectedValues = Array.from(control.selectedOptions).map(
		(option) => option.value,
	);
	return snapshot;
};

const applyControlStateSnapshot = (
	root: Element,
	snapshot: ControlStateSnapshot,
): RestorableFormControl | null => {
	const target = resolveElementWithinRoot(root, snapshot.locator);
	if (!target || !isRestorableFormControl(target)) {
		return null;
	}

	if (target instanceof HTMLInputElement) {
		if (typeof snapshot.checked === "boolean") {
			target.checked = snapshot.checked;
			target.defaultChecked = snapshot.checked;
			if (snapshot.checked) {
				target.setAttribute("checked", "");
			} else {
				target.removeAttribute("checked");
			}
		}
		if (typeof snapshot.value === "string" && target.type !== "file") {
			target.value = snapshot.value;
			target.defaultValue = snapshot.value;
			target.setAttribute("value", snapshot.value);
		}
	} else if (target instanceof HTMLTextAreaElement) {
		if (typeof snapshot.value === "string") {
			target.value = snapshot.value;
			target.defaultValue = snapshot.value;
			target.textContent = snapshot.value;
		}
	} else if (snapshot.selectedValues) {
		const selectedValues = new Set(snapshot.selectedValues);
		for (const option of Array.from(target.options)) {
			const isSelected = selectedValues.has(option.value);
			option.selected = isSelected;
			if (isSelected) {
				option.setAttribute("selected", "");
			} else {
				option.removeAttribute("selected");
			}
		}
	}

	return target;
};

const restoreControlState = (
	root: Element,
	snapshot: ControlStateSnapshot,
): void => {
	const target = applyControlStateSnapshot(root, snapshot);
	if (!target) {
		return;
	}

	if (snapshot.active) {
		try {
			target.focus({ preventScroll: true });
		} catch {
			target.focus();
		}
	}

	if (
		(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
		typeof snapshot.selectionStart === "number" &&
		typeof snapshot.selectionEnd === "number"
	) {
		try {
			target.setSelectionRange(
				snapshot.selectionStart,
				snapshot.selectionEnd,
				snapshot.selectionDirection ?? undefined,
			);
		} catch {
			// Ignore unsupported selection APIs for certain input types.
		}
	}
};

const getScrollableElements = (
	root: Element,
	excludeHydratedDescendants = false,
): Element[] => {
	const elements: Element[] = [];
	const candidates: Element[] = [root];
	for (const candidate of root.querySelectorAll("*")) {
		if (candidate instanceof Element) {
			candidates.push(candidate);
		}
	}

	for (const candidate of candidates) {
		if (
			excludeHydratedDescendants &&
			isInsideNestedHydratedBoundary(root, candidate)
		) {
			continue;
		}
		if (candidate.scrollTop !== 0 || candidate.scrollLeft !== 0) {
			elements.push(candidate);
		}
	}

	return elements;
};

const snapshotBoundaryState = (boundary: Element): BoundaryStateSnapshot | null => {
	const id = boundary.getAttribute("data-hydrate-id");
	if (!id) {
		return null;
	}

	const controlStates = getRestorableFormControls(boundary).map((control) =>
		snapshotControlState(boundary, control),
	);

	return {
		id,
		controlStates,
		scrollStates: getScrollableElements(boundary).map((element) => ({
			locator: createElementLocator(boundary, element),
			scrollTop: element.scrollTop,
			scrollLeft: element.scrollLeft,
		})),
	};
};

const collectPageControlStateSnapshots = (
	options: NavigateOptions,
): ControlStateSnapshot[] => {
	if (!options.preserveHydratedState) {
		return [];
	}

	return getRestorableFormControls(document.body, true).map((control) =>
		snapshotControlState(document.body, control),
	);
};

const syncPageControlStateSnapshots = (
	container: Element,
	snapshots: ControlStateSnapshot[],
): void => {
	for (const snapshot of snapshots) {
		applyControlStateSnapshot(container, snapshot);
	}
};

const collectBoundaryStateSnapshots = (
	container: ParentNode,
	options: NavigateOptions,
): BoundaryStateSnapshot[] => {
	if (!options.preserveHydratedState) {
		return [];
	}

	const currentBoundaries = new Map<string, Element>();
	for (const boundary of document.querySelectorAll('[data-hydrate="true"]')) {
		const id = boundary.getAttribute("data-hydrate-id");
		if (!id) {
			continue;
		}
		currentBoundaries.set(id, boundary);
	}

	const snapshots: BoundaryStateSnapshot[] = [];
	for (const nextBoundary of container.querySelectorAll('[data-hydrate="true"]')) {
		const id = nextBoundary.getAttribute("data-hydrate-id");
		if (!id) {
			continue;
		}

		const currentBoundary = currentBoundaries.get(id);
		if (!currentBoundary) {
			continue;
		}

		const snapshot = snapshotBoundaryState(currentBoundary);
		if (snapshot) {
			snapshots.push(snapshot);
		}
	}

	return snapshots;
};

const restoreBoundaryStateSnapshots = (
	snapshots: BoundaryStateSnapshot[],
): void => {
	for (const snapshot of snapshots) {
		const boundary = document.querySelector(
			`[data-hydrate-id="${snapshot.id}"]`,
		);
		if (!(boundary instanceof Element)) {
			continue;
		}

		for (const controlState of snapshot.controlStates) {
			restoreControlState(boundary, controlState);
		}

		for (const scrollState of snapshot.scrollStates) {
			const element = resolveElementWithinRoot(boundary, scrollState.locator);
			if (!(element instanceof Element)) {
				continue;
			}
			element.scrollTop = scrollState.scrollTop;
			element.scrollLeft = scrollState.scrollLeft;
		}
	}
};

export const hydrateBoundary = async (
	boundary: Element,
	options: HydrateBoundaryOptions = {},
): Promise<void> => {
	if (boundary.getAttribute("data-hydrate") !== "true") {
		return;
	}

	if (boundary.getAttribute("data-hydrated") === "true") {
		return;
	}

	const id = boundary.getAttribute("data-hydrate-id");
	const exportName = boundary.getAttribute("data-hydrate-export");
	const src = boundary.getAttribute("data-hydrate-src");
	const propsStr = boundary.getAttribute("data-hydrate-props");
	const runtimeUrl = boundary.getAttribute("data-hydrate-runtime");

	if (!id || !src || !propsStr || !runtimeUrl) {
		console.warn(
			`[triggerHydration] Boundary missing metadata: id=${id} src=${src}`,
		);
		return;
	}

	try {
		const cacheBust = `?v=${Date.now()}`;
		console.log(`[hydrate:${id}] Starting hydration for ${src}${cacheBust}`);

		const { hydrate: doHydrate } = await import(
			/* @vite-ignore */ `${runtimeUrl}${cacheBust}`
		);
		const moduleExports = await import(
			/* @vite-ignore */ `${src}${cacheBust}`
		);

		const Component = pickHydrationComponent(
			moduleExports as Record<string, unknown>,
			exportName,
		);

		if (!Component) {
			console.error(
				`[hydrate:${id}] No hydratable export in ${src}${exportName ? ` (expected ${exportName})` : ""}`,
			);
			return;
		}
		const props = JSON.parse(propsStr);

		console.log(
			`[hydrate:${id}] Rendering component ${Component.name || "(anon)"} with props:`,
			props,
		);

		let roots = Component(props);
		if (!Array.isArray(roots)) {
			roots = [roots];
		}

		const hydratableNodes = options.fromWrapper
			? getHydratableNodes(boundary, id)
			: Array.from(
				boundary.querySelector(`script#${id}`)
					? getHydratableNodes(boundary, id)
					: [boundary],
			);

		for (const node of hydratableNodes) {
			if (node instanceof Element) {
				node.normalize();
			}
		}

		console.log(
			`[hydrate:${id}] Hydrating ${hydratableNodes.length} node(s)`,
		);

		doHydrate(roots, hydratableNodes);

		const rootBoundary = getHydrationRootElement(hydratableNodes);
		if (rootBoundary && rootBoundary !== boundary) {
			copyHydrationAttributes(boundary, rootBoundary, true);
			boundary.replaceWith(...hydratableNodes);
			console.log(`[hydrate:${id}] Hydration complete`);
			return;
		}

		boundary.setAttribute("data-hydrated", "true");
		for (const node of Array.from(boundary.childNodes)) {
			if (isHydrationScript(node, id)) {
				node.remove();
			}
		}
		console.log(`[hydrate:${id}] Hydration complete`);
	} catch (e) {
		console.error(`[hydrate:${id}] Error:`, e);
	}
};

const triggerHydration = async (container: Element): Promise<void> => {
	const wrappers = container.querySelectorAll('[data-hydrate="true"]');
	console.log(
		`[triggerHydration] Found ${wrappers.length} hydration wrapper(s)`,
	);

	const promises: Promise<void>[] = [];

	for (const wrapper of wrappers) {
		const promise = hydrateBoundary(wrapper);

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

const refreshLocalStylesheets = (): boolean => {
	const stylesheetLinks = Array.from(
		document.querySelectorAll('link[rel="stylesheet"]'),
	).filter((link): link is HTMLLinkElement => {
		if (!(link instanceof HTMLLinkElement)) {
			return false;
		}

		try {
			return new URL(link.href, window.location.href).origin === window.location.origin;
		} catch {
			return false;
		}
	});

	if (stylesheetLinks.length === 0) {
		return false;
	}

	const cacheBust = String(Date.now());
	for (const link of stylesheetLinks) {
		const nextUrl = new URL(link.href, window.location.href);
		nextUrl.searchParams.set("v", cacheBust);

		const replacement = link.cloneNode(true) as HTMLLinkElement;
		replacement.href = nextUrl.toString();
		replacement.addEventListener(
			"load",
			() => {
				link.remove();
			},
			{ once: true },
		);
		replacement.addEventListener(
			"error",
			() => {
				replacement.remove();
			},
			{ once: true },
		);

		link.after(replacement);
	}

	return true;
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
	options: NavigateOptions = {},
): Promise<void> => {
	// Prevent concurrent navigations (e.g. multiple WebSocket messages)
	if (navigating) return;
	navigating = true;

	try {
		const key = normalisePath(url);
		console.log(
			`[navigateTo] url=${url} key=${key} replace=${replace} cached=${pageCache.has(key)}`,
		);
		console.log("[defuss-ssg] Morph refresh: navigateTo start", {
			url,
			replace,
			kind: options.kind || "other",
			preserveHydratedState: options.preserveHydratedState !== false,
			preserveHydratedBoundaries:
				options.preserveHydratedBoundaries !== false,
			componentSrc: options.componentSrc || null,
		});

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

		const preservedWindowScroll = options.preserveHydratedState
			? { x: window.scrollX, y: window.scrollY }
			: null;

		// Collect live hydrated boundaries BEFORE morph so we can exclude them
		// from the morph and restore them afterward.
		const liveHydratedBoundaries = new Map<string, Element>();
		if (options.preserveHydratedState !== false) {
			for (const boundary of document.querySelectorAll('[data-hydrate="true"][data-hydrated="true"]')) {
				const id = boundary.getAttribute("data-hydrate-id");
				if (id) {
					liveHydratedBoundaries.set(id, boundary);
				}
			}
		}

		// For component HMR: only morph the changed component, leave everything
		// else untouched. This is the most surgical approach.
		if (options.kind === "component" && options.componentSrc && liveHydratedBoundaries.size > 0) {
			// Find the changed component's boundary in the new HTML.
			const newChangedBoundary = newBody.querySelector(
				`[data-hydrate-src="${options.componentSrc}"]`,
			);
			const liveChangedBoundary = Array.from(liveHydratedBoundaries.values()).find(
				(el) => el.getAttribute("data-hydrate-src") === options.componentSrc,
			);

			if (newChangedBoundary && liveChangedBoundary) {
				// Morph only the changed component in place.
				const hydratableNodes = getHydratableNodes(newChangedBoundary, newChangedBoundary.getAttribute("data-hydrate-id") || "");
				const rootElement = getHydrationRootElement(hydratableNodes);
				if (rootElement) {
					await $(liveChangedBoundary).update(rootElement);
				}
				// Update head metadata from fresh HTML.
					updateHead(doc);
					// Restore scroll position.
					if (preservedWindowScroll) {
						window.scrollTo(preservedWindowScroll.x, preservedWindowScroll.y);
					}
					// Done - no full body morph needed.
					console.log("[defuss-ssg] Morph refresh: component-only morph complete", {
						componentSrc: options.componentSrc,
					});
					return;
			}
		}

		normaliseHydrationMarkup(newBody, false);

		// Replace hydrated boundaries in the new HTML with placeholders so the
		// morph engine skips them. After morph, restore the live elements.
		const placeholders = new Map<string, Element>();
		for (const [id, liveBoundary] of liveHydratedBoundaries) {
			// Skip the changed component - it should get fresh content.
			if (options.kind === "component" && options.componentSrc) {
				const src = liveBoundary.getAttribute("data-hydrate-src");
				if (src === options.componentSrc) {
					continue;
				}
			}
			const newBoundary = newBody.querySelector(
				`[data-hydrate-id="${id}"]`,
			);
			if (!(newBoundary instanceof Element)) {
				continue;
			}
			const placeholder = document.createElement("div");
			placeholder.setAttribute("data-hydrate-placeholder", id);
			newBoundary.replaceWith(placeholder);
			placeholders.set(id, placeholder);
		}

		const pageControlStateSnapshots = collectPageControlStateSnapshots(options);
		syncPageControlStateSnapshots(newBody, pageControlStateSnapshots);
		const boundaryStateSnapshots = collectBoundaryStateSnapshots(
			newBody,
			options,
		);

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
		console.log("[defuss-ssg] Morph refresh: DOM morph start", {
			url,
			bodyLength: bodyHtml.length,
			kind: options.kind || "other",
		});
		await $(document.body).update(bodyHtml);
		console.log("[defuss-ssg] Morph refresh: DOM morph complete", {
			url,
			bodyLength: bodyHtml.length,
			kind: options.kind || "other",
		});

		// Restore placeholders with live hydrated elements.
		for (const [id, placeholder] of placeholders) {
			if (!placeholder.isConnected) {
				continue;
			}
			const liveBoundary = liveHydratedBoundaries.get(id);
			if (!liveBoundary) {
				continue;
			}
			placeholder.replaceWith(liveBoundary);
		}

		// Trigger hydration for all wrappers in the new body
		await triggerHydration(document.body);
		restoreBoundaryStateSnapshots(boundaryStateSnapshots);
		console.log("[defuss-ssg] Morph refresh: hydration restore complete", {
			url,
			kind: options.kind || "other",
			boundarySnapshots: boundaryStateSnapshots.length,
		});

		// Update history
		if (replace) {
			history.replaceState({ ...history.state, navigated: true }, "", url);
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
		} else if (preservedWindowScroll) {
			window.scrollTo(preservedWindowScroll.x, preservedWindowScroll.y);
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
if (!runtimeWindow.__defuss_runtime_init) {
	runtimeWindow.__defuss_runtime_init = true;

	// Set up client-side navigation and prefetch
	setupClientNav();
	setupPrefetch();
}

// Live-reload WebSocket is always (re-)initialised so the newest module
// closure is used - but setupLiveReload itself deduplicates the connection.
setupLiveReload();

// Expose module-scoped state for HMR client access (guard against redefinition on re-import)
if (!runtimeWindow.__defuss_pageCache) {
	Object.defineProperty(window, "__defuss_pageCache", {
		value: pageCache,
		writable: false,
		configurable: false,
	});
}

if (!runtimeWindow.__defuss_fetching) {
	Object.defineProperty(window, "__defuss_fetching", {
		value: fetching,
		writable: false,
		configurable: false,
	});
}

// Expose runtime functions for HMR client to trigger soft reload
runtimeWindow.__defuss_ssg_runtime = {
	navigateTo,
	refreshLocalStylesheets,
	get pageCache() {
		return pageCache;
	},
	set bustCache(value: boolean) {
		runtimeWindow.__defuss_bustCache = value;
		// Also clear in-flight fetch tracking so the next prefetch won't
		// incorrectly skip due to a stale "fetching" flag from a previous
		// background refresh timer.
		if (value) {
			fetching.clear();
		}
	},
};

export { hydrate };
