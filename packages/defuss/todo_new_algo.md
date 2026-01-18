```ts
// src/render/delegated-events.ts
export type DelegatedPhase = "bubble" | "capture";

export interface DelegatedEventOptions {
  capture?: boolean;
}

export interface ParsedEventProp {
  eventType: string;
  capture: boolean;
}

/** non-bubbling events best handled via capture */
export const CAPTURE_ONLY_EVENTS = new Set<string>([
  "focus",
  "blur",
  "scroll",
  "mouseenter",
  "mouseleave",
  "focusin",
  "focusout",
]);

/** element -> (eventType -> handlers) */
const elementHandlerMap = new WeakMap<
  HTMLElement,
  Map<string, { bubble?: EventListener; capture?: EventListener }>
>();

/** document -> installed listener keys ("click:bubble", "focus:capture", ...) */
const installedDocListeners = new WeakMap<Document, Set<string>>();

export const parseEventPropName = (propName: string): ParsedEventProp | null => {
  if (!propName.startsWith("on")) return null;

  // support onClick / onClickCapture / onclick / onclickcapture
  const raw = propName.slice(2);
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const isCapture = lower.endsWith("capture");

  const eventType = isCapture ? lower.slice(0, -"capture".length) : lower;

  if (!eventType) return null;

  return { eventType, capture: isCapture };
};

const getOrCreateElementHandlers = (el: HTMLElement) => {
  const existing = elementHandlerMap.get(el);
  if (existing) return existing;

  const created = new Map<string, { bubble?: EventListener; capture?: EventListener }>();
  elementHandlerMap.set(el, created);
  return created;
};

const getEventPath = (event: Event): Array<EventTarget> => {
  // composedPath is best (works with shadow DOM)
  const composedPath = (event as Event & { composedPath?: () => Array<EventTarget> })
    .composedPath?.();
  if (composedPath && composedPath.length > 0) return composedPath;

  // fallback: walk up from target
  const path: Array<EventTarget> = [];
  let node: unknown = event.target;

  while (node) {
    path.push(node as EventTarget);

    // walk DOM parents
    const maybeNode = node as Node;
    if (typeof maybeNode === "object" && maybeNode && "parentNode" in maybeNode) {
      node = (maybeNode as Node).parentNode;
      continue;
    }

    break;
  }

  // ensure document/window are at the end if available
  const doc = (event.target as Node | null)?.ownerDocument;
  if (doc && path[path.length - 1] !== doc) path.push(doc);
  const win = doc?.defaultView;
  if (win && path[path.length - 1] !== win) path.push(win);

  return path;
};

const ensureDocumentListener = (doc: Document, eventType: string, phase: DelegatedPhase) => {
  const installed = installedDocListeners.get(doc) ?? new Set<string>();
  installedDocListeners.set(doc, installed);

  const key = `${eventType}:${phase}`;
  if (installed.has(key)) return;

  const useCapture = phase === "capture";

  // single delegating handler for this doc+eventType+phase
  const handler: EventListener = (event) => {
    const path = getEventPath(event).filter(
      (t): t is HTMLElement => typeof t === "object" && t !== null && (t as HTMLElement).nodeType === Node.ELEMENT_NODE,
    );

    const ordered =
      phase === "capture" ? [...path].reverse() : path;

    for (const target of ordered) {
      const handlersByEvent = elementHandlerMap.get(target);
      if (!handlersByEvent) continue;

      const entry = handlersByEvent.get(eventType);
      if (!entry) continue;

      const fn = phase === "capture" ? entry.capture : entry.bubble;
      if (!fn) continue;

      fn.call(target, event);

      // respect stopPropagation semantics
      if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
    }
  };

  doc.addEventListener(eventType, handler, useCapture);
  installed.add(key);
};

export const registerDelegatedEvent = (
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
  options: DelegatedEventOptions = {},
): void => {
  const doc = element.ownerDocument ?? globalThis.document;

  // capture-only events should be forced to capture
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);

  ensureDocumentListener(doc, eventType, capture ? "capture" : "bubble");

  const byEvent = getOrCreateElementHandlers(element);
  const entry = byEvent.get(eventType) ?? {};
  byEvent.set(eventType, entry);

  // jsx-style semantics: one handler per prop, overwrite to prevent duplicates
  if (capture) {
    entry.capture = handler;
  } else {
    entry.bubble = handler;
  }
};

export const removeDelegatedEvent = (
  element: HTMLElement,
  eventType: string,
  options: DelegatedEventOptions = {},
): void => {
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return;

  const entry = byEvent.get(eventType);
  if (!entry) return;

  if (capture) {
    entry.capture = undefined;
  } else {
    entry.bubble = undefined;
  }

  if (!entry.capture && !entry.bubble) {
    byEvent.delete(eventType);
  }
};

export const clearDelegatedEvents = (element: HTMLElement): void => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return;

  byEvent.clear();
};
```

