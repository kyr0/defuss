import type {
  Globals,
  RenderInput,
  VNode,
  VNodeAttributes,
  VNodeChild,
} from "defuss/jsx-runtime";
import {
  getRenderer,
  handleLifecycleEventsForOnMount,
} from "../render/isomorph.js";
import type { NodeType } from "../render/index.js";
import { createTimeoutPromise } from "defuss-runtime";

/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text nodes, compares text content.
 */
export const areDomNodesEqual = (oldNode: Node, newNode: Node): boolean => {
  // return true if both references are identical
  if (oldNode === newNode) return true;

  // compare node types
  if (oldNode.nodeType !== newNode.nodeType) return false;

  // handle Element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldElement = oldNode as Element;
    const newElement = newNode as Element;

    // compare tag names
    if (oldElement.tagName !== newElement.tagName) return false;

    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;

    // compare number of attributes
    if (oldAttrs.length !== newAttrs.length) return false;

    // iterate and compare each attribute's name and value
    for (let i = 0; i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue) return false;
    }
  }

  // handle Text nodes
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) return false;
  }
  return true;
};

/**
 * Recursively updates oldNode with the structure of newNode:
 * - If they differ (tag/attrs/text), oldNode is replaced
 * - If same, we recurse on children
 */
const updateNode = (oldNode: Node, newNode: Node) => {
  // 1) If different, replace old with new
  if (!areDomNodesEqual(oldNode, newNode)) {
    oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
    return;
  }

  // 2) If they match and are elements, recurse on their children
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldChildren = oldNode.childNodes;
    const newChildren = newNode.childNodes;
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (oldChild && newChild) {
        // both exist; recurse
        updateNode(oldChild, newChild);
      } else if (newChild && !oldChild) {
        // new child doesn't exist in old => append
        oldNode.appendChild(newChild.cloneNode(true));
      } else if (oldChild && !newChild) {
        // old child doesn't exist in new => remove
        oldNode.removeChild(oldChild);
      }
    }
  }
};

/**
 * Partially updates a DOM subtree by comparing `targetElement` to
 * newly parsed HTML. No `.innerHTML` is used here; we parse via DOMParser.
 */
export const updateDom = (
  targetElement: Element,
  newHTML: string,
  Parser: typeof DOMParser,
): void => {
  // 1) Parse the new HTML string into a DocumentFragment-like structure
  const parser = new Parser();
  // 'text/html' => parse as a full HTML doc. We take the <body>'s children as our new nodes
  const doc = parser.parseFromString(newHTML, "text/html");

  // 2) Extract all child nodes from the newly parsed doc (including Text nodes)
  const newNodes = Array.from(doc.body.childNodes);

  if (newNodes.length === 0) {
    console.warn("No content found in the new HTML.");
    return;
  }

  // 3) For each new node, see if there's an old corresponding node to update
  for (let i = 0; i < newNodes.length; i++) {
    const newNode = newNodes[i];
    const oldNode = targetElement.childNodes[i];

    if (oldNode) {
      // partial update
      updateNode(oldNode, newNode);
    } else {
      // target has fewer nodes => just append
      targetElement.appendChild(newNode.cloneNode(true));
    }
  }

  // 4) Remove any old leftover nodes that have no matching new node
  while (targetElement.childNodes.length > newNodes.length) {
    targetElement.removeChild(targetElement.lastChild!);
  }
};

/********************************************************
 * 1) Define a "valid" child type & utility
 ********************************************************/
export type ValidChild =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode<VNodeAttributes>;

function toValidChild(child: VNodeChild): ValidChild | undefined {
  if (child == null) return child; // null or undefined
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return child;
  }
  if (typeof child === "object" && "type" in child) {
    return child as VNode<VNodeAttributes>;
  }
  // e.g. function or {} -> filter out
  return undefined;
}

/********************************************************
 * 2) Check if a DOM node and a ValidChild match by type
 ********************************************************/
