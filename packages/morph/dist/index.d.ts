/**
 * Lean structural types for the defuss morph engine.
 *
 * These are intentionally minimal (no JSX namespace, no store/ref machinery).
 * defuss's richer types are structurally assignable to these.
 */
type Globals = Performance & Window & typeof globalThis;
type DefussKey = string | number;
type MountHandler<T extends Element = Element> = (element: T) => void;
type UnmountHandler<T extends Element = Element> = (element: T) => void;
/**
 * Minimal ref shape: the morph engine only ever assigns `current`.
 * defuss's full `Ref` interface is structurally assignable to this.
 */
interface RefLike {
    current?: any;
    orphan?: boolean;
}
interface VNodeAttributes {
    ref?: RefLike;
    key?: DefussKey;
    onMount?: MountHandler<any>;
    onUnmount?: UnmountHandler<any>;
    [attributeName: string]: any;
}
type VNodeType = string | Function | any;
interface VNode<A = VNodeAttributes> {
    type?: VNodeType;
    attributes?: A;
    children?: VNodeChildren;
    /**
     * Comment data of a `{ type: "#comment" }` VNode (see `COMMENT_TYPE`).
     * VERIFIED: optional, so defuss core's VNode (no `value`) stays assignable.
     */
    value?: string;
    sourceInfo?: unknown;
    /** Original props passed to a function component (set by jsx runtime for SSG hydration). */
    componentProps?: Record<string, any>;
}
type VNodeChild = VNode<any> | object | string | number | boolean | null | undefined;
type VNodeChildren = VNodeChild[];
/**
 * Anything the morph engine accepts as new content.
 */
type RenderInput = VNode | object | string | number | boolean | null | undefined | RenderInput[];
interface DomAbstractionImpl {
    hasElNamespace(domElement: Element | Document): boolean;
    hasSvgNamespace(parentElement: Element | Document, type: string): boolean;
    createElementOrElements(virtualNode: RenderInput, parentDomElement?: Element | Document): Array<Element | Text | undefined> | Element | Text | undefined;
    createElement(virtualNode: RenderInput, parentDomElement?: Element | Document): Element | undefined;
    createTextNode(text: string, parentDomElement?: Element | Document): Text;
    createChildElements(virtualChildren: VNodeChildren, parentDomElement?: Element | Document): Array<Element | Text | undefined>;
    setAttribute(name: string, value: any, domElement: Element): void;
    setAttributes(virtualNode: VNode<VNodeAttributes>, domElement: Element): void;
}

type TransitionType = "fade" | "slide-left" | "slide-right" | "shake" | "none";
interface TransitionStyles {
    enter: Record<string, string>;
    enterActive: Record<string, string>;
    exit: Record<string, string>;
    exitActive: Record<string, string>;
}
type TransitionsEasing = "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out" | "step-start" | "step-end";
interface TransitionConfig {
    type?: TransitionType;
    styles?: TransitionStyles;
    duration?: number;
    easing?: TransitionsEasing | string;
    delay?: number;
    target?: "parent" | "self";
}
declare const getTransitionStyles: (type: TransitionType, duration: number, easing?: string) => TransitionStyles;
declare const applyStyles: (el: HTMLElement, styles: Record<string, string | number>) => void;
declare const DEFAULT_TRANSITION_CONFIG: TransitionConfig;
declare const performTransition: (element: HTMLElement, updateCallback: () => Promise<void>, config?: TransitionConfig) => Promise<void>;

declare const queueCallback: <T extends any[]>(cb: (...args: T) => void) => (...args: T) => void;

type DelegatedPhase = "bubble" | "capture";
interface DelegatedEventOptions {
    capture?: boolean;
    /** If true, allows multiple handlers per element+type (Dequery mode) */
    multi?: boolean;
}
interface ParsedEventProp {
    eventType: string;
    capture: boolean;
}
/**
 * Events whose handlers are forced into the capture phase, so an ancestor's
 * handler also sees descendants' events (container onFocus/onBlur). Every
 * other non-bubbling event reaches only its target's handlers, natively.
 */
