/**
 * Why: the structural DOM adapter between the query facade and defuss-morph.
 * Morph ships no insert/remove/parse-string primitives of its own, so this
 * module composes morph's parser (htmlStringToVNodes), renderer, reconciler
 * (morph), and delegated-event APIs into the exact operations the chain API
 * needs — and performs only the final native writes itself: insertBefore,
 * removeChild, cloneNode, text assignment.
 *
 * It is deliberately an adapter, not another reconciler: everything here can
 * move upstream into defuss-morph later without changing the chain API.
 */
import type {
  DomContent,
  MorphApi,
  Position,
  QueryRoot,
  RenderInput,
  VNode,
} from "./types.js";

/** Duck-typed Node check; `instanceof Node` fails across realms. */
export const isNode = (value: unknown): value is Node =>
  !!value &&
  typeof value === "object" &&
  typeof (value as Node).nodeType === "number";
/** Element check (nodeType 1) — the target kind most chain methods need. */
export const isElement = (value: unknown): value is Element =>
  isNode(value) && value.nodeType === 1;
/** Anything with addEventListener — the widest input `df$()` accepts. */
export const isTarget = (value: unknown): value is EventTarget =>
  !!value && typeof (value as EventTarget).addEventListener === "function";
/**
 * The document owning any context value (window, node, or the ambient
 * document). Throws when none is reachable, e.g. SSR without a context.
 */
export const documentOf = (value?: unknown): Document => {
  const doc =
    (value as Window | undefined)?.document ??
    (isNode(value)
      ? value.nodeType === 9
        ? (value as Document)
        : value.ownerDocument
      : undefined) ??
    globalThis.document;
  if (!doc)
    throw new Error(
      "defuss-query: a DOM document or explicit context is required",
    );
  return doc;
};
/** The Element subset of a selection; most mutators ignore non-elements. */
export const elements = (items: Iterable<EventTarget>): Element[] =>
  Array.from(items).filter(isElement);
/** Whitespace-split class/event token lists from string or array input. */
export const tokens = (input: string | readonly string[]): string[] =>
  (typeof input === "string" ? input : input.join(" "))
    .split(/\s+/)
    .filter(Boolean);
/**
 * Write root for content: an element's shadow root, except custom elements
 * (hyphenated tags), whose slotted light DOM is morph's update surface.
 */
export const rootOf = (el: Element): Element | ShadowRoot =>
  !el.localName.includes("-") && el.shadowRoot ? el.shadowRoot : el;

/**
 * Create the structural adapter over an injected morph API. Capability
 * checks run at call time (`requireMorph`), so `df$` selection and ready
 * callbacks work before the morph engine has loaded.
 */
