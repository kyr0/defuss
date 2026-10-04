import type {
  Globals,
  RenderInput,
  VNode,
  VNodeAttributes,
  VNodeChild,
} from "./types.js";
import {
  getRenderer,
  handleLifecycleEventsForOnMount,
} from "./renderer.js";
import { isCommentVNode } from "./html.js";
import {
  clearDelegatedEventsDeep,
  getRegisteredEventKeys,
  parseEventPropName,
  removeDelegatedEventByKey,
} from "./delegated-events.js";
import { FROM_DOM_MARKER } from "./html.js";

/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text and Comment nodes, compares their data.
 */
export const areDomNodesEqual = (oldNode: Node, newNode: Node): boolean => {
  // return true if both references are identical
  if (oldNode === newNode) return true;

  // compare node types
  if (oldNode.nodeType !== newNode.nodeType) return false;

  // handle Element nodes
  if (oldNode.nodeType === 1 /* Node.ELEMENT_NODE */) {
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

  // handle Text and Comment nodes
  if (
    oldNode.nodeType === 3 /* Node.TEXT_NODE */ ||
    oldNode.nodeType === 8 /* Node.COMMENT_NODE */
  ) {
    if (oldNode.nodeValue !== newNode.nodeValue) return false;
  }
  return true;
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

/**
 * How top-level children are reconciled:
 * - `"replace"` (default): full reconciliation — unmentioned nodes are removed.
 * - `"diff"`: partial updates — only patch items addressed by `key`/`id` are
 *   applied (attributes merge, new items append, unmentioned nodes untouched).
 */
export type MorphMode = "replace" | "diff";

function isTextLike(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isVNode(value: unknown): value is VNode<VNodeAttributes> {
  return Boolean(
    value &&
    typeof value === "object" &&
    "type" in (value as Record<string, unknown>),
  );
}

function toValidChild(
  child: VNodeChild,
  // diff mode: a partial patch item may omit `type` (borrowed from the node
  // it addresses) — `{ attributes: ... }` alone is a valid patch object there
  lenient = false,
): ValidChild | undefined {
  if (child == null) return child; // null or undefined
  if (isTextLike(child)) return child;

  if (isVNode(child)) return child;

  if (
    lenient &&
    child &&
    typeof child === "object" &&
    "attributes" in (child as Record<string, unknown>)
  )
    return child as unknown as ValidChild;

  // e.g. function or {} -> filter out
  return undefined;
}

/** fuse consecutive text-like nodes to preserve DOM stability (matches hydrate's behavior) */
function normalizeChildren(
  input: RenderInput,
  lenient = false,
): Array<ValidChild> {
  const raw: Array<ValidChild> = [];

  const pushChild = (child: unknown) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild);
      return;
    }

    const valid = toValidChild(child as VNodeChild, lenient);
    if (typeof valid === "undefined") return;

    // unwrap Fragment-ish nodes (defuss sometimes uses "fragment", some code uses "Fragment")
    if (
      isVNode(valid) &&
      (valid.type === "fragment" || valid.type === "Fragment")
    ) {
      const nested = Array.isArray(valid.children) ? valid.children : [];
      nested.forEach(pushChild);
      return;
    }

    // ignore booleans/null/undefined as render-nothing
    if (
      valid === null ||
      typeof valid === "undefined" ||
      typeof valid === "boolean"
    )
      return;

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
    if (
      typeof child === "string" ||
      typeof child === "number" ||
      typeof child === "boolean"
    ) {
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
  if (typeof key === "string" || typeof key === "number")
    return `k:${String(key)}`;

  const id = child.attributes?.id;
  if (typeof id === "string" && id.length > 0) return `id:${id}`;

  return null;
}

/** human-readable item description for diff-mode error messages */
function describePatchItem(child: ValidChild): string {
  if (child && typeof child === "object") {
    return `<${typeof child.type === "string" ? child.type : "component"}>`;
  }
  return "plain text";
}

function getDomMatchKeys(node: Node): Array<string> {
  if (node.nodeType !== 1 /* Node.ELEMENT_NODE */) return [];

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
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return domNode.nodeType === 3 /* Node.TEXT_NODE */;
  }

  if (isCommentVNode(child)) return domNode.nodeType === 8 /* Node.COMMENT_NODE */;

  if (child && typeof child === "object") {
    if (domNode.nodeType !== 1 /* Node.ELEMENT_NODE */) return false;

    const el = domNode as HTMLElement;
    const oldTag = el.tagName.toLowerCase();
    const newTag =
      typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newTag || oldTag !== newTag) return false;

    // Match only by tag name - class changes should be handled by patchElementInPlace
    // This prevents node churn when classes are toggled (e.g., "danger" on selection)
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
): Array<Node> | undefined {
  const renderer = getRenderer(globals.window.document);

  if (child == null) return undefined;

  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return [globals.window.document.createTextNode(String(child))];
  }

  // create without parent (we'll insert manually and run lifecycle hooks afterwards)
  const created = renderer.createElementOrElements(child) as
    | Node
    | Array<Node>
    | undefined;

  if (!created) return undefined;
  const nodes = Array.isArray(created) ? created : [created];
  return nodes.filter(Boolean) as Array<Node>;
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
  const hasExplicit = Object.hasOwn(vnode.attributes ?? {}, attrName);

  if (hasExplicit) return false;

  // preserve uncontrolled input/textarea/select state unless explicitly controlled by VDOM
  if (tag === "input") return attrName === "value" || attrName === "checked";
  if (tag === "textarea") return attrName === "value";
  if (tag === "select") return attrName === "value";
  return false;
}

