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
import {
  registerDelegatedEvent,
  removeDelegatedEvent,
  clearDelegatedEvents,
  clearDelegatedEventsDeep,
  getRegisteredEventKeys,
  removeDelegatedEventByKey,
  parseEventPropName,
} from "../render/delegated-events.js";
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

/********************************************************
 * 1) Define a "valid" child type & utilities
 ********************************************************/
export type ValidChild =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode<VNodeAttributes>;

function isTextLike(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isVNode(value: unknown): value is VNode<VNodeAttributes> {
  return Boolean(value && typeof value === "object" && "type" in (value as Record<string, unknown>));
}

function toValidChild(child: VNodeChild): ValidChild | undefined {
  if (child == null) return child; // null or undefined
  if (isTextLike(child)) return child;

  if (isVNode(child)) return child;

  // e.g. function or {} -> filter out
  return undefined;
}

/** fuse consecutive text-like nodes to preserve DOM stability (matches hydrate's behavior) */
function normalizeChildren(input: RenderInput): Array<ValidChild> {
  const raw: Array<ValidChild> = [];

  const pushChild = (child: unknown) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild);
      return;
    }

    const valid = toValidChild(child as VNodeChild);
    if (typeof valid === "undefined") return;

    // unwrap Fragment-ish nodes (defuss sometimes uses "fragment", some code uses "Fragment")
    if (isVNode(valid) && (valid.type === "fragment" || valid.type === "Fragment")) {
      const nested = Array.isArray(valid.children) ? valid.children : [];
      nested.forEach(pushChild);
      return;
    }

    // ignore booleans/null/undefined as render-nothing
    if (valid === null || typeof valid === "undefined" || typeof valid === "boolean") return;

    raw.push(valid);
  };

  pushChild(input);

  // fuse consecutive text nodes into a single string
  const fused: Array<ValidChild> = [];
  let buffer: string | null = null;

  const flush = () => {
    if (buffer !== null && buffer.length > 0) fused.push(buffer);
    buffer = null;
  };

  for (const child of raw) {
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      buffer = (buffer ?? "") + String(child);
      continue;
    }

    flush();
    fused.push(child);
  }

  flush();
  return fused;
}

function getVNodeMatchKey(child: ValidChild): string | null {
  if (!child || typeof child !== "object") return null;

  const key = child.attributes?.key;
  if (typeof key === "string" || typeof key === "number") return `k:${String(key)}`;

  const id = child.attributes?.id;
  if (typeof id === "string" && id.length > 0) return `id:${id}`;

  return null;
}

function getDomMatchKeys(node: Node): Array<string> {
  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  const el = node as HTMLElement;
  const keys: Array<string> = [];

  // prefer internal key storage, but also accept legacy `key` attribute if present
  const internalKey = (el as HTMLElement & { _defussKey?: string })._defussKey;
  if (internalKey) keys.push(`k:${internalKey}`);

  const attrKey = el.getAttribute("key");
  if (attrKey) keys.push(`k:${attrKey}`);

  const id = el.id;
  if (id) keys.push(`id:${id}`);

  return keys;
}

/********************************************************
 * 2) Check if a DOM node and a ValidChild match by type
 ********************************************************/
function areNodeAndChildMatching(domNode: Node, child: ValidChild): boolean {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return domNode.nodeType === Node.TEXT_NODE;
  }

  if (child && typeof child === "object") {
    if (domNode.nodeType !== Node.ELEMENT_NODE) return false;

    const el = domNode as HTMLElement;
    const oldTag = el.tagName.toLowerCase();
    const newTag = typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newTag || oldTag !== newTag) return false;

    // If vnode has class/className, require exact class match to prevent element reuse accidents
    const vnodeClass =
      (child.attributes as any)?.className ??
      (child.attributes as any)?.class;

    if (typeof vnodeClass === "string") {
      if ((el.getAttribute("class") ?? "") !== vnodeClass) return false;
    }

    return true;
  }

  return false;
}

/********************************************************
 * 3) Create brand new DOM node(s) from a ValidChild
 ********************************************************/
function createDomFromChild(
  child: ValidChild,
  globals: Globals,
): Node | Array<Node> | undefined {
  const renderer = getRenderer(globals.window.document);

  if (child == null) return undefined;

  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return globals.window.document.createTextNode(String(child));
  }

  // create without parent (we'll insert manually and run lifecycle hooks afterwards)
  const created = renderer.createElementOrElements(child) as Node | Array<Node> | undefined;

  if (!created) return undefined;
  return Array.isArray(created) ? (created as Array<Node>) : [created];
}

/********************************************************
 * 4) Patch an element node in place (attributes + children)
 ********************************************************/
