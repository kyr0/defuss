import type { Dequery } from '../dequery/types.js'
import { renderIsomorphic } from './isomorph.js'
import type { RenderInput, RenderResult, VNode } from './types.js'

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: Element | Document | Dequery = document.documentElement,
): RenderResult<T> => renderIsomorphic(virtualNode, parentDomElement, window) as any

export const renderToString = (el: Node) => new XMLSerializer().serializeToString(el)

// 1. any item in roots that has a ref object needs to update ref.current to the actual DOM element
// 2. any event listener must be attached to the actual DOM element
// 3. onMount needs to be called with the actual DOM element, if registered
export const hydrate = (nodes: Array<VNode>, elements: Array<HTMLElement|Text|Node>) => {

  if (nodes.length !== elements.length) {
    throw new Error('[defuss] Hydration failed. Number of VNodes from CSR does not match the number of DOM elements rendered in SSR.');
  }

  for (let i = 0; i < nodes.length; i++) {

    const node = nodes[i];
    const element = elements[i];

    if (!node.type) {
      // skip scalar values, must be a valid VNode
      continue;
    }

    //console.log('hydrating', node, 'vs',  element);

    if (node.attributes.ref) {
      node.attributes.ref.current = element;
    }

    for (const key of Object.keys(node.attributes)) {
      if (key.startsWith('on')) {
        // cut away 'on' from the beginning of the event name
        // was: 'onClick' -> now: 'click'
        let eventName = key.substring(2).toLowerCase();
        const capturePos = eventName.indexOf('capture')
        const doCapture = capturePos > -1

        if (doCapture) {
          // cut away 'Capture' from the end of the event name
          // was: 'clickCapture' -> now: 'click'
          eventName = eventName.substring(0, capturePos)
        }
        // register event listeners for interactivity
        element.addEventListener(eventName, node.attributes[key]);
      }
    }

    if (node.attributes?.onMount) {
      // call onMount with the actual DOM element
      node.attributes.onMount(element);
    }

    if (node.children) {
      // recursively hydrate children
      hydrate(node.children as Array<VNode>, Array.from(element.childNodes));
    }
  }
}

export * from './index.js'