```ts
// src/common/dom.ts
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

    const oldTag = (domNode as Element).tagName.toLowerCase();
    const newType = typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newType) return false;

    return oldTag === newType;
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

  // set new attributes (includes ref + delegated events via renderer.setAttribute)
  renderer.setAttributes(vnode, el);

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
      const first = created?.[0];
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
      const first = created?.[0];
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
  const nextChildren = normalizeChildren(newVDOM);

  // snapshot existing children once for matching pools
  const existing = Array.from(parentElement.childNodes);

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

    // fallback: take the next available unkeyed node
    return unkeyedPool.shift();
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

    const anchor = parentElement.childNodes[domIndex] ?? null;

    if (match) {
      // move node into place (preserves identity/state)
      if (match !== anchor) {
        parentElement.insertBefore(match, anchor);
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
    if (!created || created.length === 0) continue;

    for (const node of created) {
      parentElement.insertBefore(node, anchor);
      handleLifecycleEventsForOnMount(node as HTMLElement);
      domIndex++;
    }
  }

  // remove remaining unmatched nodes (both keyed leftovers and unkeyed leftovers)
  const remaining = new Set<Node>();

  for (const node of unkeyedPool) remaining.add(node);
  for (const node of keyedPool.values()) remaining.add(node);

  for (const node of remaining) {
    if (node.parentNode === parentElement) {
      parentElement.removeChild(node);
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
```

```ts
// src/render/isomorph.setAttribute.ts (drop-in replacement for renderer.setAttribute in src/render/isomorph.ts)
// replace ONLY the renderer.setAttribute implementation with this one.

import { queueCallback } from "../common/queue.js";
import {
  CLASS_ATTRIBUTE_NAME,
  DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE,
  REF_ATTRIBUTE_NAME,
  XLINK_ATTRIBUTE_NAME,
  XMLNS_ATTRIBUTE_NAME,
} from "./isomorph.js";
import type { VNode, VNodeAttributes } from "./types.js";
import { observeUnmount } from "./isomorph.js";
import { registerDelegatedEvent, parseEventPropName } from "./delegated-events.js";

export const setAttributeDelegated = (
  name: string,
  value: unknown,
  domElement: Element,
  virtualNode: VNode<VNodeAttributes>,
  nsMap: Record<string, string>,
) => {
  // attributes not set (undefined) are ignored; use null value to reset an attributes state
  if (typeof value === "undefined") return;

  if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return;

  // internal list key: store on element, do not serialize into DOM
  if (name === "key") {
    (domElement as HTMLElement & { _defussKey?: string })._defussKey = String(value);
    return;
  }

  // save ref as { current: DOMElement } in ref object
  if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
    const ref = value as { current?: unknown; orphan?: boolean };
    ref.current = domElement;
    (domElement as HTMLElement)._defussRef = value as any;

    (domElement as any).$onUnmount = queueCallback(() => {
      // value.orphan = true;
    });

    if (domElement.parentNode) {
      observeUnmount(domElement, (domElement as any).$onUnmount);
    } else {
      queueMicrotask(() => {
        if (domElement.parentNode) {
          observeUnmount(domElement, (domElement as any).$onUnmount);
        }
      });
    }
    return;
  }

  // event props: delegate globally; still keep defuss lifecycle hooks
  const parsed = parseEventPropName(name);
  if (parsed && typeof value === "function") {
    const { eventType, capture } = parsed;

    if (eventType === "mount") {
      (domElement as any).$onMount = queueCallback(value as () => void);
      return;
    }

    if (eventType === "unmount") {
      if ((domElement as any).$onUnmount) {
        const existingUnmount = (domElement as any).$onUnmount as () => void;
        (domElement as any).$onUnmount = () => {
          existingUnmount();
          (value as () => void)();
        };
      } else {
        (domElement as any).$onUnmount = queueCallback(value as () => void);
      }
      return;
    }

    registerDelegatedEvent(domElement as HTMLElement, eventType, value as EventListener, { capture });
    return;
  }

  // transforms className="..." -> class="..."
  if (name === "className") {
    name = CLASS_ATTRIBUTE_NAME;
  }

  // transforms class={['a', 'b']} into class="a b"
  if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
    value = value.join(" ");
  }

  // SVG support
  const nsEndIndex = name.match(/[A-Z]/)?.index;
  if ((domElement as Element).namespaceURI === nsMap.svg && nsEndIndex) {
    const ns = name.substring(0, nsEndIndex).toLowerCase();
    const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
    const namespace = nsMap[ns as keyof typeof nsMap] || null;
    domElement.setAttributeNS(
      namespace,
      ns === XLINK_ATTRIBUTE_NAME || ns === XMLNS_ATTRIBUTE_NAME
        ? `${ns}:${attrName}`
        : name,
      String(value),
    );
  } else if (name === "style" && typeof value !== "string") {
    const styleObj = value as Record<string, string | number>;
    for (const prop of Object.keys(styleObj)) {
      (domElement as HTMLElement).style[prop as any] = String(styleObj[prop]);
    }
  } else if (typeof value === "boolean") {
    (domElement as any)[name] = value;
  } else {
    domElement.setAttribute(name, String(value));
  }
};
```