function areNodeAndChildMatching(domNode: Node, child: ValidChild): boolean {
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    // must be a text node
    return domNode.nodeType === Node.TEXT_NODE;
  } else if (child && typeof child === "object") {
    // must be same tag
    if (domNode.nodeType !== Node.ELEMENT_NODE) return false;
    const oldTag = (domNode as Element).tagName.toLowerCase();
    const newTag = child.type.toLowerCase();
    return oldTag === newTag;
  }
  // if child is null/undefined => definitely no match
  return false;
}

/********************************************************
 * 3) Patch a single DOM node in place (attributes, text, children)
 ********************************************************/
function patchDomInPlace(domNode: Node, child: ValidChild, globals: Globals) {
  const renderer = getRenderer(globals.window.document);

  // textlike
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    const newText = String(child);
    if (domNode.nodeValue !== newText) {
      domNode.nodeValue = newText;
    }
    return;
  }

  // element
  if (
    domNode.nodeType === Node.ELEMENT_NODE &&
    child &&
    typeof child === "object"
  ) {
    // 1) update attributes
    // remove old attributes not present
    const el = domNode as Element;
    const existingAttrs = Array.from(el.attributes);
    for (const attr of existingAttrs) {
      const { name } = attr;
      if (
        !Object.prototype.hasOwnProperty.call(child.attributes, name) &&
        name !== "style"
      ) {
        el.removeAttribute(name);
      }
    }
    // set new attributes
    renderer.setAttributes(child, el);

    // 2) dangerouslySetInnerHTML => skip child updates
    if (child.attributes?.dangerouslySetInnerHTML) {
      el.innerHTML = child.attributes.dangerouslySetInnerHTML.__html;
      return;
    }

    // 3) recursively do partial updates for children
    if (child.children) {
      updateDomWithVdom(el, child.children as any, globals);
    } else {
      // remove old children
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    }
  }
}

/********************************************************
 * 4) Create brand new DOM node from a ValidChild
 ********************************************************/
function createDomFromChild(
  child: ValidChild,
  globals: Globals,
): Node | Node[] | undefined {
  const renderer = getRenderer(globals.window.document);

  if (child == null) return undefined;
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return globals.window.document.createTextNode(String(child));
  }

  // else it's a VNode, create without parent as we don't know where it goes yet
  // therefore, we need to handle the onMount lifecycle event later too
  let renderResult = renderer.createElementOrElements(child) as
    | Node
    | Node[]
    | undefined;

  if (renderResult && !Array.isArray(renderResult)) {
    renderResult = [renderResult];
  }
  return renderResult;
}

/********************************************************
 * 5) Main partial-update function (index-by-index approach)
 ********************************************************/
