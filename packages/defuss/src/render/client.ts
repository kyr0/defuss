import type { Dequery } from '../dequery/types.js'
import { renderIsomorphic } from './isomorph.js'
import { createErrorBoundaryCallback, notifyMounted, notifyOnUnmount, notifyUnmounted, onElementUnmount, onUnmount } from './lifecycle.js'
import type { RenderInput, RenderResult, VNode } from './types.js'

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: Element | Document | Dequery = document.documentElement,
): RenderResult<T> => renderIsomorphic(virtualNode, parentDomElement, window) as any

export const renderToString = (el: Node) => new XMLSerializer().serializeToString(el)

export const hydrate = (
  nodes: Array<VNode | string | null>,
  parentElements: Array<HTMLElement | Text | Node>,
  debug?: boolean
) => {
  let elementIndex = 0;

  for (const node of nodes) {
    if (typeof node === 'string' || node === null) {
      // for text nodes or null, skip DOM elements that are not elements
      while (
        elementIndex < parentElements.length &&
        parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE &&
        parentElements[elementIndex].nodeType !== Node.TEXT_NODE
      ) {
        elementIndex++;
      }
      // optionally, you can add validation here to match text content if necessary
      elementIndex++;
      continue;
    }

    // find the next relevant DOM element
    while (
      elementIndex < parentElements.length &&
      parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE
    ) {
      elementIndex++;
    }

    if ((elementIndex >= parentElements.length) && debug) {
      console.warn(
        '[defuss] Hydration warning: Not enough DOM elements to match VNodes.'
      );
      break;
    }

    const vnode = node as VNode;
    const element = parentElements[elementIndex] as HTMLElement;

    // update ref.current if ref is provided
    if (vnode.attributes.ref) {
      vnode.attributes.ref.current = element;
      console.log('hydrating ref', vnode.attributes.ref, element)
    }

    // attach event listeners
    for (const key of Object.keys(vnode.attributes)) {
      if (key === 'ref') continue; // don't override ref.current with [object Object] again

      if (key.startsWith('on') && typeof vnode.attributes[key] === 'function') {
        let eventName = key.substring(2).toLowerCase();
        let capture = false;

        // check for specific suffixes to set event options
        if (eventName.endsWith('capture')) {
          capture = true;
          eventName = eventName.replace(/capture$/, '');
        }

        element.addEventListener(
          eventName,
          createErrorBoundaryCallback(vnode.attributes[key], vnode.$$type).bind(element),
          capture
        );
      }
    }

    // --- element lifecycle ---

    // call onMount if provided
    if (vnode.attributes.onMount) {
      vnode.attributes.onMount(element);
    }

    if (vnode.attributes.onUnmount) {
      onElementUnmount(element, vnode.attributes.onUnmount)
    }

    // --- component lifecycle ---
    if (typeof vnode.$$type === 'function') {
      // register the unmount observer (MutationObserver)
      notifyOnUnmount(element as HTMLElement, vnode.$$type)
      
      // notify mounted
      notifyMounted(element as HTMLElement, vnode.$$type)
    }

    // recursively hydrate children
    if (vnode.children && vnode.children.length > 0) {
      hydrate(
        vnode.children as Array<VNode | string | null>,
        Array.from(element.childNodes)
      );
    }
    elementIndex++;
  }

  // Optionally, warn if there are unmatched DOM elements
  if ((elementIndex < parentElements.length) && debug) {
    console.warn(
      '[defuss] Hydration warning: There are more DOM elements than VNodes.'
    );
  }
};


export * from './index.js'