```ts
// src/render/client.hydrate-events.ts (drop-in replacement for the event binding loop in hydrate() in src/render/client.ts)
// replace ONLY the "attach event listeners" loop with this one.

import type { VNode } from "./types.js";
import { parseEventPropName, registerDelegatedEvent } from "./delegated-events.js";

export const hydrateAttachDelegatedEvents = (vnode: VNode, element: HTMLElement) => {
  const attrs = vnode.attributes ?? {};
  for (const key of Object.keys(attrs)) {
    if (key === "ref") continue;

    const value = attrs[key];

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
};
```

```ts
// src/render/isomorph.createElement.dangerouslySetInnerHTML.ts (drop-in replacement snippet)
// in src/render/isomorph.ts inside renderer.createElement(), replace the dangerouslySetInnerHTML block with this:

// apply dangerouslySetInnerHTML if provided
if (virtualNode.attributes.dangerouslySetInnerHTML) {
  (newEl as HTMLElement).innerHTML = virtualNode.attributes.dangerouslySetInnerHTML.__html;
}
```

```ts
// src/common/dom.morph.test.ts
import { describe, expect, it } from "vitest";
import type { Globals } from "../render/types.js";
import { renderSync } from "../render/client.js";
import { updateDomWithVdom } from "./dom.js";

const App = ({ items }: { items: Array<string> }) => {
  return (
    <ul>
      {items.map((id) => (
        <li key={id}>
          <input id={`i-${id}`} />
          <span>{id}</span>
        </li>
      ))}
    </ul>
  );
};

describe("updateDomWithVdom (state-preserving morph)", () => {
  it("preserves element identity and focus on keyed reorders", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    renderSync(<App items={["a", "b", "c"]} />, container);

    const inputB = document.querySelector("#i-b") as HTMLInputElement;
    inputB.value = "hello";
    inputB.focus();
    inputB.setSelectionRange(2, 2);

    updateDomWithVdom(container, <App items={["c", "b", "a", "d"]} />, globalThis as unknown as Globals);

    const inputBAfter = document.querySelector("#i-b") as HTMLInputElement;

    expect(inputBAfter).toBe(inputB);
    expect(document.activeElement).toBe(inputB);
    expect(inputB.value).toBe("hello");
  });

  it("does not duplicate event handlers across repeated updates (delegated events)", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let calls = 0;

    const Button = ({ label }: { label: string }) => {
      return <button id="btn" onClick={() => (calls += 1)}>{label}</button>;
    };

    renderSync(<Button label="a" />, container);

    // re-render several times; old implementation would stack addEventListener
    updateDomWithVdom(container, <Button label="b" />, globalThis as any);
    updateDomWithVdom(container, <Button label="c" />, globalThis as any);
    updateDomWithVdom(container, <Button label="d" />, globalThis as any);

    const btn = document.querySelector("#btn") as HTMLButtonElement;
    btn.dispatchEvent(new Event("click", { bubbles: true, cancelable: true }));

    expect(calls).toBe(1);
  });
});
```

---

### Why this fixes the issues (key reasoning)

* **No more “zombie refs”**: `updateDomWithVdom()` now **moves** matching nodes (by `key` / `id`) via `insertBefore` and patches them in place, instead of replacing whole subtrees. Your stored refs keep pointing at the **same live DOM objects**.
* **State preservation**: moving existing nodes preserves focus/selection/scroll far better than replace-by-index. Uncontrolled form state (e.g. `input.value`) is preserved unless the VDOM explicitly controls it.
* **No listener explosions**: framework JSX event props are now handled via **global event delegation** (`delegated-events.ts`) and **overwrite** semantics (one handler per prop). Re-rendering won’t stack `addEventListener()` duplicates.

If you want, I can also apply the same delegated-event wiring to `hydrate()` end-to-end (I gave you the exact drop-in for the event loop) and optionally switch `dequery().on()` to delegation too—but the changes above already fix the core “update breaks refs + leaks events” pathology described in your analysis.
