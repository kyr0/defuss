import { type Props, render } from 'defuss/client'
import { jsx } from 'defuss'
import { StaticHtml } from './render.js';

// TODO: is a differential update possible?

export default (element: HTMLElement) =>
	async (
		Component: any,
		props: Record<string, any>,
		{ default: children, ...slotted }: Record<string, any>,
		{ client }: Record<string, string>,
	) => {

		console.log('client render', client);
		
		if (!element.hasAttribute('ssr')) return;

		// we use "classic" runtime, so we need to set the global jsx function
		// otherwise it would need to be imported in every component
		(globalThis as any).jsx = jsx;

		Object.entries(slotted).forEach(([key, value]) => {
			props[key] = StaticHtml(value);
		});

		// traverse the props object and create a new object with the same values
		const componentProps: Props = { ...props };

		// children is a special prop that contains the children of the component
		if (children) {
			// all children are passed as an array
			if (!Array.isArray(children)) {
				children = [children];
			} 

			for (let i=0; i<children.length; i++) {
				if (typeof children[i] === 'string') {
					// turn static HTML into a component
					children[i] = StaticHtml(children[i]);
				}
			}
			componentProps.children = children;
		}

		// turn the component AST into an actual DOM element and attach it to the element passed in
		const dom: HTMLElement = render(Component(componentProps), element) as HTMLElement;

		// set all props as top level attributes
		for (const [key, value] of Object.entries(props)) {
			if (key !== 'children') {
				dom.setAttribute(key, value);
			}
		}

		element.addEventListener('astro:unmount', () => {
			// remove the rendered component from the DOM
			if (dom.parentNode) {
				dom.parentNode.removeChild(dom);
			}
    }, { once: true });
	};