export function updateDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
) {
  //console.log('updateDomWithVdom', newVDOM, parentElement)

  // A) Convert newVDOM => array of "valid" children
  let newChildren: ValidChild[] = [];
  if (Array.isArray(newVDOM)) {
    newChildren = newVDOM
      .map(toValidChild)
      .filter((c): c is ValidChild => c !== undefined);
  } else if (
    typeof newVDOM === "string" ||
    typeof newVDOM === "number" ||
    typeof newVDOM === "boolean"
  ) {
    newChildren = [newVDOM];
  } else if (newVDOM) {
    const child = toValidChild(newVDOM);
    if (child !== undefined) newChildren = [child];
  }

  //console.log("new children to render!", newChildren)

  // B) Generate brand-new DOM for each new child in an array
  //    We'll compare them 1:1 with the old nodes.
  const newDomArray: (Node | Node[] | undefined)[] = newChildren.map(
    (vdomChild) => createDomFromChild(vdomChild, globals),
  );

  // C) Snapshot old children
  const oldNodes = Array.from(parentElement.childNodes);

  // D) Walk up to max length
  const maxLen = Math.max(oldNodes.length, newDomArray.length);
  for (let i = 0; i < maxLen; i++) {
    const oldNode = oldNodes[i];
    const newDom = newDomArray[i]; // might be a single Node or an array of Nodes
    const newChild = newChildren[i];

    if (oldNode && newDom !== undefined) {
      // Both old & new exist
      // 1) If newDom is an array (multiple root nodes?), we do a bigger replace
      //    or partial approach. Typically we might place the 1st in oldNode's position
      //    and then insert the rest right after it, then remove oldNode if needed.
      if (Array.isArray(newDom)) {
        if (newDom.length === 0) {
          // no new => remove old
          parentElement.removeChild(oldNode);
        } else {
          // We might keep the first node and replace oldNode
          const first = newDom[0];
          parentElement.replaceChild(first, oldNode);

          if (typeof first !== "undefined") {
            handleLifecycleEventsForOnMount(first as HTMLElement);
          }

          // Insert the rest
          for (let k = 1; k < newDom.length; k++) {
            if (newDom[k]) {
              parentElement.insertBefore(newDom[k]!, first.nextSibling);

              if (typeof newDom[k] !== "undefined") {
                //console.log("inserBefore!")
                handleLifecycleEventsForOnMount(newDom[k] as HTMLElement);
              }
            }
          }
        }
      } else if (newDom) {
        // single new node
        // 2) If old & new match => partial patch. Else => replace
        if (newChild && areNodeAndChildMatching(oldNode, newChild)) {
          // partial patch
          patchDomInPlace(oldNode, newChild, globals);
        } else {
          // replace
          parentElement.replaceChild(newDom, oldNode);

          handleLifecycleEventsForOnMount(newDom as HTMLElement);
        }
      }
    } else if (!oldNode && newDom !== undefined) {
      // we have more new nodes => append
      if (Array.isArray(newDom)) {
        newDom.forEach((newNode) => {
          const wasAdded = newNode && parentElement.appendChild(newNode);

          if (wasAdded) {
            handleLifecycleEventsForOnMount(newNode as HTMLElement);
          }
          return wasAdded;
        });
      } else if (newDom) {
        parentElement.appendChild(newDom);

        handleLifecycleEventsForOnMount(newDom as HTMLElement);
      }
    } else if (oldNode && newDom === undefined) {
      // we have leftover old => remove
      parentElement.removeChild(oldNode);
    }
  }
}

/**
 * Directly blow away all children in `parentElement` and create new DOM
 * from `newVDOM`. This never skips or leaves behind stale nodes,
 * at the cost of losing partial update performance.
 */
export function replaceDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
) {
  // 1) Clear all existing DOM children
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }

  // 2) Re-render from scratch
  const renderer = getRenderer(globals.window.document);

  // Possibly convert `newVDOM` to array if needed,
  // but `renderer.createElementOrElements` handles it either way:
  const newDom = renderer.createElementOrElements(
    newVDOM as VNode | undefined | Array<VNode | undefined | string>,
  );

  // 3) Append the newly created node(s)
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) parentElement.appendChild(node);
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
  }
}

