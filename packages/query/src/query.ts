/**
 * Why: a chainable, jQuery-shaped facade over the native DOM and the
 * defuss-morph engine. It exists so terse imperative DOM code — select,
 * mutate, listen — still routes every structural write through morph's
 * parser, renderer, reconciler, and delegated-event substrate instead of
 * growing a second DOM engine.
 *
 * Design decisions:
 * - `DfQuery` subclasses `Array` with snapshot membership: a selection is
 *   plain data. Traversal returns a new selection; mutators return `this`
 *   for chaining. No hidden reactivity, no collection thenable.
 * - `df$` is one symbol with two faces: calling it selects (`df$("a")`),
 *   while morph's functions live on it as properties (`df$.morph(...)`).
 * - The factory never imports morph itself. `createDf$` receives the API by
 *   injection, so the CDN browser bundle can adopt the already-loaded morph
 *   namespace instead of embedding a second copy (see scripts/build.ts).
 * - Element listeners belong to morph's delegated registry so morphing
 *   never detaches them; only non-element targets use a local WeakMap.
 */
import {
  createDomAdapter,
  documentOf,
  elements,
  isElement,
  isNode,
  isTarget,
  rootOf,
  tokens,
  type MorphDom,
} from "./dom.js";
import type {
  AsynchronousMorphOptions,
  DomContent,
  EventMapFor,
  Handler,
  MorphApi,
  MorphOptions,
  Position,
  QueryEventOptions,
  QueryInput,
  QueryRoot,
  RenderInput,
  SynchronousMorphOptions,
  Value,
  VNode,
} from "./types.js";
export type * from "./types.js";
export { createDomAdapter } from "./dom.js";
export type { MorphDom } from "./dom.js";

/** Keep in sync with package.json; scripts/verify.ts gates on it. */
export const QUERY_VERSION = "0.1.0";
// Unforgeable proof that query installed a given df$: installGlobal reuses a
// branded function and refuses to overwrite an unrelated one.
const brand = Symbol.for("defuss-query.factory");
type Listener = { type: string; handler: EventListener; capture: boolean };
// Every on() listener is a real addEventListener on its target, tracked here
// so off() and morph's element cleanup can find it again. Why not morph's
// delegated registry: delegation replays the path from the root, so handlers
// ran after ancestors', died on an ancestor's stopPropagation(), missed
// non-bubbling events and saw currentTarget === document.
// VERIFIED: all four in Chromium (suite.browser.test.ts "on(): native").
const nativeListeners = new WeakMap<EventTarget, Listener[]>();
/** Remove the matching tracked listeners; no names/handler matches all. */
const detachListeners = (
  target: EventTarget,
  names?: string[],
  handler?: EventListener,
): void => {
  const entries = nativeListeners.get(target);
  if (!entries) return;
  const kept = entries.filter((entry) => {
    const match =
      (!names || names.includes(entry.type)) &&
      (!handler || entry.handler === handler);
    if (match)
      target.removeEventListener(entry.type, entry.handler, entry.capture);
    return !match;
  });
  if (kept.length) nativeListeners.set(target, kept);
  else nativeListeners.delete(target);
};
/** morph teardown hook: elements morph removes lose their on() listeners. */
const clearListeners = (target: EventTarget) => detachListeners(target);
const styleName = (name: string) =>
  name.startsWith("--")
    ? name
    : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const propRecord = (target: EventTarget) =>
  target as unknown as Record<string, unknown>;

/**
 * The call signature of `df$`. Every overload returns a snapshot selection:
 *
 * - `df$()` — empty selection.
 * - `df$(fn)` — DOM-ready callback: queued as a microtask when the document
 *   is already parsed, else run once on DOMContentLoaded. Yields Document.
 * - `df$("button")` / `df$(".x")` — CSS selector; tag-name overloads give
 *   precise element types.
 * - `df$("<p>hi</p>")` — a leading `<` means markup: parse into new nodes.
 * - `df$(target | targets)` — wrap one EventTarget or a collection.
 * - `df$(vnode)` — render an intrinsic defuss VNode into new nodes.
 * - `df$(null)` — empty selection, for ergonomic conditional code.
 */
