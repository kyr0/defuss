import type { Dequery, DequerySyncMethodReturnType } from "@/dequery/index.js";
import {
  observeUnmount,
  renderIsomorphicSync,
  renderIsomorphicAsync,
  type ParentElementInput,
  type ParentElementInputAsync,
  globalScopeDomApis,
} from "./isomorph.js";
import type { Globals, RenderInput, RenderResult, VNode } from "./types.js";

export const renderSync = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: ParentElementInput = document.documentElement,
): RenderResult<T> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const render = async <T extends RenderInput>(
  virtualNode: T | Promise<T>,
  parentDomElement: ParentElementInputAsync | any = document.documentElement,
): Promise<RenderResult<T>> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicAsync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const renderToString = (el: Node) =>
  new XMLSerializer().serializeToString(el);

export const hydrate = (
  nodes: Array<VNode | string | null>,
  parentElements: Array<HTMLElement | Text | Node>,
  debug?: boolean,
) => {
  let elementIndex = 0;

  for (const node of nodes) {
    if (typeof node === "string" || node === null) {
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

    if (elementIndex >= parentElements.length && debug) {
      console.warn(
        "[defuss] Hydration warning: Not enough DOM elements to match VNodes.",
      );
      break;
    }

    const vnode = node as VNode;
    const element = parentElements[elementIndex] as HTMLElement;

    // update ref.current if ref is provided
    if (vnode.attributes!.ref) {
      vnode.attributes!.ref.current = element;
      element._defussRef = vnode.attributes!.ref; // store ref on element for later access
    }

    // attach event listeners
    for (const key of Object.keys(vnode.attributes!)) {
      if (key === "ref") continue; // don't override ref.current with [object Object] again

      // TODO: refactor: this maybe can be unified with isomorph render logic
      if (
        key.startsWith("on") &&
        typeof vnode.attributes![key] === "function"
      ) {
        let eventName = key.substring(2).toLowerCase();
        let capture = false;

        // check for specific suffixes to set event options
        if (eventName.endsWith("capture")) {
          capture = true;
          eventName = eventName.replace(/capture$/, "");
        }

        element.addEventListener(eventName, vnode.attributes![key], capture);
      }
    }

    // --- element lifecycle ---

    // TODO: this should be refactored to re-use logic in lifecycle.js!

    if (vnode?.attributes?.onUnmount) {
      observeUnmount(element, vnode.attributes.onUnmount);
    }

    // recursively hydrate children
    if (vnode?.children && vnode?.children?.length > 0) {
      hydrate(
        vnode.children as Array<VNode | string | null>,
        Array.from(element.childNodes),
      );
    }

    // call onMount if provided
    if (vnode?.attributes?.onMount) {
      // ensure onMount is a function
      vnode.attributes?.onMount?.(element);
    }
    elementIndex++;
  }

  // Optionally, warn if there are unmatched DOM elements
  if (elementIndex < parentElements.length && debug) {
    console.warn(
      "[defuss] Hydration warning: There are more DOM elements than VNodes.",
    );
  }
};

export * from "./index.js";