export async function waitForDOM(
  check: () => Array<NodeType>,
  timeout: number,
  document?: Document,
): Promise<Array<NodeType>> {
  const initialResult = check();

  if (initialResult.length) return initialResult;

  return createTimeoutPromise(timeout, () => {
    return new Promise<Array<NodeType>>((resolve) => {
      if (!document) {
        setTimeout(() => resolve(check()), 0);
        return;
      }

      const observer = new MutationObserver(() => {
        const result = check();
        if (result.length) {
          observer.disconnect();
          resolve(result);
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      return () => observer.disconnect();
    });
  });
}

export function parseDOM(
  input: string,
  type: DOMParserSupportedType,
  Parser: typeof DOMParser,
): Document {
  return new Parser().parseFromString(input, type);
}

export function isSVG(input: string, Parser: typeof DOMParser) {
  const doc = parseDOM(input, "image/svg+xml", Parser);
  if (!doc.documentElement) return false;
  return doc.documentElement.nodeName.toLowerCase() === "svg";
}

export function isHTML(input: string, Parser: typeof DOMParser): boolean {
  const doc = parseDOM(input, "text/html", Parser);
  return doc.documentElement.querySelectorAll("*").length > 2; // 2 = <html> and <body>
}

export const isMarkup = (input: string, Parser: typeof DOMParser): boolean =>
  input.indexOf("<") > -1 &&
  input.indexOf(">") > -1 &&
  (isHTML(input, Parser) || isSVG(input, Parser));

export function renderMarkup(
  markup: string,
  Parser: typeof DOMParser,
  doc?: Document,
) {
  // TODO: test with SVG markup
  return Array.from(
    (doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser)).body
      .childNodes,
  );
}

export function getMimeType(
  input: string,
  Parser: typeof DOMParser,
): DOMParserSupportedType {
  if (isSVG(input, Parser)) {
    return "image/svg+xml";
  }
  return "text/html";
}

/**
 * Enhanced version of processFormElements that handles all form control types
 * including multiple select elements and radio button groups
 */
export function processAllFormElements(
  node: NodeType,
  callback: (
    input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    key: string,
  ) => void,
): void {
  if (node instanceof Element) {
    // For form elements
    if (node instanceof HTMLFormElement) {
      Array.from(node.elements).forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
    // For individual elements or container elements
    else {
      const inputElements = node.querySelectorAll("input, select, textarea");

      inputElements.forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
  }
}

export function checkElementVisibility(
  element: HTMLElement,
  window: Window,
  document: Document,
): boolean {
  const style = window.getComputedStyle(element);
  if (!style) return false;

  // Check if element has dimensions
  if (element.offsetWidth === 0 || element.offsetHeight === 0) return false;

  // Check if element is hidden via CSS
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0" ||
    Number.parseFloat(style.opacity) === 0
  )
    return false;

  // Check if element is detached from DOM
  if (!document.body.contains(element)) return false;

  // Check if any parent is hidden
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (
      parentStyle &&
      (parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        parentStyle.opacity === "0" ||
        Number.parseFloat(parentStyle.opacity) === 0)
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

export function getEventMap(
  element: HTMLElement,
): Map<string, Set<EventListener>> {
  if (!element._dequeryEvents) {
    element._dequeryEvents = new Map();
  }
  return element._dequeryEvents;
}

export function addElementEvent(
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
): void {
  const eventMap = getEventMap(element);

  if (!eventMap.has(eventType)) {
    eventMap.set(eventType, new Set());
  }

  eventMap.get(eventType)!.add(handler);
  element.addEventListener(eventType, handler);
}

export function removeElementEvent(
  element: HTMLElement,
  eventType: string,
  handler?: EventListener,
): void {
  const eventMap = getEventMap(element);

  if (!eventMap.has(eventType)) return;

  if (handler) {
    // remove specific handler
    if (eventMap.get(eventType)!.has(handler)) {
      element.removeEventListener(eventType, handler);
      eventMap.get(eventType)!.delete(handler);

      if (eventMap.get(eventType)!.size === 0) {
        eventMap.delete(eventType);
      }
    }
  } else {
    // remove all handlers for this event type
    eventMap.get(eventType)!.forEach((h: EventListener) => {
      element.removeEventListener(eventType, h);
    });
    eventMap.delete(eventType);
  }
}

export function clearElementEvents(element: HTMLElement): void {
  const eventMap = getEventMap(element);

  eventMap.forEach((handlers, eventType) => {
    handlers.forEach((handler: EventListener) => {
      element.removeEventListener(eventType, handler);
    });
  });

  eventMap.clear();
}

/**
 * Converts a DOM node to a VNode structure for use with updateDomWithVdom.
 * This allows us to leverage the sophisticated partial update system even for Node inputs.
 */
export function domNodeToVNode(node: Node): VNode<VNodeAttributes> | string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const attributes: VNodeAttributes = {};

    // Convert DOM attributes to VNode attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    // Convert child nodes recursively
    const children: (VNode<VNodeAttributes> | string)[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }

    return {
      type: element.tagName.toLowerCase(),
      attributes,
      children,
    };
  }

  // For other node types (comments, etc.), convert to empty string
  return "";
}

/**
 * Converts an HTML string to VNode structure for use with updateDomWithVdom.
 * This allows markup strings to benefit from the intelligent partial update system.
 */
export function htmlStringToVNodes(
  html: string,
  Parser: typeof DOMParser,
): (VNode<VNodeAttributes> | string)[] {
  const parser = new Parser();
  const doc = parser.parseFromString(html, "text/html");
  const vNodes: (VNode<VNodeAttributes> | string)[] = [];

  // Convert each child node in the body to a VNode
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }

  return vNodes;
}
