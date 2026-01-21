import {
  observeUnmount,
  renderIsomorphicSync,
  renderIsomorphicAsync,
  type ParentElementInput,
  type ParentElementInputAsync,
  globalScopeDomApis,
} from "./isomorph.js";
import type { Globals, RenderInput, RenderResult, VNode } from "./types.js";
import { parseEventPropName, registerDelegatedEvent } from "./delegated-events.js";

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

  if (nodes.length !== parentElements.length) {
    // Last-chance fix: fuse consecutive string/number nodes into a single Text node,
    // restarting when encountering a non-fusable vnode. Continue scanning afterwards.
    const fusedNodes: Array<VNode | string | null> = [];
    let textBuffer: string | null = null;

    const flush = () => {
      if (textBuffer && textBuffer.length > 0) {
        fusedNodes.push(textBuffer);
      }
      textBuffer = null;
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as any;
      // Values that produce text in HTML output
      if (
        typeof node === "string" ||
        typeof node === "number" ||
        typeof node === "bigint"
      ) {
        textBuffer = (textBuffer ?? "") + String(node);
        continue;
      }

      // Values that render nothing in HTML output (do not break fusion)
      if (
        node === null ||
        typeof node === "undefined" ||
        typeof node === "boolean"
      ) {
        continue;
      }

      // Non-fusable (VNode/object/etc.) -> boundary: flush and push
      flush();
      fusedNodes.push(node);
    }

    // push any trailing buffered text
    flush();

    if (fusedNodes.length === parentElements.length) {
      nodes = fusedNodes;
      if (debug) {
        console.debug(
          "[defuss] Hydration: resolved mismatch via text-node fusion.",
        );
      }
    } else {
      // Fail hard: we couldn't reconcile vnode count with DOM children
      throw new Error(
        `【defuss】Hydration error: Mismatched number of VNodes (${fusedNodes.length}) and DOM elements (${parentElements.length}) after text-node fusion attempt.`,
      );
    }
  }

  for (const node of nodes) {
    // Text-like nodes: will correspond to a single DOM Text node
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      // for text nodes, skip DOM nodes that are not elements or text
      while (
        elementIndex < parentElements.length &&
        parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE &&
        parentElements[elementIndex].nodeType !== Node.TEXT_NODE
      ) {
        elementIndex++;
      }

      if (elementIndex >= parentElements.length) {
        if (debug) {
          console.warn(
            "[defuss] Hydration warning: Ran out of DOM nodes while matching text content.",
          );
        }
        break;
      }

      const domNode = parentElements[elementIndex];
      const expected = String(node);

      if (domNode.nodeType === Node.TEXT_NODE) {
        const textNode = domNode as Text;
        if (textNode.nodeValue !== expected) {
          if (debug) {
            console.warn(
              `[defuss] Hydration text mismatch: expected "${expected}", got "${textNode.nodeValue ?? ""}". Correcting.`,
            );
          }
          textNode.nodeValue = expected;
        }
        elementIndex++;
        continue;
      }

      // Encountered an element where a text node was expected
      if (domNode.nodeType === Node.ELEMENT_NODE) {
        const message =
          "[defuss] Hydration error: ELEMENT_NODE encountered where TEXT_NODE was expected for text content.";
        if (debug) {
          throw new Error(message);
        } else {
          console.warn(message);
          // Best effort: advance to keep indexes moving; hydration may drift
          elementIndex++;
          continue;
        }
      }
    }

    // Values that render nothing: do not consume a DOM node
    if (
      node === null ||
      typeof node === "undefined" ||
      typeof node === "boolean"
    ) {
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

    // attach event listeners using delegated events
    for (const key of Object.keys(vnode.attributes!)) {
      if (key === "ref") continue;

      const value = vnode.attributes![key];

      // lifecycle is handled elsewhere in hydrate (onMount/onUnmount), don't treat as DOM event
      if (key === "onMount" || key === "onUnmount" || key === "onmount" || key === "onunmount") continue;

      const parsed = parseEventPropName(key);
      if (!parsed) continue;
      if (typeof value !== "function") continue;

      const { eventType, capture } = parsed;

      // ignore "mount"/"unmount" pseudo events here (hydrate calls onMount and wires unmount separately)
      if (eventType === "mount" || eventType === "unmount") continue;

      registerDelegatedEvent(element, eventType, value as EventListener, { capture });
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