export function createDomAdapter(api: MorphApi) {
  const requireMorph = () => {
    if (
      typeof api.morph !== "function" ||
      typeof api.getRenderer !== "function"
    )
      throw new Error(
        "defuss-query: load defuss-morph before creating or mutating DOM",
      );
  };
  function parse(html: string, context: QueryRoot): RenderInput[] {
    requireMorph();
    const doc = documentOf(context);
    const Parser = (doc.defaultView as (Window & typeof globalThis) | null)
      ?.DOMParser;
    if (!Parser)
      throw new Error("defuss-query: context document has no DOMParser");
    // DOMParser's document mode otherwise drops standalone tr/td/tbody/col.
    const tag = /^\s*<([a-z][\w:-]*)/i.exec(html)?.[1].toLowerCase();
    const wrappers: Record<string, string[]> = {
      tr: ["table", "tbody"],
      td: ["table", "tbody", "tr"],
      th: ["table", "tbody", "tr"],
      tbody: ["table"],
      thead: ["table"],
      tfoot: ["table"],
      caption: ["table"],
      colgroup: ["table"],
      col: ["table", "colgroup"],
      option: ["select"],
      optgroup: ["select"],
    };
    const tags = wrappers[tag ?? ""] ?? [];
    let input = html;
    for (let i = tags.length - 1; i >= 0; i--)
      input = `<${tags[i]}>${input}</${tags[i]}>`;
    let result: RenderInput[] = api.htmlStringToVNodes(
      `<body>${input}</body>`,
      Parser,
    );
    for (const wrapper of tags) {
      const node = result.find(
        (item): item is VNode =>
          !!item &&
          typeof item === "object" &&
          (item as VNode).type === wrapper,
      );
      result = node?.children ?? [];
    }
    return result;
  }
  function render(
    content: DomContent,
    context: QueryRoot,
    clone = false,
  ): Node[] {
    requireMorph();
    if (isNode(content)) {
      if (content.nodeType === 11)
        return Array.from(content.childNodes).flatMap((node) =>
          render(node, context, clone),
        );
      return [clone ? content.cloneNode(true) : content];
    }
    if (typeof content === "string")
      return parse(content, context).flatMap((item) =>
        renderValue(item, context),
      );
    if (
      content &&
      typeof content === "object" &&
      !("type" in content) &&
      (Symbol.iterator in content || "length" in content)
    ) {
      return Array.from(content as ArrayLike<DomContent>).flatMap((item) =>
        render(item, context, clone),
      );
    }
    return renderValue(content, context);
  }
  function renderValue(content: RenderInput, context: QueryRoot): Node[] {
    if (content == null || typeof content === "boolean") return [];
    if (Array.isArray(content))
      return content.flatMap((item) => renderValue(item, context));
    const renderer = api.getRenderer(documentOf(context));
    if (typeof content === "string" || typeof content === "number")
      return [renderer.createTextNode(String(content))];
    const vnode = content as VNode;
    if (vnode.type === "fragment" || vnode.type === "Fragment")
      return renderValue(vnode.children ?? [], context);
    if (typeof vnode.type !== "string")
      throw new TypeError(
        "defuss-query: expected an intrinsic VNode with a string type",
      );
    // A detached SVG parent supplies the inherited namespace without changing the target.
    if (
      isElement(context) &&
      context.namespaceURI === "http://www.w3.org/2000/svg" &&
      vnode.type !== "svg"
    ) {
      const holder = renderer.createElement({ type: "svg" })!;
      return [renderer.createElement(vnode, holder)!];
    }
    return [renderer.createElement(vnode)!];
  }
  function remove(node: Node): void {
    requireMorph();
    if (isElement(node)) api.clearDelegatedEventsDeep(node as HTMLElement);
    node.parentNode?.removeChild(node);
  }
  function insert(
    target: Node,
    content: DomContent,
    position: Position = "beforeend",
    clone = false,
  ): Node[] {
    requireMorph();
    const inside = position === "afterbegin" || position === "beforeend";
    const parent = inside
      ? isElement(target)
        ? rootOf(target)
        : target
      : target.parentNode;
    if (!parent) return [];
    const anchor =
      position === "afterbegin"
        ? parent.firstChild
        : position === "beforebegin"
          ? target
          : position === "afterend"
            ? target.nextSibling
            : null;
    const created = render(
      content,
      (isElement(parent) || parent.nodeType === 11
        ? parent
        : documentOf(parent)) as QueryRoot,
      clone,
    );
    // Validate all sources before moving any: a failure must not partially insert the batch.
    for (const node of created)
      if (node === parent || node.contains(parent))
        throw new DOMException(
          "Cannot insert an ancestor into its descendant",
          "HierarchyRequestError",
        );
    for (const node of created) {
      const previousRoot = node.getRootNode();
      parent.insertBefore(node, anchor);
      if (isElement(node)) {
        // Re-arm upstream root listeners when a delegated node moves into a new
        // Document/ShadowRoot. Keep original handlers and the single registry.
        if (previousRoot !== node.getRootNode()) {
          const noop = () => {};
          for (const el of [node, ...node.querySelectorAll("*")])
            for (const type of api.getRegisteredEventTypes(el as HTMLElement)) {
              api.registerDelegatedEvent(el as HTMLElement, type, noop, {
                multi: true,
              });
              api.removeDelegatedEvent(el, type, noop);
            }
        }
        api.handleLifecycleEventsForOnMount(node as HTMLElement);
      }
    }
    return created;
  }
  function replace(target: Node, content: DomContent, clone = false): Node[] {
    if (!target.parentNode) return [];
    const nodes = render(content, target.parentNode as QueryRoot, clone);
    if (nodes.includes(target)) {
      if (nodes.length === 1) return nodes;
      throw new TypeError(
        "defuss-query: replacement containing its target must contain only that target",
      );
    }
    const inserted = insert(target, nodes, "beforebegin");
    remove(target);
    return inserted;
  }
  function morph(
    target: Element,
    content: RenderInput,
    options?: import("./types.js").MorphOptions,
  ) {
    requireMorph();
    const snapshot = (item: RenderInput): RenderInput =>
      isNode(item)
        ? item.nodeType === 11
          ? Array.from(item.childNodes, (child) => api.domNodeToVNode(child))
          : api.domNodeToVNode(item)
        : Array.isArray(item)
          ? item.map(snapshot)
          : item;
    return api.morph(
      target,
      typeof content === "string" ? parse(content, target) : snapshot(content),
      options,
    );
  }
  function text(target: Node, value: string): void {
    requireMorph();
    if (isElement(target)) morph(target, [value]);
    else if (target.nodeType === 3 || target.nodeType === 4)
      target.nodeValue = value;
  }
  return { create: render, insert, replace, remove, morph, text };
}
export type MorphDom = ReturnType<typeof createDomAdapter>;
