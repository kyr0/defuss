import type { AstroComponentMetadata, NamedSSRLoadedRendererValue } from 'astro';
import type { RendererContext } from './types.js';
import { renderToString, render } from 'defuss/server'
import { type Props, jsx } from 'defuss'
import { StaticHtml } from './render.js';

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

// TODO: is a differential update possible?

async function check(
	this: RendererContext,
	Component: any,
	props: Record<string, any>,
	children: any,
) {
	if (typeof Component !== 'function') return false;

	console.log('server check', this);

	return true; // always (re-)render for now (TODO: implement proper check)
}

async function renderToStaticMarkup(
	this: RendererContext,
	Component: any,
	props: Record<string, any>,
	{ default: children, ...slotted }: Record<string, any>,
	metadata: AstroComponentMetadata | undefined,
) {

	console.log('server render', this);

	// we use "classic" runtime, so we need to set the global jsx function
	// otherwise it would need to be imported in every component
	(globalThis as any).jsx = jsx;

	const slots: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = StaticHtml(value);
	}

	// traverse the props object and create a new object with the same values
	const componentProps: Props = { ...props };

	// children is a special prop that contains the children of the component
	if (children) {
		componentProps.children = children;
	}

	// turn the component AST into an actual DOM element and attach it to the element passed in
	const dom: HTMLElement = render(Component(componentProps)) as HTMLElement;

	const attrs = {};
	
	// set all props as top level attributes
	for (const [key, value] of Object.entries(props)) {
		if (key !== 'children') {
			(attrs as Record<string, unknown>)[key] = value;
		}
	}

	const html = renderToString(dom);

	return { attrs, html };
}

const renderer: NamedSSRLoadedRendererValue = {
	name: 'defuss',
	check,
	renderToStaticMarkup,
	supportsAstroStaticSlot: true,
};

export default renderer;