function patchElementInPlace(
  el: Element,
  vnode: VNode<VNodeAttributes>,
  globals: Globals,
  // diff mode: the vnode is a partial patch — undeclared attributes and
  // delegated handlers are "not mentioned", never "unset", so removal is skipped
  mergeAttributes = false,
): void {
  const renderer = getRenderer(globals.window.document);

  // remove old attributes not present (but preserve uncontrolled form state)
  const existingAttrs = mergeAttributes ? [] : Array.from(el.attributes);
  const nextAttrs = vnode.attributes ?? {};

  for (const attr of existingAttrs) {
    const { name } = attr;

    // do not remove internal key if it ever existed as attribute
    if (name === "key") continue;

    // do not remove event-ish attributes; handlers are delegated elsewhere
    if (name.startsWith("on")) continue;

    // treat class/className as equivalent
    if (
      name === "class" &&
      (Object.hasOwn(nextAttrs, "class") ||
        Object.hasOwn(nextAttrs, "className"))
    ) {
      continue;
    }

    if (!Object.hasOwn(nextAttrs, name)) {
      if (shouldPreserveFormStateAttribute(el, name, vnode)) continue;
      el.removeAttribute(name);
    }
  }

  // Remove stale event handlers: compute registered phase keys - next vnode phase keys
  // This is phase-aware: onClick + onClickCapture → onClickCapture only will correctly
  // remove the bubble handler while keeping the capture handler.
  // Skipped for DOM-derived vnodes (HTML strings / DOM nodes): those cannot declare
  // handlers, so existing delegated handlers are preserved like uncontrolled form state.
  const preserveDelegatedHandlers =
    mergeAttributes ||
    Boolean((nextAttrs as Record<PropertyKey, unknown>)[FROM_DOM_MARKER]);

  if (!preserveDelegatedHandlers) {
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
        removeDelegatedEventByKey(
          el as HTMLElement,
          eventType,
          phase as "bubble" | "capture",
        );
      }
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
    const isControlled = Object.hasOwn(nextAttrs, "value");
    const isActive = el.ownerDocument?.activeElement === el;
    if (isActive && !isControlled) return;
  }

  // diff mode: children are "not mentioned" unless explicitly declared, so an
  // attributes-only patch item must not clear the node's existing children.
  // HTML-derived vnodes always carry a (possibly empty) children array —
  // empty means "undeclared" there, exactly like absent form attributes.
  // VNode/JSX input keeps the distinction: children: [] clears explicitly.
  if (
    mergeAttributes &&
    (vnode.children === undefined ||
      (vnode.children.length === 0 &&
        (nextAttrs as Record<PropertyKey, unknown>)[FROM_DOM_MARKER]))
  )
    return;

  // reconcile children (direct call - bypasses morph guard for internal recursion)
  morphDomDirect(el, (vnode.children ?? []) as RenderInput, globals);
}