export interface QueryFactory {
  (): DfQuery<Element>;
  (ready: (df$: DfDollar) => void, context?: QueryRoot): DfQuery<Document>;
  <K extends keyof HTMLElementTagNameMap>(
    selector: K,
    context?: QueryRoot,
  ): DfQuery<HTMLElementTagNameMap[K]>;
  (markup: `<${string}`, context?: QueryRoot): DfQuery<Node>;
  <T extends EventTarget>(
    targets: T | Iterable<T> | ArrayLike<T>,
    context?: QueryRoot,
  ): DfQuery<T>;
  <T extends Element = Element>(
    selector: string,
    context?: QueryRoot,
  ): DfQuery<T>;
  (vnode: VNode, context?: QueryRoot): DfQuery<Node>;
  (empty: null | undefined, context?: QueryRoot): DfQuery<Element>;
}
/**
 * `df$` itself: the callable factory merged with the injected morph API,
 * plus query's reserved slots (`fn` for prototype extension, `dom` for the
 * structural adapter, `queryVersion`).
 */
export type DfDollar<M extends MorphApi = MorphApi> = QueryFactory &
  M & {
    readonly fn: DfQuery<EventTarget>;
    readonly queryVersion: string;
    readonly dom: MorphDom;
  };
interface Runtime {
  api: DfDollar;
  dom: MorphDom;
}

/**
 * A snapshot selection: an `Array` subclass, so every native array method
 * works on it. Membership is fixed at creation — traversal methods return a
 * new `DfQuery`, while mutators change the DOM and return `this` for
 * chaining. Nothing re-evaluates the selector behind your back.
 */