declare const CAPTURE_ONLY_EVENTS: Set<string>;
declare const parseEventPropName: (propName: string) => ParsedEventProp | null;
declare const registerDelegatedEvent: (element: HTMLElement, eventType: string, handler: EventListener, options?: DelegatedEventOptions) => void;
declare const removeDelegatedEvent: (target: EventTarget, eventType: string, handler?: EventListener, _options?: DelegatedEventOptions) => void;
/**
 * Why: listeners a facade attaches natively (defuss-query's on()) live
 * outside this registry, yet must go whenever morph clears an element
 * (removal, replacement, clearDelegatedEventsDeep). A hook keeps morph
 * ignorant of who owns them, instead of morph also tracking native listeners.
 * Registering the same hook twice is a no-op; returns an unregister function.
 */
declare const onClearDelegatedEvents: (hook: (target: EventTarget) => void) => (() => void);
declare const clearDelegatedEvents: (target: EventTarget) => void;
/**
 * Clear delegated events for an element and all its descendants.
 * Used by empty() to prevent event handler leaks when removing subtrees.
 */
declare const clearDelegatedEventsDeep: (root: HTMLElement) => void;
/**
 * Get all event types currently registered on an element.
 * Used to detect which events need to be removed when vnode props change.
 */
declare const getRegisteredEventTypes: (element: HTMLElement) => Set<string>;
/**
 * Get all event keys with phases currently registered on an element.
 * Returns keys like "click:bubble", "click:capture" for precise phase-aware removal.
 */
declare const getRegisteredEventKeys: (element: HTMLElement) => Set<string>;
/**
 * Remove delegated event handler for a specific phase only.
 * Used by patchElementInPlace to precisely remove stale handlers when vnode changes from
 * onClick + onClickCapture → onClickCapture only.
 */
declare const removeDelegatedEventByKey: (element: HTMLElement, eventType: string, phase: "bubble" | "capture") => void;

declare const CLASS_ATTRIBUTE_NAME = "class";
declare const XLINK_ATTRIBUTE_NAME = "xlink";
declare const XMLNS_ATTRIBUTE_NAME = "xmlns";
declare const REF_ATTRIBUTE_NAME = "ref";
declare const DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";
declare const nsMap: {
    xmlns: string;
    xlink: string;
    svg: string;
};
declare const observeUnmount: (domNode: Node, onUnmount: () => void) => void;
/** lifecycle event attachment has been implemented separately, because it is also required to run when partially updating the DOM */
declare const handleLifecycleEventsForOnMount: (newEl: HTMLElement) => void;
declare const getRenderer: (document: Document) => DomAbstractionImpl;

/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text and Comment nodes, compares their data.
 */
declare const areDomNodesEqual: (oldNode: Node, newNode: Node) => boolean;
/********************************************************
 * 1) Define a "valid" child type & utilities
 ********************************************************/
type ValidChild = string | number | boolean | null | undefined | VNode<VNodeAttributes>;
/**
 * How top-level children are reconciled:
 * - `"replace"` (default): full reconciliation — unmentioned nodes are removed.
 * - `"diff"`: partial updates — only patch items addressed by `key`/`id` are
 *   applied (attributes merge, new items append, unmentioned nodes untouched).
 */
type MorphMode = "replace" | "diff";
/**
 * Resolve the render globals from an element's own document when not given
 * explicitly (isomorphic: browser window, happy-dom window, multi-document).
 */
declare const resolveGlobals: (el?: Element, globals?: Globals) => Globals;
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
declare function updateDomWithVdom(parentElement: Element, newVDOM: RenderInput, globals?: Globals, mode?: MorphMode): void;
/**
 * Directly blow away all children in `parentElement` and create new DOM
 * from `newVDOM`. This never skips or leaves behind stale nodes,
 * at the cost of losing partial update performance.
 *
 * `globals` is optional: it is derived from `parentElement.ownerDocument`
 * when omitted.
 */
declare function replaceDomWithVdom(parentElement: Element, newVDOM: RenderInput, globals?: Globals): void;

/**
 * Marks VNodes derived from existing DOM (HTML strings / DOM nodes).
 * Such VNodes cannot declare event handlers, so the morph engine must
 * preserve delegated handlers already attached to surviving elements
 * (same rationale as uncontrolled form-state preservation).
 */