function shouldPreserveFormStateAttribute(
  el: Element,
  attrName: string,
  vnode: VNode<VNodeAttributes>,
): boolean {
  const tag = el.tagName.toLowerCase();
  const hasExplicit = Object.prototype.hasOwnProperty.call(vnode.attributes ?? {}, attrName);

  if (hasExplicit) return false;

  // preserve uncontrolled input/textarea/select state unless explicitly controlled by VDOM
  if (tag === "input") return attrName === "value" || attrName === "checked";
  if (tag === "textarea") return attrName === "value";
  if (tag === "select") return attrName === "value";
  return false;
}

function patchElementInPlace(el: Element, vnode: VNode<VNodeAttributes>, globals: Globals): void {
  const renderer = getRenderer(globals.window.document);

  // remove old attributes not present (but preserve uncontrolled form state)
  const existingAttrs = Array.from(el.attributes);
  const nextAttrs = vnode.attributes ?? {};

  for (const attr of existingAttrs) {
    const { name } = attr;

    // do not remove internal key if it ever existed as attribute
    if (name === "key") continue;

    // do not remove event-ish attributes; handlers are delegated elsewhere
    if (name.startsWith("on")) continue;

    // treat class/className as equivalent
    if (name === "class" && (Object.prototype.hasOwnProperty.call(nextAttrs, "class") || Object.prototype.hasOwnProperty.call(nextAttrs, "className"))) {
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(nextAttrs, name)) {
      if (shouldPreserveFormStateAttribute(el, name, vnode)) continue;
      el.removeAttribute(name);
    }
  }

  // Remove stale event handlers: compute registered phase keys - next vnode phase keys
  // This is phase-aware: onClick + onClickCapture → onClickCapture only will correctly
  // remove the bubble handler while keeping the capture handler
  const registeredKeys = getRegisteredEventKeys(el as HTMLElement);
  const nextEventKeys = new Set<string>();
  for (const propName of Object.keys(nextAttrs)) {
    const parsed = parseEventPropName(propName);
    if (parsed) {
      const phase = parsed.capture ? "capture" : "bubble";
      nextEventKeys.add(`${parsed.eventType}:${phase}`);
    }
  }
  for (const key of registeredKeys) {
    if (!nextEventKeys.has(key)) {
      const [eventType, phase] = key.split(":");
      removeDelegatedEventByKey(el as HTMLElement, eventType, phase as "bubble" | "capture");
    }
  }

  // set new attributes (includes ref + delegated events via renderer.setAttribute)
  renderer.setAttributes(vnode, el);

  // Trigger onMount lifecycle for morphed elements that have a new onMount callback
  // This ensures onMount fires on route changes even when elements are morphed in place
  handleLifecycleEventsForOnMount(el as HTMLElement);

  // dangerouslySetInnerHTML => skip child reconciliation
  const d = vnode.attributes?.dangerouslySetInnerHTML;
  if (d && typeof d === "object" && typeof d.__html === "string") {
    el.innerHTML = d.__html;
    return;
  }

  const tag = el.tagName.toLowerCase();

  // preserve textarea live value unless explicitly controlled
  if (tag === "textarea") {
    const isControlled = Object.prototype.hasOwnProperty.call(nextAttrs, "value");
    const isActive = el.ownerDocument?.activeElement === el;
    if (isActive && !isControlled) return;
  }

  // reconcile children
  updateDomWithVdom(el, (vnode.children ?? []) as RenderInput, globals);
}

/********************************************************
 * 5) Morph a single DOM node to match a ValidChild
 ********************************************************/
function morphNode(domNode: Node, child: ValidChild, globals: Globals): Node | null {
  // text-like
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    const text = String(child);

    if (domNode.nodeType === Node.TEXT_NODE) {
      if (domNode.nodeValue !== text) domNode.nodeValue = text;
      return domNode;
    }

    const next = globals.window.document.createTextNode(text);
    domNode.parentNode?.replaceChild(next, domNode);
    return next;
  }

  // element-like (VNode)
  if (child && typeof child === "object") {
    const newType = typeof child.type === "string" ? child.type : null;
    if (!newType) return domNode;

    if (domNode.nodeType !== Node.ELEMENT_NODE) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;

      domNode.parentNode?.replaceChild(first, domNode);
      handleLifecycleEventsForOnMount(first as HTMLElement);
      return first;
    }

    const el = domNode as Element;
    const oldTag = el.tagName.toLowerCase();
    const newTag = newType.toLowerCase();

    if (oldTag !== newTag) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;

      el.parentNode?.replaceChild(first, el);
      handleLifecycleEventsForOnMount(first as HTMLElement);
      return first;
    }

    patchElementInPlace(el, child as VNode<VNodeAttributes>, globals);
    return el;
  }

  // null/undefined => remove
  domNode.parentNode?.removeChild(domNode);
  return null;
}