export class DfQuery<T extends EventTarget = Element> extends Array<T> {
  // Plain Array as species: map/slice/flat would otherwise call this
  // constructor with Array's numeric length argument and break. Only the
  // explicit query methods below produce new DfQuery selections.
  static override get [Symbol.species](): ArrayConstructor {
    return Array;
  }
  #runtime: Runtime;
  constructor(runtime: Runtime, items: Iterable<T> | ArrayLike<T> = []) {
    super();
    this.#runtime = runtime;
    // Dedupe so setters never double-apply to one node, and push in a loop
    // to avoid spread/push.apply argument limits on large NodeLists.
    for (const item of new Set(Array.from(items))) this.push(item);
  }
  #wrap<U extends EventTarget>(items: Iterable<U> | ArrayLike<U>): DfQuery<U> {
    return new DfQuery(this.#runtime, items);
  }
  /** New selection from per-element traversal, dropping non-elements. */
  #walk(
    fn: (el: Element) => Iterable<Element | null | undefined>,
  ): DfQuery<Element> {
    return this.#wrap(
      elements(this).flatMap((el) => Array.from(fn(el)).filter(isElement)),
    );
  }
  /** First element of the selection, undefined when empty or non-element. */
  #first(): Element | undefined {
    return isElement(this[0]) ? this[0] : undefined;
  }
  /** The snapshot, or the item at `index` (negative counts from the end). */
  get(): T[];
  get(index: number): T | undefined;
  get(index?: number): T[] | T | undefined {
    return index === undefined ? Array.from(this) : this.at(index);
  }
  /** Copy of the selection as a plain array. */
  toArray(): T[] {
    return Array.from(this);
  }
  /** Selection containing only the item at `index` (negative from end). */
  eq(index: number): DfQuery<T> {
    const item = this.at(index);
    return this.#wrap(item === undefined ? [] : [item]);
  }
  /** Selection containing only the first item. */
  first(): DfQuery<T> {
    return this.eq(0);
  }
  /** Selection containing only the last item. */
  last(): DfQuery<T> {
    return this.eq(-1);
  }
  /** Iterate with `this` bound to the item; `false` breaks early. */
  each(callback: (this: T, index: number, element: T) => unknown): this {
    for (let i = 0; i < this.length; i++)
      if (callback.call(this[i], i, this[i]) === false) break;
    return this;
  }
  // Keep Array.find(predicate), while find(selector) returns descendants.
  override find<S extends T>(
    predicate: (value: T, index: number, obj: T[]) => value is S,
    thisArg?: unknown,
  ): S | undefined;
  override find(
    predicate: (value: T, index: number, obj: T[]) => unknown,
    thisArg?: unknown,
  ): T | undefined;
  override find<K extends keyof HTMLElementTagNameMap>(
    selector: K,
  ): DfQuery<HTMLElementTagNameMap[K]>;
  override find<E extends Element = Element>(selector: string): DfQuery<E>;
  override find(
    input: string | ((value: T, index: number, obj: T[]) => unknown),
    thisArg?: unknown,
  ): T | undefined | DfQuery<Element> {
    if (typeof input === "function") return super.find(input, thisArg);
    return this.#wrap(
      Array.from(this).flatMap((target) =>
        "querySelectorAll" in target
          ? Array.from((target as unknown as QueryRoot).querySelectorAll(input))
          : [],
      ),
    );
  }
  /** Array.filter for predicates; a string keeps elements matching it. */
  override filter<S extends T>(
    predicate: (value: T, index: number, array: T[]) => value is S,
    thisArg?: unknown,
  ): DfQuery<S>;
  override filter(
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: unknown,
  ): DfQuery<T>;
  override filter(selector: string): DfQuery<T>;
  override filter(
    input: string | ((value: T, index: number, array: T[]) => unknown),
    thisArg?: unknown,
  ): DfQuery<T> {
    return this.#wrap(
      super.filter(
        typeof input === "string"
          ? (value) => isElement(value) && value.matches(input)
          : input,
        thisArg,
      ),
    );
  }
  /** True when any element in the selection matches the selector. */
  is(selector: string): boolean {
    return this.some((el) => isElement(el) && el.matches(selector));
  }
  /** Unique parent elements of the selection. */
  parent(): DfQuery<Element> {
    return this.#walk((el) => [el.parentElement]);
  }
  /** Direct child elements, optionally narrowed by selector. */
  children(selector?: string): DfQuery<Element> {
    const result = this.#wrap(
      Array.from(this).flatMap((el) =>
        "children" in el
          ? Array.from((el as unknown as QueryRoot).children)
          : [],
      ),
    );
    return selector === undefined ? result : result.filter(selector);
  }
  /** Nearest ancestor-or-self matching the selector, per element. */
  closest(selector: string): DfQuery<Element> {
    return this.#walk((el) => [el.closest(selector)]);
  }
  /** Next element siblings. */
  next(): DfQuery<Element> {
    return this.#walk((el) => [el.nextElementSibling]);
  }
  /** Previous element siblings. */
  prev(): DfQuery<Element> {
    return this.#walk((el) => [el.previousElementSibling]);
  }

  /** Read the first element's attribute, or set it on all (`null` removes). */
  attr(name: string): string | null | undefined;
  attr(name: string, value: string | number | boolean | null): this;
  attr(
    name: string,
    value?: string | number | boolean | null,
  ): this | string | null | undefined {
    if (arguments.length === 1) return this.#first()?.getAttribute(name);
    for (const el of elements(this))
      value === null
        ? el.removeAttribute(name)
        : el.setAttribute(name, String(value));
    return this;
  }
  /**
   * Read or write IDL properties. Structural properties (innerHTML & co.)
   * are refused: those writes must go through morph — use html(), text(),
   * or replaceWith() instead.
   */
  prop<K extends string>(
    name: K,
  ): K extends keyof T ? T[K] | undefined : unknown;
  prop<K extends string>(
    name: K,
    value: K extends keyof T ? T[K] : unknown,
  ): this;
  prop(name: string, value?: unknown): unknown {
    if (arguments.length === 1)
      return this[0] ? propRecord(this[0])[name] : undefined;
    if (["innerHTML", "outerHTML", "textContent", "innerText"].includes(name))
      throw new TypeError(
        "defuss-query: use html(), text(), or replaceWith() for structural writes",
      );
    for (const el of this) propRecord(el)[name] = value;
    return this;
  }
  /** Read or write `data-*` attributes via dataset (`null` deletes). */
  data(name: string): string | undefined;
  data(name: string, value: string | number | boolean | null): this;
  data(
    name: string,
    value?: string | number | boolean | null,
  ): this | string | undefined {
    const first = this.#first() as HTMLElement | undefined;
    if (arguments.length === 1)
      return first?.dataset && Object.hasOwn(first.dataset, name)
        ? first.dataset[name]
        : undefined;
    for (const el of elements(this) as HTMLElement[]) {
      if (el.dataset)
        value === null
          ? delete el.dataset[name]
          : (el.dataset[name] = String(value));
    }
    return this;
  }
  /**
   * Read the first element's computed style, or set inline styles on all
   * elements (`null` removes a property; camelCase converts to kebab-case).
   */
  css(name: string): string | undefined;
  css(name: string, value: string | null): this;
  css(values: Record<string, string | null>): this;
  css(
    name: string | Record<string, string | null>,
    value?: string | null,
  ): this | string | undefined {
    if (typeof name === "string" && arguments.length === 1) {
      const el = this.#first();
      return el
        ? el.ownerDocument.defaultView
            ?.getComputedStyle(el)
            .getPropertyValue(styleName(name))
        : undefined;
    }
    const entries =
      typeof name === "string"
        ? [[name, value] as const]
        : Object.entries(name);
    for (const el of elements(this) as HTMLElement[])
      for (const [key, val] of entries) {
        if (el.style)
          val === null
            ? el.style.removeProperty(styleName(key))
            : el.style.setProperty(styleName(key), String(val));
      }
    return this;
  }
  /** Add class tokens to every element. */
  addClass(names: string | readonly string[]): this {
    const list = tokens(names);
    for (const el of elements(this)) el.classList.add(...list);
    return this;
  }
  /** Remove class tokens; no argument clears the whole class attribute. */
  removeClass(names?: string | readonly string[]): this {
    const list = names === undefined ? undefined : tokens(names);
    for (const el of elements(this))
      list ? el.classList.remove(...list) : el.removeAttribute("class");
    return this;
  }
  /** Toggle class tokens, optionally forced on or off. */
  toggleClass(names: string | readonly string[], force?: boolean): this {
    const list = tokens(names);
    for (const el of elements(this))
      for (const name of list)
        force === undefined
          ? el.classList.toggle(name)
          : el.classList.toggle(name, force);
    return this;
  }
  /** True when any element carries the class. */
  hasClass(name: string): boolean {
    return elements(this).some((el) => el.classList.contains(name));
  }

  /**
   * Read or write form control values. Multi-selects read/set string
   * arrays; an array on checkboxes/radios toggles `checked` by value.
   */
  val(): string | string[] | undefined;
  val(value: Value): this;
  val(value?: Value): this | string | string[] | undefined {
    const controls = elements(this).filter((el) => "value" in el) as (
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    )[];
    if (arguments.length === 0) {
      const el = controls[0];
      return el?.localName === "select" && (el as HTMLSelectElement).multiple
        ? Array.from(
            (el as HTMLSelectElement).selectedOptions,
            (option) => option.value,
          )
        : el?.value;
    }
    for (const el of controls) {
      if (el.localName === "select" && (el as HTMLSelectElement).multiple) {
        const values = new Set(
          Array.isArray(value) ? value : value == null ? [] : [String(value)],
        );
        for (const option of (el as HTMLSelectElement).options)
          option.selected = values.has(option.value);
      } else if (
        el.localName === "input" &&
        ["checkbox", "radio"].includes(el.type) &&
        Array.isArray(value)
      ) {
        (el as HTMLInputElement).checked = value.includes(el.value);
      } else
        el.value = Array.isArray(value)
          ? (value[0] ?? "")
          : value == null
            ? ""
            : String(value);
    }
    return this;
  }
  /**
   * FormData for a selection that is exactly one form element. Uses the
   * form's own realm constructor so cross-realm forms stay valid; an
   * optional submitter contributes its name/value.
   */
  form(submitter?: HTMLElement | null): FormData {
    if (
      this.length !== 1 ||
      !isElement(this[0]) ||
      this[0].localName !== "form"
    )
      throw new TypeError(
        "defuss-query: form() requires exactly one form element",
      );
    const form = this[0] as unknown as HTMLFormElement;
    const Ctor = (
      form.ownerDocument.defaultView as (Window & typeof globalThis) | null
    )?.FormData;
    if (!Ctor) throw new Error("defuss-query: form document has no FormData");
    return new Ctor(form, submitter);
  }
  /** URL-encoded string of the form's string-valued entries. */
  serialize(submitter?: HTMLElement | null): string {
    const params = new URLSearchParams();
    for (const [name, value] of this.form(submitter))
      if (typeof value === "string") params.append(name, value);
    return params.toString();
  }

  /**
   * Morph content into every element. Synchronous and chainable by default;
   * passing `transition` is explicitly async and resolves to `this` once
   * every element's transition settled. No hidden queue, no thenable.
   */
  morph(content: RenderInput, options?: SynchronousMorphOptions): this;
  morph(content: RenderInput, options: AsynchronousMorphOptions): Promise<this>;
  morph(content: RenderInput, options: MorphOptions): this | Promise<this>;
  morph(content: RenderInput, options?: MorphOptions): this | Promise<this> {
    // No collection thenable or hidden queue. Supplying transition is explicitly async.
    if (options?.transition !== undefined)
      return Promise.all(
        elements(this).map(async (el) => {
          await this.#runtime.dom.morph(el, content, options);
        }),
      ).then(() => this);
    for (const el of elements(this))
      this.#runtime.dom.morph(el, content, options);
    return this;
  }
  /**
   * First element's (shadow-aware) innerHTML, or morph content into all.
   * Accepts the same options as morph(): synchronous and chainable by
   * default; passing `transition` returns Promise<this> once every element's
   * transition settled.
   */
  html(): string | undefined;
  html(content: RenderInput, options?: SynchronousMorphOptions): this;
  html(content: RenderInput, options: AsynchronousMorphOptions): Promise<this>;
  html(content: RenderInput, options: MorphOptions): this | Promise<this>;
  html(
    content?: RenderInput,
    options?: MorphOptions,
  ): this | Promise<this> | string | undefined {
    if (arguments.length === 0) {
      const el = this.#first();
      return el ? rootOf(el).innerHTML : undefined;
    }
    return this.morph(content, options as MorphOptions);
  }
  /** Concatenated text of the selection, or set literal text on all nodes. */
  text(): string;
  text(value: string | number | null): this;
  text(value?: string | number | null): this | string {
    if (arguments.length === 0)
      return Array.from(this, (el) =>
        isNode(el) ? ((isElement(el) ? rootOf(el) : el).textContent ?? "") : "",
      ).join("");
    // An ARRAY string is literal VNode text, not parsed HTML. Do not pass a bare string.
    for (const node of this)
      if (isNode(node))
        this.#runtime.dom.text(node, value == null ? "" : String(value));
    return this;
  }
  /** Remove every child by morphing in an empty list. */
  empty(): this {
    return this.morph([]);
  }
  /**
   * Shared write path for append/prepend/before/after/replaceWith. Live
   * node lists and fragments are snapshotted before the first write, which
   * would otherwise consume or move them mid-loop.
   */
  #insert(content: DomContent, position: Position, replace = false): Node[] {
    // Snapshot live lists/fragments once, before the first write consumes/moves them.
    const input =
      isNode(content) && content.nodeType === 11
        ? Array.from(content.childNodes)
        : content &&
            typeof content === "object" &&
            !isNode(content) &&
            !("type" in content) &&
            (Symbol.iterator in content || "length" in content)
          ? Array.from(content as ArrayLike<Node>)
          : content;
    const targets = Array.from(this)
      .filter((item): item is T & Node => isNode(item))
      .filter((node) =>
        position === "afterbegin" || position === "beforeend"
          ? node.nodeType === 1 || node.nodeType === 11
          : !!node.parentNode,
      );
    // With several targets the content is cloned for all but the last one,
    // which receives the original nodes (moved once, matching jQuery).
    return targets.flatMap((node, index) =>
      replace
        ? this.#runtime.dom.replace(node, input, index !== targets.length - 1)
        : this.#runtime.dom.insert(
            node,
            input,
            position,
            index !== targets.length - 1,
          ),
    );
  }
  /** Insert content as the last child of every target. */
  append(content: DomContent): this {
    this.#insert(content, "beforeend");
    return this;
  }
  /** Insert content as the first child of every target. */
  prepend(content: DomContent): this {
    this.#insert(content, "afterbegin");
    return this;
  }
  /** Insert content before every target. */
  before(content: DomContent): this {
    this.#insert(content, "beforebegin");
    return this;
  }
  /** Insert content after every target. */
  after(content: DomContent): this {
    this.#insert(content, "afterend");
    return this;
  }
  /** Replace every target with the content. */
  replaceWith(content: DomContent): this {
    this.#insert(content, "beforebegin", true);
    return this;
  }
  /** Insert this selection into target(s); selects the inserted nodes. */
  appendTo(
    target: string | QueryRoot | Iterable<QueryRoot> | ArrayLike<QueryRoot>,
  ): DfQuery<Node> {
    const selection =
      typeof target === "string"
        ? this.#runtime.api(target, documentOf(this[0]))
        : this.#runtime.api(target);
    return this.#wrap(selection.#insert(this, "beforeend"));
  }
  /** Detach every node, clearing its delegated listeners first. */
  remove(): this {
    for (const node of Array.from(this).filter((item): item is T & Node =>
      isNode(item),
    ))
      this.#runtime.dom.remove(node);
    return this;
  }

  /**
   * Attach a handler for one or more event types with native
   * addEventListener, so order, stopPropagation, non-bubbling events and
   * currentTarget behave exactly as without the facade. Morphing an element
   * in place keeps its listeners; morph removing or replacing it, or
   * remove(), tears them down.
   */
  on<K extends keyof EventMapFor<T>>(
    type: K,
    handler: Handler<T, Extract<EventMapFor<T>[K], Event>>,
    options?: boolean | QueryEventOptions,
  ): this;
  on(
    type: string,
    handler: Handler<T>,
    options?: boolean | QueryEventOptions,
  ): this;
  on(
    type: string,
    handler: Handler<T>,
    options: boolean | QueryEventOptions = {},
  ): this {
    if (typeof handler !== "function")
      throw new TypeError("defuss-query: on() requires a function");
    if (
      typeof options === "object" &&
      Object.keys(options).some((key) => key !== "capture")
    )
      throw new TypeError(
        "defuss-query: on() supports capture only; use native addEventListener for other options",
      );
    const capture = typeof options === "boolean" ? options : !!options.capture;
    for (const target of this)
      for (const name of tokens(type)) {
        const listener = handler as EventListener;
        if (isElement(target)) {
          if (typeof this.#runtime.api.registerDelegatedEvent !== "function")
            throw new Error("defuss-query: load defuss-morph before on()");
          // Older morph builds lack the hook: listeners then survive removal.
          this.#runtime.api.onClearDelegatedEvents?.(clearListeners);
        }
        target.addEventListener(name, listener, capture);
        const entries = nativeListeners.get(target) ?? [];
        // Mirror addEventListener's own dedupe: an identical (type,
        // handler, capture) triple registers once and stays so here.
        if (
          !entries.some(
            (entry) =>
              entry.type === name &&
              entry.handler === listener &&
              entry.capture === capture,
          )
        )
          entries.push({ type: name, handler: listener, capture });
        nativeListeners.set(target, entries);
      }
    return this;
  }
  /**
   * Detach handlers registered through on(). No type clears every listener
   * the facade registered on the target; no handler clears the whole type.
   */
  off<K extends keyof EventMapFor<T>>(
    type: K,
    handler?: Handler<T, Extract<EventMapFor<T>[K], Event>>,
  ): this;
  off(type?: string, handler?: Handler<T>): this;
  off(type?: string, handler?: Handler<T>): this {
    const names = type === undefined ? undefined : tokens(type);
    for (const target of this)
      detachListeners(target, names, handler as EventListener | undefined);
    return this;
  }
  /** Dispatch a bubbling, cancelable CustomEvent on every target. */
  trigger(type: string, detail?: unknown): this {
    for (const target of this) {
      // Construct the event in the target's own realm so cross-realm
      // targets (iframes, test VMs) dispatch it correctly.
      const realm = isNode(target)
        ? documentOf(target).defaultView
        : (target as unknown as Window).window === (target as unknown)
          ? target
          : globalThis;
      const Ctor =
        (realm as typeof globalThis)?.CustomEvent ?? globalThis.CustomEvent;
      target.dispatchEvent(
        new Ctor(type, { detail, bubbles: true, cancelable: true }),
      );
    }
    return this;
  }
}