/********************************************************
 * 5) Morph a single DOM node to match a ValidChild
 ********************************************************/

/**
 * Swap `next` in for `old`, clearing the old subtree's handlers first — the
 * same teardown as removal, so delegated handlers and facade listeners
 * (onClearDelegatedEvents hooks) never outlive a replaced element.
 * VERIFIED: a keyed tag change tears down on() listeners (suite.browser.test.ts)
 */
function replaceNode(old: Node, next: Node): void {
  if (old.nodeType === 1 /* Node.ELEMENT_NODE */)
    clearDelegatedEventsDeep(old as HTMLElement);
  old.parentNode?.replaceChild(next, old);
}
function morphNode(
  domNode: Node,
  child: ValidChild,
  globals: Globals,
  mergeAttributes = false,
): Node | null {
  // text-like
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    const text = String(child);

    if (domNode.nodeType === 3 /* Node.TEXT_NODE */) {
      if (domNode.nodeValue !== text) domNode.nodeValue = text;
      return domNode;
    }

    const next = globals.window.document.createTextNode(text);
    replaceNode(domNode, next);
    return next;
  }

  // comment: patch data in place, like text
  if (isCommentVNode(child)) {
    const data = child.value ?? "";

    if (domNode.nodeType === 8 /* Node.COMMENT_NODE */) {
      if (domNode.nodeValue !== data) domNode.nodeValue = data;
      return domNode;
    }

    const next = globals.window.document.createComment(data);
    replaceNode(domNode, next);
    return next;
  }

  // element-like (VNode)
  if (child && typeof child === "object") {
    const newType = typeof child.type === "string" ? child.type : null;
    if (!newType) return domNode;

    if (domNode.nodeType !== 1 /* Node.ELEMENT_NODE */) {
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

      replaceNode(el, first);
      handleLifecycleEventsForOnMount(first as HTMLElement);
      return first;
    }

    patchElementInPlace(el, child as VNode<VNodeAttributes>, globals, mergeAttributes);
    return el;
  }

  // null/undefined => remove
  if (domNode.nodeType === 1 /* Node.ELEMENT_NODE */)
    clearDelegatedEventsDeep(domNode as HTMLElement);
  domNode.parentNode?.removeChild(domNode);
  return null;
}

/********************************************************
 * 6) Morph guard - tags DOM subtrees as "rendering" to prevent
 *    re-entrant / conflicting morphs on the same or ancestor nodes.
 *    Unrelated subtrees morph in parallel without blocking.
 ********************************************************/
const renderingNodes = new WeakSet<Element>();
const pendingMorphs = new Map<
  Element,
  { vdom: RenderInput; globals: Globals; mode: MorphMode }
>();

/**
 * Resolve the render globals from an element's own document when not given
 * explicitly (isomorphic: browser window, happy-dom window, multi-document).
 */
export const resolveGlobals = (el?: Element, globals?: Globals): Globals => {
  if (globals) return globals;
  const win = (el?.ownerDocument?.defaultView ??
    globalThis) as unknown as Globals;
  return { window: win } as unknown as Globals;
};