declare const FROM_DOM_MARKER: unique symbol;
/**
 * VNode type of an HTML comment: `{ type: "#comment", value }`.
 * Why "#comment": it is the DOM's own nodeName for comments and can never
 * collide with a tag name ("#" is invalid there). The data lives in `value`,
 * not `children`, so generic tree walkers never mistake it for content.
 */
declare const COMMENT_TYPE = "#comment";
type CommentVNode = VNode & {
    type: typeof COMMENT_TYPE;
};
declare const isCommentVNode: (value: unknown) => value is CommentVNode;
declare function parseDOM(input: string, type: DOMParserSupportedType, Parser: typeof DOMParser): Document;
declare function isSVG(input: string, Parser: typeof DOMParser): boolean;
declare function isHTML(input: string, Parser: typeof DOMParser): boolean;
declare const isMarkup: (input: string, Parser: typeof DOMParser) => boolean;
declare function renderMarkup(markup: string, Parser: typeof DOMParser, doc?: Document): ChildNode[];
declare function getMimeType(input: string, Parser: typeof DOMParser): DOMParserSupportedType;
/**
 * Converts a DOM node to a VNode structure for use with updateDomWithVdom.
 * This allows us to leverage the sophisticated partial update system even for Node inputs.
 */
declare function domNodeToVNode(node: Node): VNode<VNodeAttributes> | string;
/**
 * Converts an HTML string to VNode structure for use with updateDomWithVdom.
 * This allows markup strings to benefit from the intelligent partial update system.
 */
declare function htmlStringToVNodes(html: string, Parser: typeof DOMParser): Array<VNode<VNodeAttributes> | string>;

interface MorphOptions {
    /**
     * Optional transition to apply around the morph.
     * When set (and `type !== "none"`), `morph()` returns a `Promise`
     * that resolves once the transition completed.
     */
    transition?: TransitionConfig;
    /**
     * Partial updates: apply only the given change-set instead of reconciling
     * the full child list. Every top-level item must be an element with a
     * `key` (preferred) or `id` — matched nodes are patched with attributes
     * *merged* (undeclared attributes and children stay untouched), unmatched
     * items are appended. Unmentioned siblings keep identity, order and state;
     * diff mode never removes and never moves, so addressing is unambiguous.
     *
     * Plain-text input and key-less items throw (they cannot be addressed).
     *
     * @example
     * ```ts
     * // update one row, append another — everything else is not re-sent:
     * morph(list, `
     *   <li key="b">B (updated)</li>
     *   <li key="c">C (new)</li>
     * `, { diff: true });
     * ```
     */
    diff?: boolean;
}
declare const morph: (el: Element, newContent: RenderInput, options?: MorphOptions) => void | Promise<void>;

export { CAPTURE_ONLY_EVENTS, CLASS_ATTRIBUTE_NAME, COMMENT_TYPE, DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE, DEFAULT_TRANSITION_CONFIG, FROM_DOM_MARKER, REF_ATTRIBUTE_NAME, XLINK_ATTRIBUTE_NAME, XMLNS_ATTRIBUTE_NAME, applyStyles, areDomNodesEqual, clearDelegatedEvents, clearDelegatedEventsDeep, domNodeToVNode, getMimeType, getRegisteredEventKeys, getRegisteredEventTypes, getRenderer, getTransitionStyles, handleLifecycleEventsForOnMount, htmlStringToVNodes, isCommentVNode, isHTML, isMarkup, isSVG, morph, nsMap, observeUnmount, onClearDelegatedEvents, parseDOM, parseEventPropName, performTransition, queueCallback, registerDelegatedEvent, removeDelegatedEvent, removeDelegatedEventByKey, renderMarkup, replaceDomWithVdom, resolveGlobals, updateDomWithVdom };
export type { CommentVNode, DefussKey, DelegatedEventOptions, DelegatedPhase, DomAbstractionImpl, Globals, MorphMode, MorphOptions, MountHandler, ParsedEventProp, RefLike, RenderInput, TransitionConfig, TransitionStyles, TransitionType, TransitionsEasing, UnmountHandler, VNode, VNodeAttributes, VNodeChild, VNodeChildren, VNodeType, ValidChild };