/********************************************************
 * 6) Main state-preserving morph (key/id aware, move-not-replace)
 ********************************************************/
export function updateDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
): void {
  // If element has shadow DOM, update shadow root instead of light DOM
  // This fixes the shadow DOM update bug where updates created duplicates
  const targetRoot: ParentNode & Node =
    (parentElement as HTMLElement).shadowRoot ?? parentElement;

  const nextChildren = normalizeChildren(newVDOM);

  // snapshot existing children once for matching pools
  const existing = Array.from(targetRoot.childNodes);

  const keyedPool = new Map<string, Node>();
  const nodeKeys = new WeakMap<Node, Array<string>>();
  const unkeyedPool: Array<Node> = [];

  for (const node of existing) {
    const keys = getDomMatchKeys(node);
    if (keys.length > 0) {
      nodeKeys.set(node, keys);
      for (const k of keys) {
        if (!keyedPool.has(k)) keyedPool.set(k, node);
      }
    } else {
      unkeyedPool.push(node);
    }
  }

  const consumeKeyedNode = (node: Node) => {
    const keys = nodeKeys.get(node) ?? [];
    for (const k of keys) keyedPool.delete(k);
  };

  const takeUnkeyedMatch = (child: ValidChild): Node | undefined => {
    // try to find a compatible node (preserves focus/state by moving instead of replacing)
    for (let i = 0; i < unkeyedPool.length; i++) {
      const candidate = unkeyedPool[i];
      if (areNodeAndChildMatching(candidate, child)) {
        unkeyedPool.splice(i, 1);
        return candidate;
      }
    }

    // SAFE: no match => don't reuse something random, create new node instead
    return undefined;
  };

  let domIndex = 0;

  for (const child of nextChildren) {
    const key = getVNodeMatchKey(child);

    let match: Node | undefined;

    if (key) {
      match = keyedPool.get(key);
      if (match) consumeKeyedNode(match);
    } else {
      match = takeUnkeyedMatch(child);
    }

    const anchor = targetRoot.childNodes[domIndex] ?? null;

    if (match) {
      // move node into place (preserves identity/state)
      if (match !== anchor) {
        targetRoot.insertBefore(match, anchor);
      }

      const morphed = morphNode(match, child, globals);

      // if morphNode replaced it, ensure we still have the correct node at domIndex
      if (morphed && morphed !== match) {
        // replacement already occurred in-place, nothing else to do
      }

      domIndex++;
      continue;
    }

    // no match => create and insert
    const created = createDomFromChild(child, globals);
    if (!created || (Array.isArray(created) && created.length === 0)) continue;

    const nodes = Array.isArray(created) ? created : [created];
    for (const node of nodes) {
      targetRoot.insertBefore(node, anchor);
      handleLifecycleEventsForOnMount(node as HTMLElement);
      domIndex++;
    }
  }

  // remove remaining unmatched nodes (both keyed leftovers and unkeyed leftovers)
  const remaining = new Set<Node>();

  for (const node of unkeyedPool) remaining.add(node);
  for (const node of keyedPool.values()) remaining.add(node);

  for (const node of remaining) {
    if (node.parentNode === targetRoot) {
      // Clear delegated events before removal to prevent handler leaks
      if (node instanceof HTMLElement) {
        clearDelegatedEventsDeep(node);
      }
      targetRoot.removeChild(node);
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

  const newDom = renderer.createElementOrElements(
    newVDOM as VNode | undefined | Array<VNode | undefined | string>,
  );

  // 3) Append the newly created node(s)
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) {
        parentElement.appendChild(node);
        handleLifecycleEventsForOnMount(node as HTMLElement);
      }
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
    handleLifecycleEventsForOnMount(newDom as HTMLElement);
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
  // Use delegated events for unified event handling (NEW ALGO)
  // multi: true allows multiple handlers per element (Dequery mode)
  registerDelegatedEvent(element, eventType, handler, { multi: true });
}

export function removeElementEvent(
  element: HTMLElement,
  eventType: string,
  handler?: EventListener,
): void {
  // Remove from delegation registry
  removeDelegatedEvent(element, eventType, handler);
}

export function clearElementEvents(element: HTMLElement): void {
  clearDelegatedEvents(element);
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
    const children: Array<VNode<VNodeAttributes> | string> = [];
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
): Array<VNode<VNodeAttributes> | string> {
  const parser = new Parser();
  const doc = parser.parseFromString(html, "text/html");
  const vNodes: Array<VNode<VNodeAttributes> | string> = [];

  // Convert each child node in the body to a VNode
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }

  return vNodes;
}