function isAncestorRendering(el: Element): boolean {
  let current = el.parentElement;
  while (current) {
    if (renderingNodes.has(current)) return true;
    current = current.parentElement;
  }
  return false;
}

function flushPendingMorphs(): void {
  if (pendingMorphs.size === 0) return;

  // Snapshot and clear to avoid infinite loops if flush triggers more morphs
  const snapshot = [...pendingMorphs.entries()];
  pendingMorphs.clear();

  for (const [el, { vdom, globals, mode }] of snapshot) {
    // Skip if element was detached during parent morph
    if (!el.isConnected) continue;
    // Re-enter through guarded path (handles nested conflicts)
    updateDomWithVdom(el, vdom, globals, mode);
  }
}

/**
 * Guarded entry point for DOM morphing.
 *
 * If the target element (or an ancestor) is already being morphed,
 * the render is queued (latest-wins) and replayed after the active
 * morph finishes.  Morphs on unrelated subtrees proceed immediately
 * without blocking - conflict-free parallel rendering.
 *
 * `globals` is optional: it is derived from `parentElement.ownerDocument`
 * when omitted.
 *
 * `mode` defaults to `"replace"` (full reconciliation). Pass `"diff"` for
 * partial updates: only `key`/`id`-addressed patch items are applied
 * (attributes merged, new keyed items appended, unmentioned nodes untouched).
 */
export function updateDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals?: Globals,
  mode: MorphMode = "replace",
): void {
  const resolvedGlobals = resolveGlobals(parentElement, globals);

  // Re-entrant or ancestor conflict → queue latest, return
  if (renderingNodes.has(parentElement) || isAncestorRendering(parentElement)) {
    pendingMorphs.set(parentElement, {
      vdom: newVDOM,
      globals: resolvedGlobals,
      mode,
    });
    return;
  }

  renderingNodes.add(parentElement);
  try {
    morphDomDirect(parentElement, newVDOM, resolvedGlobals, mode);
  } finally {
    renderingNodes.delete(parentElement);
  }

  // Flush any morphs that were queued during this render
  flushPendingMorphs();
}

/********************************************************
 * 6b) Diff mode — partial change-sets (patch + append only)
 ********************************************************/
/**
 * Apply a partial change-set to `targetRoot`: every top-level item must be an
 * element addressed by `key` (preferred) or `id`. Matched nodes are patched in
 * place with attributes *merged* (undeclared attributes, delegated handlers
 * and children stay untouched); unmatched items are appended as new nodes.
 * Nothing else changes: unmentioned siblings keep identity, order and state —
 * diff mode never removes and never moves, so addressing is unambiguous.
 *
 * Why: stream/AI-driven partial updates without resending the whole subtree.
 * Tag changes on an addressed node are applied as an honest in-place
 * replacement (the item fully declares that node).
 */
