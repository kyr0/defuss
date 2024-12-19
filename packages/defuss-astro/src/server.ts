import type { AstroComponentMetadata, NamedSSRLoadedRendererValue } from 'astro';
import type { RendererContext } from './types.js';
import { renderToString, render, getBrowserGlobals, getDocument } from 'defuss/server'
import type { Props, RenderInput } from 'defuss'
import { StaticHtml } from './render.js';

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

async function check(
	this: RendererContext,
	Component: any,
	_props: Record<string, any>,
	_children: any,
) {
	
	if (typeof Component !== 'function') return false;
	if (Component.name === 'QwikComponent') return false;
	// Svelte component renders fine by Solid as an empty string. The only way to detect
	// if this isn't a Solid but Svelte component is to unfortunately copy the check
	// implementation of the Svelte renderer.
	if (Component.toString().includes('$$payload')) return false;
	// Preact forwarded-ref components can be functions, which we do not support
	if (typeof Component === 'function' && Component.$$typeof === Symbol.for('react.forward_ref'))
		return false;

	return true; // always (re-)render for now (TODO: implement proper check)
}


async function renderToStaticMarkup(
	this: RendererContext,
	Component: any,
	props: Record<string, any>,
	{ default: children, ...slotted }: Record<string, any>,
	metadata: AstroComponentMetadata | undefined,
) {

	const needsHydrate = metadata?.astroStaticSlot ? !!metadata.hydrate : true;
	const tagName = needsHydrate ? 'astro-slot' : 'astro-static-slot';

	const slots: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = StaticHtml(`<${tagName} name="${name}">${value}</${tagName}>`);
	}

	// Note: create newProps to avoid mutating `props` before they are serialized
	// traverse the props object and create a new object with the same values
	const componentProps: Props = {
		...props,
		...slots,
		// In Solid SSR mode, `ssr` creates the expected structure for `children`.
		children: children != null ? StaticHtml(`<${tagName}>${children}</${tagName}>`) : children
	};

	// children is a special prop that contains the children of the component
	if (children) {
		componentProps.children = children;
	}

	let errorBoundaryCallback: ((err: unknown) => void) | undefined;

	componentProps.onError = (cb: (err: unknown) => void) => {
		errorBoundaryCallback = cb
	}

	let vdom: RenderInput;

	const browserGlobals = getBrowserGlobals();
	const document = getDocument(false, browserGlobals)
	browserGlobals.document = document;

  // declare window and document as globals on server-side
	// this allows for a fantastic developer experience
	// as the global objects are available at JSX runtime
	for (const key of Object.keys(browserGlobals)) {
		if (typeof (globalThis as Record<string, unknown>)[key] === "undefined") {
			// this intentionally pollutes the global space
			(globalThis as Record<string, unknown>)[key] = browserGlobals[key as any];
		}
	}

	try {
		vdom = Component(componentProps)
	} catch (error) {
		if (typeof errorBoundaryCallback === "function") {

			if (typeof error === "string") {
				error = `[JsxError] in ${Component.name}: ${error}`;
			} else if (error instanceof Error) {
				error.message = `[JsxError] in ${Component.name}: ${error.message}`;
			}
			errorBoundaryCallback(error)
		} else {
			throw error;
		}
	}

	let roots: HTMLElement|Array<HTMLElement>;
	let html = '';

	const attrs = {};

	// turn the component AST into an actual DOM element and attach it to the element passed in
	roots = render(vdom, document.documentElement, { 
		browserGlobals
	}) as HTMLElement;
	
	// set all props as top level attributes
	for (const [key, value] of Object.entries(props)) {
		if (key !== 'children') {
			(attrs as Record<string, unknown>)[key] = value;
		}
	}

	if (!Array.isArray(roots)) {
		roots = [roots];
	}

	for (const el of roots) {
		html += renderToString(el);
	}
	return { attrs, html };
}

const renderer: NamedSSRLoadedRendererValue = {
	name: 'defuss',
	check,
	renderToStaticMarkup,
	supportsAstroStaticSlot: true,
};

export default renderer;