/**
 * Build a `df$` around an injected morph API. Dependency injection keeps
 * the query core free of globals and of a second morph copy: the npm entry
 * passes the module namespace, the CDN bundle passes the global object that
 * morph's own bundle already registered on `window.df$`.
 */
export function createDf$<M extends MorphApi>(morphApi: M): DfDollar<M> {
  const dollar = function (
    input?: QueryInput | ((df$: DfDollar) => void),
    context?: QueryRoot,
  ): DfQuery<EventTarget> {
    if (input == null || input === "") return new DfQuery<EventTarget>(runtime);
    if (typeof input === "function") {
      const doc = documentOf(context);
      const invoke = () => input(dollar);
      // DOM-ready callback: microtask once parsed, DOMContentLoaded before.
      doc.readyState === "loading"
        ? doc.addEventListener("DOMContentLoaded", invoke, { once: true })
        : queueMicrotask(invoke);
      return new DfQuery<EventTarget>(runtime, [doc]);
    }
    if (typeof input === "string") {
      const root = context ?? documentOf();
      return new DfQuery<EventTarget>(
        runtime,
        input.trimStart().startsWith("<")
          ? runtime.dom.create(input, root)
          : root.querySelectorAll(input),
      );
    }
    if (isTarget(input)) return new DfQuery<EventTarget>(runtime, [input]);
    if (typeof input === "object" && "type" in input)
      return new DfQuery<EventTarget>(
        runtime,
        runtime.dom.create(input, context ?? documentOf()),
      );
    if (
      typeof input === "object" &&
      (Symbol.iterator in input || "length" in input)
    ) {
      const items = Array.from(input as ArrayLike<EventTarget>);
      if (!items.every(isTarget))
        throw new TypeError(
          "defuss-query: collections must contain EventTargets",
        );
      return new DfQuery<EventTarget>(runtime, items);
    }
    throw new TypeError(
      "defuss-query: expected selector, markup, VNode, EventTarget, or target collection",
    );
  } as DfDollar<M>;
  // Copy values, not the module namespace prototype. Function-intrinsic
  // slots (name/length/prototype/caller/arguments) are skipped: redefining
  // them on a function throws or corrupts its arity. Query's own reserved
  // slots (fn/dom/queryVersion) win over any same-named morph export.
  for (const key of Reflect.ownKeys(morphApi)) {
    if (
      [
        "name",
        "length",
        "prototype",
        "caller",
        "arguments",
        "fn",
        "dom",
        "queryVersion",
      ].includes(String(key))
    )
      continue;
    Object.defineProperty(dollar, key, {
      value: Reflect.get(morphApi, key),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  }
  const runtime: Runtime = { api: dollar, dom: createDomAdapter(dollar) };
  Object.defineProperties(dollar, {
    fn: { value: DfQuery.prototype },
    dom: { value: runtime.dom },
    queryVersion: { value: QUERY_VERSION },
    [brand]: { value: true },
  });
  return dollar;
}

/**
 * Install `df$` on `target` (the CDN path). Can run before morph loads:
 * selectors work immediately, morph capabilities resolve at call time.
 *
 * Coexistence contract for a pre-existing `df$`:
 * - one this module installed before (brand match) is returned unchanged;
 * - a plain object — typically the morph CDN bundle's namespace — is
 *   adopted: its entries are copied onto the callable, preserving morph
 *   function identities and any custom/symbol props placed there earlier;
 * - an unrelated df$ *function* is refused: overwriting someone else's
 *   global would silently break that script.
 */
export function installGlobal(target: object = globalThis): DfDollar {
  const previous = Reflect.get(target, "df$") as
    | Record<PropertyKey, unknown>
    | undefined;
  if (previous && previous[brand]) return previous as unknown as DfDollar;
  if (typeof previous === "function")
    throw new Error(
      "defuss-query: refusing to overwrite an unrelated df$ function",
    );
  const dollar = createDf$(
    (previous && typeof previous === "object" ? previous : {}) as MorphApi,
  );
  if (!Reflect.set(target, "df$", dollar))
    throw new TypeError("defuss-query: df$ global is not writable");
  return dollar;
}