function morphDiff(
  targetRoot: ParentNode & Node,
  patchItems: Array<ValidChild>,
  globals: Globals,
): void {
  // first-wins keyed pool of the current children — diff never removes, so
  // duplicate keys can simply share the first node as the address owner
  const keyedPool = new Map<string, Node>();
  for (const node of Array.from(targetRoot.childNodes)) {
    for (const k of getDomMatchKeys(node)) {
      if (!keyedPool.has(k)) keyedPool.set(k, node);
    }
  }

  for (const item of patchItems) {
    // formatting whitespace between change-set items (e.g. newlines + indent
    // in a template literal) parses to text nodes but carries no meaning —
    // skip it; only *meaningful* plain text is unaddressable and throws
    if (typeof item === "string" && item.trim() === "") continue;

    // top-level comments in a change-set are annotations with no address:
    // diff never removes or moves, and appending would duplicate them on
    // every repeated patch — skip them (comments *inside* items do morph).
    // VERIFIED: a repeated commented patch leaves no duplicates (morph-comments.test.ts)
    if (isCommentVNode(item)) continue;

    // booleans/null are already filtered by normalizeChildren; anything
    // without a key/id (incl. plain text) cannot be addressed unambiguously
    const key = getVNodeMatchKey(item);

    if (!key) {
      throw new Error(
        `morph diff: patch items must be elements with a key or id attribute (got ${describePatchItem(item)})`,
      );
    }

    const match = keyedPool.get(key);

    if (match) {
      // Tag-less patch items are pure patches: borrow the addressed node's
      // tag (only *new* items need one — to create it). An explicitly
      // different tag still replaces the node.
      const patchItem =
        item && typeof item === "object" && !(item as VNode).type
          ? { ...item, type: (match as Element).tagName.toLowerCase() }
          : item;

      // same tag -> attribute merge (+ declared children); tag change ->
      // in-place replacement by morphNode; mergeAttributes keeps the diff
      // contract (no attribute/handler removal) either way
      morphNode(match, patchItem, globals, true);
      continue;
    }

    if (!(item as VNode)?.type) {
      throw new Error(
        `morph diff: new (unmatched) patch items must declare a tag (type), got key/id "${key}"`,
      );
    }

    // new keyed item -> append (never inserted "in order" implicitly: moving
    // or positioning unmentioned siblings would be a guess)
    const created = createDomFromChild(item, globals) ?? [];
    for (const node of created) {
      targetRoot.appendChild(node);
      handleLifecycleEventsForOnMount(node as HTMLElement);
    }
  }
}

/********************************************************
 * 7) Raw morph implementation (key/id aware, move-not-replace)
 *    Called directly by the guard and by internal recursive
 *    child reconciliation (patchElementInPlace).
 ********************************************************/
function morphDomDirect(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
  mode: MorphMode = "replace",
): void {
  // Custom elements (hyphenated tags) use light DOM for slotted content.
  // Other elements with shadowRoot should target the shadow root.
  const el = parentElement as HTMLElement;
  const isCustomElement = el.tagName.includes("-");
  const targetRoot: ParentNode & Node =
    el.shadowRoot && !isCustomElement ? el.shadowRoot : parentElement;

  const nextChildren = normalizeChildren(newVDOM, mode === "diff");

  if (mode === "diff") {
    morphDiff(targetRoot, nextChildren, globals);
    return;
  }

  // snapshot existing children once for matching pools
  const existing = Array.from(targetRoot.childNodes);

  const keyedPool = new Map<string, Node>();
  const nodeKeys = new WeakMap<Node, Array<string>>();
  const unkeyedPool: Array<Node> = [];

  for (const node of existing) {
    const keys = getDomMatchKeys(node);
    if (keys.length > 0) {
      nodeKeys.set(node, keys);
      let addedToKeyedPool = false;
      for (const k of keys) {
        if (!keyedPool.has(k)) {
          keyedPool.set(k, node);
          addedToKeyedPool = true;
        }
      }
      // all keys duplicates of already-pooled nodes: fall back to the
      // unkeyed pool so the node can still be matched — and, crucially,
      // is removed when left over (duplicate keys must not leak nodes)
      if (!addedToKeyedPool) {
        unkeyedPool.push(node);
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
      // (realm-safe element check: works across windows / SSR DOM implementations)
      if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
        clearDelegatedEventsDeep(node as HTMLElement);
      }
      targetRoot.removeChild(node);
    }
  }
}

/**
 * Directly blow away all children in `parentElement` and create new DOM
 * from `newVDOM`. This never skips or leaves behind stale nodes,
 * at the cost of losing partial update performance.
 *
 * `globals` is optional: it is derived from `parentElement.ownerDocument`
 * when omitted.
 */
export function replaceDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals?: Globals,
) {
  const resolvedGlobals = resolveGlobals(parentElement, globals);

  // 1) Clear all existing DOM children
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }

  // 2) Re-render from scratch
  const renderer = getRenderer(resolvedGlobals.window.document);

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
