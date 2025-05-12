import { updateDom, updateDomWithVdom } from "../common/dom.js";
import {
  isJSX,
  isRef,
  renderIsomorphicSync,
  type AllHTMLElements,
  type CSSProperties,
  type Globals,
  type Ref,
  type RenderInput,
} from "../render/index.js";

// --- Types & Helpers ---
export type NodeType =
  | Node
  | Text
  | Element
  | Document
  | DocumentFragment
  | HTMLElement
  | SVGElement;
export type FormFieldValue = string | Date | File | boolean | number;
export interface FormKeyValues {
  [keyOrPath: string]: FormFieldValue;
}

// Add global interface for event tracking
declare global {
  interface HTMLElement {
    _dequeryEvents?: Map<string, Set<EventListener>>;
  }
}

const elementGuard = <T = HTMLElement>(el: NodeType): T => {
  if (el instanceof HTMLElement) return el as T;
  console.warn("Expected HTMLElement, but found:", el?.nodeName ?? el);
  return el as T;
};

export interface DequeryOptions {
  maxWaitMs?: number;
  timeout?: number;
  delay?: number;
  elements?: NodeType[];
  state?: any;
  verbose?: boolean;
  onTimeGuardError?: (ms: number, call: Call) => void;
}

export const adefaultConfig: DequeryOptions = {
  maxWaitMs: 1000,
  timeout: 5000,
  delay: 0,
  verbose: false,
  onTimeGuardError: () => {},
};

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase &
  JSX.HTMLAttributesLowerCase & { html?: string; text?: string };

// --- Core Async Call & Chain ---
class Call {
  name: string;
  fn: Function;
  args: any[];
  constructor(fn: Function, ...args: any[]) {
    this.name = fn.name;
    this.fn = fn;
    this.args = args;
  }
}

interface DequeryArrayLike {
  [index: number]: NodeType;
}

export interface DequeryInterface
  extends Iterable<NodeType>,
    ArrayLike<NodeType> {
  // Core properties
  elements: Array<NodeType>;
  length: number;
  [index: number]: NodeType;

  // Internal state (for completeness)
  options: DequeryOptions;
  isResolved: boolean;
  lastResult: any;

  // Initialization
  __init(
    selectorHtmlRefOrElementRef:
      | string
      | NodeType
      | Ref<NodeType, any>
      | RenderInput,
    options: DequeryOptions | ElementCreationOptions,
  ): DequeryInterface;

  getFirstElement(): NodeType;

  // Traversal methods
  debug(cb: (el: NodeType | Array<NodeType>) => void): DequeryInterface;
  ref(ref: Ref<NodeType>): DequeryInterface;
  query(selector: string): DequeryInterface;
  all(): DequeryInterface[] | Promise<DequeryInterface[]>;
  first(): DequeryInterface;
  last(): DequeryInterface;
  next(): DequeryInterface;
  prev(): DequeryInterface;
  find(selector: string): DequeryInterface;
  parent(): DequeryInterface;
  children(): DequeryInterface;
  closest(selector: string): DequeryInterface;
  filter(selector: string): DequeryInterface;

  // Attributes & Properties
  attr(name: string): string | null | Promise<string | null>;
  attr(name: string, value: string): DequeryInterface;
  prop<K extends keyof AllHTMLElements>(
    name: K,
  ): AllHTMLElements[K] | Promise<AllHTMLElements[K]>;
  prop<K extends keyof AllHTMLElements>(
    name: K,
    value: AllHTMLElements[K] | string | boolean | number,
  ): DequeryInterface;

  // CSS & Classes
  css(prop: string): string | Promise<string>;
  css(prop: string, value: string): DequeryInterface;
  css(props: CSSProperties): DequeryInterface;
  addClass(name: string | Array<string>): DequeryInterface;
  removeClass(name: string | Array<string>): DequeryInterface;
  hasClass(name: string): boolean | Promise<boolean>;
  toggleClass(name: string): DequeryInterface;
  animateClass(name: string, duration: number): DequeryInterface;

  // Position Methods
  position():
    | { top: number; left: number }
    | Promise<{ top: number; left: number }>;
  offset():
    | { top: number; left: number }
    | Promise<{ top: number; left: number }>;
  scrollTo(x: number, y: number, options?: ScrollToOptions): DequeryInterface;
  scrollTo(options: ScrollToOptions): DequeryInterface;
  scrollBy(x: number, y: number, options?: ScrollToOptions): DequeryInterface;
  scrollBy(options: ScrollToOptions): DequeryInterface;
  scrollIntoView(options?: boolean | ScrollIntoViewOptions): DequeryInterface;

  // Visibility & Dimension Methods
  isVisible(): boolean | Promise<boolean>;
  isHidden(): boolean | Promise<boolean>;
  dimension():
    | { width: number; height: number }
    | Promise<{ width: number; height: number }>;
  dimension(
    includePadding: boolean,
  ):
    | { width: number; height: number }
    | Promise<{ width: number; height: number }>;
  dimension(
    includeMargin: boolean,
    includePadding: boolean,
  ):
    | { width: number; height: number; outerWidth: number; outerHeight: number }
    | Promise<{
        width: number;
        height: number;
        outerWidth: number;
        outerHeight: number;
      }>;

  // Content Mutations
  empty(): DequeryInterface;
  html(html: string): DequeryInterface;
  jsx(vdom: RenderInput): DequeryInterface;
  text(text: string): DequeryInterface;
  update(input: string | RenderInput): DequeryInterface;
  remove(): DequeryInterface;
  replaceWith(
    content: string | RenderInput | NodeType | Ref<NodeType> | DequeryInterface,
  ): DequeryInterface;
  append(content: string | NodeType | DequeryInterface): DequeryInterface;
  appendTo(
    target: NodeType | Ref<NodeType> | string | DequeryInterface,
  ): DequeryInterface;

  // Events & Interaction
  on(event: string, handler: EventListener): DequeryInterface;
  off(event: string): DequeryInterface; // Overload for removing all listeners for an event
  off(event: string, handler: EventListener): DequeryInterface;
  trigger(eventType: string): DequeryInterface;
  clearEvents(): DequeryInterface;

  // Data Extraction
  val(val?: string | boolean): DequeryInterface;
  map<T>(cb: (el: NodeType, idx: number) => T): T[] | Promise<T[]>;
  toArray(): NodeType[] | Promise<NodeType[]>;
  data(name: string): string | undefined | Promise<string | undefined>;
  data(name: string, val: string): DequeryInterface;
  form(): FormKeyValues | Promise<FormKeyValues>;
  form(formData: Record<string, string | boolean>): DequeryInterface;

  // Promise interface
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?:
      | ((value: any) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2>;
  catch<TResult = never>(
    onrejected?:
      | ((reason: any) => TResult | PromiseLike<TResult>)
      | undefined
      | null,
  ): Promise<any | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<any>;

  // Array-like methods
  [Symbol.iterator](): Iterator<NodeType>;
}

class CallChainImpl implements DequeryArrayLike {
  [index: number]: NodeType;

  options: DequeryOptions;
  callStack: Array<Call>;
  chainStack: Array<Array<Call>>;
  elements: Array<NodeType>;
  prevElements: Array<NodeType>;
  stoppedWithError: Error | null;
  lastResult: any;
  isResolved: boolean;

  // --- Constructor with memory management ---
  constructor(options: DequeryOptions = {}, isResolved = false) {
    this.options = { ...adefaultConfig, ...options };
    this.callStack = [];
    this.chainStack = [];
    this.elements = options.elements ? options.elements : [];
    this.prevElements = [];
    this.stoppedWithError = null;
    this.lastResult = null;
    this.isResolved = isResolved;

    // Create a proxy to allow array-like access and proper "this" binding
    const proxy = new Proxy(this, {
      get(target, prop) {
        if (typeof prop === "string" && !Number.isNaN(Number(prop))) {
          return target.elements[Number(prop)] as NodeType;
        }
        const value = (target as any)[prop];
        if (typeof value === "function") {
          // biome-ignore lint/complexity/useArrowFunction: <explanation>
          return function (...args: any[]) {
            // Bind method calls to the proxy so that "this" remains the proxy
            return value.apply(proxy, args);
          };
        }
        return value;
      },
    });

    // biome-ignore lint/correctness/noConstructorReturn: <explanation>
    return proxy;
  }

  // --- Internal ---
  resetElements() {
    this.prevElements = [...this.elements];
    this.elements = this.options.elements ? this.options.elements : [];
  }
  getFirstElement() {
    return this.elements[0];
  }

  createSubChain(clone = true) {
    // Simplified: Always create a new, resolved chain instance.
    // The constructor correctly initializes `elements` from the options.
    // Pass a *copy* of the current elements to avoid shared references.
    const newChain = new DequeryChain(
      {
        ...this.options,
        elements: [...this.elements], // Pass a copy of the current elements
      },
      true, // isResolved = true, as it represents a completed state
    );
    // The new chain's lastResult should probably reflect its own state,
    // but leaving it to the default constructor behavior (null) is likely fine.
    // No need to copy callStack, chainStack etc. from the old chain.
    return newChain;
  }

  // --- Initialization ---
  __init(
    selectorHtmlRefOrElementRef:
      | string
      | NodeType
      | Ref<NodeType, any>
      | RenderInput,
    options: DequeryOptions | ElementCreationOptions,
  ) {
    if (!selectorHtmlRefOrElementRef)
      throw new Error("dequery: selector/ref/element required");
    if (typeof selectorHtmlRefOrElementRef === "string") {
      if (selectorHtmlRefOrElementRef.indexOf("<") === 0) {
        this.elements = renderHTML(selectorHtmlRefOrElementRef);

        const { text, html, ...attributes } = options as ElementCreationOptions;

        if (
          typeof this.elements[0] !== "undefined" &&
          this.elements[0] instanceof Element
        ) {
          // set attributes
          Object.entries(attributes).forEach(([key, value]) => {
            (this.elements[0] as Element).setAttribute(key, String(value));
          });

          // set innerHTML or textContent if provided
          if (html) {
            this.elements[0].innerHTML = html;
          } else if (text) {
            this.elements[0].textContent = text;
          }
        }
        return this.createSubChain();
      } else {
        return this.query(selectorHtmlRefOrElementRef);
      }
    } else if (isRef(selectorHtmlRefOrElementRef)) {
      return this.ref(selectorHtmlRefOrElementRef);
    } else if ((selectorHtmlRefOrElementRef as Node).nodeType) {
      this.elements = [selectorHtmlRefOrElementRef as NodeType];
      return this.createSubChain();
    } else if (isJSX(selectorHtmlRefOrElementRef)) {
      const renderResult = renderIsomorphicSync(
        selectorHtmlRefOrElementRef as RenderInput,
        undefined,
        globalThis as Globals,
      );
      this.elements = (
        typeof renderResult !== "undefined"
          ? Array.isArray(renderResult)
            ? renderResult
            : [renderResult]
          : []
      ) as NodeType[];
      return this.createSubChain();
    }
    throw new Error("Unsupported selectorOrEl type");
  }

  // --- Traversal ---
  debug(cb: (el: NodeType | Array<NodeType>) => void) {
    this.callStack.push(
      new Call(function debug(this: CallChainImpl) {
        cb(this.elements);
        return this.createSubChain(true);
      }),
    );
    return this;
  }

  ref(ref: Ref<NodeType>) {
    this.callStack.push(
      new Call(async function ref(this: CallChainImpl, refObj: Ref<NodeType>) {
        await waitForRef(refObj, this.options.maxWaitMs!);
        if (refObj.current) {
          this.elements = [elementGuard(refObj.current)];
        } else {
          throw new Error("Ref is null or undefined");
        }
        return this.createSubChain();
      }, ref),
    );
    return this;
  }

  query(selector: string) {
    this.callStack.push(
      new Call(async function query(this: CallChainImpl, sel: string) {
        await waitForSelector(sel, this.options.maxWaitMs!);
        this.elements = Array.from(document.querySelectorAll(sel));
        return this.createSubChain();
      }, selector),
    );
    return this;
  }

  all() {
    this.callStack.push(
      new Call(function all(this: CallChainImpl) {
        return this.elements.map(
          (el) => new DequeryChain({ ...this.options, elements: [el] }, true),
        );
      }),
    );
    return this;
  }

  get length(): number {
    return this.elements.length;
  }

  first() {
    this.callStack.push(
      new Call(function first(this: CallChainImpl) {
        this.elements = [this.elements[0]];
        return this.createSubChain(true);
      }),
    );
    return this;
  }

  last() {
    this.callStack.push(
      new Call(function last(this: CallChainImpl) {
        const els = this.elements;
        this.elements = [els[els.length - 1]];
        return this.createSubChain();
      }),
    );
    return this;
  }

  next() {
    this.callStack.push(
      new Call(function next(this: CallChainImpl) {
        this.elements = this.elements
          .map((el) => {
            // Safely access nextElementSibling, returns null if none
            return el instanceof Element ? el.nextElementSibling : null;
          })
          // Filter out nulls and ensure correct type
          .filter((el): el is Element => el instanceof Element);
        // Return a new chain instance representing the result
        return this.createSubChain();
      }),
    );
    return this;
  }

  prev() {
    this.callStack.push(
      new Call(function prev(this: CallChainImpl) {
        this.elements = this.elements
          .map((el) => {
            // Safely access previousElementSibling, returns null if none
            return el instanceof Element ? el.previousElementSibling : null;
          })
          // Filter out nulls and ensure correct type
          .filter((el): el is Element => el instanceof Element);
        // Return a new chain instance representing the result
        return this.createSubChain();
      }),
    );
    return this;
  }

  find(selector: string) {
    this.callStack.push(
      new Call(function find(this: CallChainImpl, sel: string) {
        this.elements = this.elements.flatMap((el) =>
          Array.from(elementGuard(el).querySelectorAll(sel)),
        );
        return this.createSubChain();
      }, selector),
    );
    return this;
  }

  parent() {
    this.callStack.push(
      new Call(function parent(this: CallChainImpl) {
        this.elements = this.elements
          .map((el) => (el as Element).parentElement!)
          .filter(Boolean);
        return this.createSubChain();
      }),
    );
    return this;
  }

  children() {
    this.callStack.push(
      new Call(function children(this: CallChainImpl) {
        this.elements = this.elements.flatMap((el) =>
          Array.from(elementGuard(el).children),
        );
        return this.createSubChain();
      }),
    );
    return this;
  }

  closest(selector: string) {
    this.callStack.push(
      new Call(function closest(this: CallChainImpl, sel: string) {
        this.elements = this.elements
          .map((el) => elementGuard(el).closest(sel)!)
          .filter(Boolean);
        return this.createSubChain();
      }, selector),
    );
    return this;
  }

  filter(selector: string) {
    this.callStack.push(
      new Call(function filter(this: CallChainImpl, sel: string) {
        // Always use the most efficient approach for filtering elements
        // Native matches() API is faster than custom filtering
        this.elements = this.elements.filter(
          (el) => el instanceof Element && el.matches(sel),
        );

        // ensure the chain is created with the correct number of elements
        return this.createSubChain(this.elements.length > 0);
      }, selector),
    );
    return this;
  }

  // --- Attributes & Properties ---
  attr(name: string, value?: string) {
    if (value !== undefined) {
      this.callStack.push(
        new Call(
          function setAttr(this: CallChainImpl, n: string, v: string) {
            this.elements.forEach((el) => elementGuard(el).setAttribute(n, v));
            return null;
          },
          name,
          value,
        ),
      );
      return this;
    }
    this.callStack.push(
      new Call(function getAttr(this: CallChainImpl, n: string) {
        return elementGuard(this.getFirstElement()).getAttribute(n);
      }, name),
    );
    return this;
  }

  prop(name: keyof AllHTMLElements, value?: any) {
    if (value !== undefined) {
      this.callStack.push(
        new Call(
          function setProp(this: CallChainImpl, n: string, v: any) {
            // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
            this.elements.forEach((el) => ((elementGuard(el) as any)[n] = v));
            return null;
          },
          name,
          value,
        ),
      );
      return this;
    }
    this.callStack.push(
      new Call(function getProp(this: CallChainImpl, n: string) {
        return (elementGuard(this.getFirstElement()) as any)[n];
      }, name),
    );
    return this;
  }

  // --- CSS & Classes ---
  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === "string" && value === undefined) {
      this.callStack.push(
        new Call(function getCss(this: CallChainImpl, p: string) {
          return elementGuard(this.getFirstElement()).style.getPropertyValue(p);
        }, prop),
      );
    } else {
      this.callStack.push(
        new Call(
          function setCss(this: CallChainImpl, p: any, v?: string) {
            this.elements.forEach((el) => {
              const elementStyle = elementGuard<HTMLElement>(el).style;
              if (typeof p === "string") {
                // Use setProperty for single string property for consistency with getPropertyValue
                elementStyle.setProperty(p, v!);
              } else {
                // For object properties, assign directly to handle camelCase
                for (const k in p) {
                  if (Object.prototype.hasOwnProperty.call(p, k)) {
                    // @ts-ignore - Allow indexing style object with string key
                    elementStyle[k] = (p as any)[k];
                  }
                }
              }
            });
            return null;
          },
          prop,
          value,
        ),
      );
    }
    return this;
  }

  addClass(name: string | Array<string>) {
    this.callStack.push(
      new Call(function addClass(this: CallChainImpl, cl: any) {
        const list = Array.isArray(cl) ? cl : [cl];
        this.elements.forEach((el) => elementGuard(el).classList.add(...list));
        return null;
      }, name),
    );
    return this;
  }

  removeClass(name: string | Array<string>) {
    this.callStack.push(
      new Call(function removeClass(this: CallChainImpl, cl: any) {
        const list = Array.isArray(cl) ? cl : [cl];
        this.elements.forEach((el) =>
          elementGuard(el).classList.remove(...list),
        );
        return null;
      }, name),
    );
    return this;
  }

  hasClass(name: string) {
    this.callStack.push(
      new Call(function hasClass(this: CallChainImpl, cl: string) {
        return this.elements.every((el) =>
          elementGuard(el).classList.contains(cl),
        );
      }, name),
    );
    return this;
  }

  toggleClass(name: string) {
    this.callStack.push(
      new Call(function toggleClass(this: CallChainImpl, cl: string) {
        this.elements.forEach((el) => elementGuard(el).classList.toggle(cl));
        return null;
      }, name),
    );
    return this;
  }

  animateClass(name: string, duration: number) {
    this.callStack.push(
      new Call(
        function animateClass(this: CallChainImpl, cl: string, d: number) {
          this.elements.forEach((el) => {
            const e = elementGuard(el);
            e.classList.add(cl);
            setTimeout(() => e.classList.remove(cl), d);
          });
          return null;
        },
        name,
        duration,
      ),
    );
    return this;
  }

  // --- Position Methods ---
  position() {
    this.callStack.push(
      new Call(function position(this: CallChainImpl) {
        const el = elementGuard<HTMLElement>(this.getFirstElement());
        return {
          top: el.offsetTop,
          left: el.offsetLeft,
        };
      }),
    );
    return this;
  }

  offset() {
    this.callStack.push(
      new Call(function offset(this: CallChainImpl) {
        const el = elementGuard<HTMLElement>(this.getFirstElement());
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
        };
      }),
    );
    return this;
  }

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number) {
    this.callStack.push(
      new Call(
        function scrollTo(
          this: CallChainImpl,
          xOrOptions: number | ScrollToOptions,
          y?: number,
        ) {
          this.elements.forEach((el) => {
            const element = elementGuard<HTMLElement>(el);
            if (typeof xOrOptions === "object") {
              element.scrollTo(xOrOptions);
            } else if (y !== undefined) {
              element.scrollTo(xOrOptions, y);
            } else {
              element.scrollTo(xOrOptions, 0);
            }
          });
          return null;
        },
        xOrOptions,
        y,
      ),
    );
    return this;
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number) {
    this.callStack.push(
      new Call(
        function scrollBy(
          this: CallChainImpl,
          xOrOptions: number | ScrollToOptions,
          y?: number,
        ) {
          this.elements.forEach((el) => {
            const element = elementGuard<HTMLElement>(el);
            if (typeof xOrOptions === "object") {
              element.scrollBy(xOrOptions);
            } else if (y !== undefined) {
              element.scrollBy(xOrOptions, y);
            } else {
              element.scrollBy(xOrOptions, 0);
            }
          });
          return null;
        },
        xOrOptions,
        y,
      ),
    );
    return this;
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
    this.callStack.push(
      new Call(function scrollIntoView(
        this: CallChainImpl,
        options?: boolean | ScrollIntoViewOptions,
      ) {
        if (this.elements.length === 0) return null;

        const el = elementGuard<HTMLElement>(this.getFirstElement());
        el.scrollIntoView(options);
        return null;
      }, options),
    );
    return this;
  }

  // --- Visibility & Dimension Methods ---
  isVisible() {
    this.callStack.push(
      new Call(function isVisible(this: CallChainImpl) {
        if (this.elements.length === 0) return false;

        const el = elementGuard<HTMLElement>(this.getFirstElement());

        // Use modern Intersection Observer API to determine true visibility
        const style = window.getComputedStyle(el);

        // Check if element has dimensions
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return false;

        // Check if element is hidden via CSS
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          Number.parseFloat(style.opacity) === 0
        )
          return false;

        // Check if element is detached from DOM
        if (!document.body.contains(el)) return false;

        // Check if any parent is hidden which would make this element hidden too
        let parent = el.parentElement;
        while (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.display === "none" ||
            parentStyle.visibility === "hidden" ||
            parentStyle.opacity === "0" ||
            Number.parseFloat(parentStyle.opacity) === 0
          ) {
            return false;
          }
          parent = parent.parentElement;
        }

        return true;
      }),
    );
    return this;
  }

  isHidden() {
    this.callStack.push(
      new Call(function isHidden(this: CallChainImpl) {
        if (this.elements.length === 0) return true;

        // Reuse logic from isVisible but invert the result
        const el = elementGuard<HTMLElement>(this.getFirstElement());

        const style = window.getComputedStyle(el);

        // Check if element has dimensions
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return true;

        // Check if element is hidden via CSS
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          Number.parseFloat(style.opacity) === 0
        )
          return true;

        // Check if element is detached from DOM
        if (!document.body.contains(el)) return true;

        // Check if any parent is hidden which would make this element hidden too
        let parent = el.parentElement;
        while (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.display === "none" ||
            parentStyle.visibility === "hidden" ||
            parentStyle.opacity === "0" ||
            Number.parseFloat(parentStyle.opacity) === 0
          ) {
            return true;
          }
          parent = parent.parentElement;
        }

        return false;
      }),
    );
    return this;
  }

  dimension(
    includeMarginOrPadding?: boolean,
    includePaddingIfMarginTrue?: boolean,
  ) {
    this.callStack.push(
      new Call(
        function dimension(
          this: CallChainImpl,
          includeMarginOrPadding?: boolean,
          includePaddingIfMarginTrue?: boolean,
        ) {
          const el = elementGuard<HTMLElement>(this.getFirstElement());
          const style = window.getComputedStyle(el);

          // Get base element dimensions from getBoundingClientRect
          const rect = el.getBoundingClientRect();
          let width = rect.width;
          let height = rect.height;

          let includeMargin = false;
          let includePadding = true; // Default based on getBoundingClientRect

          // Determine flags based on arguments provided
          if (includePaddingIfMarginTrue !== undefined) {
            // Both arguments provided: dimension(includeMargin, includePadding)
            includeMargin = !!includeMarginOrPadding;
            includePadding = !!includePaddingIfMarginTrue;
          } else if (includeMarginOrPadding !== undefined) {
            // One argument provided: dimension(includePadding)
            // The first argument controls padding inclusion in this case.
            includePadding = !!includeMarginOrPadding;
          }

          // Subtract padding if includePadding is false
          if (!includePadding) {
            const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
            const paddingRight = Number.parseFloat(style.paddingRight) || 0;
            const paddingTop = Number.parseFloat(style.paddingTop) || 0;
            const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

            // Subtract border widths as well, since getBoundingClientRect includes them
            const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
            const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
            const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
            const borderBottom =
              Number.parseFloat(style.borderBottomWidth) || 0;

            width -= paddingLeft + paddingRight + borderLeft + borderRight;
            height -= paddingTop + paddingBottom + borderTop + borderBottom;
          }

          // If includeMargin is true, calculate outer dimensions
          if (includeMargin) {
            const marginLeft = Number.parseFloat(style.marginLeft) || 0;
            const marginRight = Number.parseFloat(style.marginRight) || 0;
            const marginTop = Number.parseFloat(style.marginTop) || 0;
            const marginBottom = Number.parseFloat(style.marginBottom) || 0;

            // Outer width/height calculation depends on whether padding/border were included in the base width/height
            const baseWidthForOuter = includePadding ? rect.width : width; // Use calculated width if padding/border were subtracted
            const baseHeightForOuter = includePadding ? rect.height : height; // Use calculated height if padding/border were subtracted

            const outerWidth = baseWidthForOuter + marginLeft + marginRight;
            const outerHeight = baseHeightForOuter + marginTop + marginBottom;

            return {
              width,
              height,
              outerWidth,
              outerHeight,
            };
          }

          // Otherwise return simple dimensions (potentially adjusted for padding/border)
          return {
            width,
            height,
          };
        },
        includeMarginOrPadding,
        includePaddingIfMarginTrue,
      ),
    );
    return this;
  }

  // --- Content Mutations ---
  empty() {
    this.callStack.push(
      new Call(function empty(this: CallChainImpl) {
        this.elements.forEach((el) => {
          const element = elementGuard(el);
          while (element.firstChild) {
            element.firstChild.remove();
          }
        });
        return null;
      }),
    );
    return this;
  }

  html(html: string) {
    this.callStack.push(
      new Call(function html(this: CallChainImpl, str: string) {
        // Use DocumentFragment for better performance with batch DOM operations
        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = str;

        // Move all nodes from the tempDiv to the fragment
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }

        this.elements.forEach((el) => {
          // Clear element content
          const element = elementGuard(el);
          while (element.firstChild) {
            element.firstChild.remove();
          }

          // Append clone of fragment for each element
          element.appendChild(fragment.cloneNode(true));
        });

        return null;
      }, html),
    );
    return this;
  }

  jsx(vdom: RenderInput) {
    if (!isJSX(vdom)) {
      console.warn("jsx: expected JSX, got", vdom);
      return this;
    }
    this.callStack.push(
      new Call(function jsx(this: CallChainImpl, v: RenderInput) {
        this.elements.forEach((el) =>
          updateDomWithVdom(elementGuard(el), v, globalThis as Globals),
        );
        return null;
      }, vdom),
    );
    return this;
  }

  text(text: string) {
    this.callStack.push(
      new Call(function text(this: CallChainImpl, t: string) {
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        this.elements.forEach((el) => (elementGuard(el).textContent = t));
        return null;
      }, text),
    );
    return this;
  }

  update(input: string | RenderInput) {
    this.callStack.push(
      new Call(function update(this: CallChainImpl, input: any) {
        if (typeof input === "string") {
          const hasHtml = /<\/?[a-z][\s\S]*>/i.test(input);
          if (hasHtml)
            this.elements.forEach((el) => updateDom(elementGuard(el), input));
          else
            this.elements.forEach((el) => {
              elementGuard(el).textContent = input;
            });
        } else {
          this.elements.forEach((el) =>
            updateDomWithVdom(elementGuard(el), input, globalThis as Globals),
          );
        }
        return null;
      }, input),
    );
    return this;
  }

  remove() {
    this.callStack.push(
      new Call(function remove(this: CallChainImpl) {
        this.elements.forEach((el) => elementGuard(el).remove());
        return null;
      }),
    );
    return this;
  }

  replaceWith(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType>
      | typeof DequeryChain,
  ) {
    this.callStack.push(
      new Call(async function replaceWith(
        this: CallChainImpl,
        content:
          | string
          | RenderInput
          | NodeType
          | Ref<NodeType>
          | typeof DequeryChain,
      ) {
        let newElement: NodeType;

        if (typeof content === "string") {
          const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
          if (hasHtmlTags) {
            newElement = renderHTML(content)[0];
          } else {
            newElement = document.createTextNode(content);
          }
        } else if (isJSX(content)) {
          newElement = renderIsomorphicSync(
            content as RenderInput,
            undefined,
            globalThis as Globals,
          ) as NodeType;
        } else if (isRef(content)) {
          await waitForRef(content as Ref, this.options.maxWaitMs!);
          newElement = elementGuard(content.current!);
        } else if (content instanceof Node) {
          newElement = content;
        } else if (content instanceof DequeryChain) {
          newElement = content.getFirstElement();
        } else {
          console.warn("replaceWith: unsupported content type", content);
          return null;
        }

        this.elements.forEach((el) => {
          if (el.parentNode) {
            // Create a fresh clone for each replacement to avoid side effects
            const clone = newElement.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
          }
        });
        return null;
      }, content),
    );
    return this;
  }

  append(content: string | NodeType | typeof DequeryChain) {
    this.callStack.push(
      new Call(function append(
        this: CallChainImpl,
        c: string | NodeType | typeof DequeryChain,
      ) {
        // Add check for null or undefined content
        if (c == null) {
          return null; // Do nothing if content is null or undefined
        }
        this.elements.forEach((el) => {
          if (typeof c === "string") {
            elementGuard(el).innerHTML += c;
          } else if (c instanceof DequeryChain) {
            c.elements.forEach((childEl) => {
              // Ensure childEl is a Node before cloning
              if (childEl instanceof Node) {
                el.appendChild(childEl.cloneNode(true));
              }
            });
          } else if (c instanceof Node) {
            // Check if c is a Node
            el.appendChild(c.cloneNode(true));
          } else {
            console.warn("append: unsupported content type", c);
          }
        });
        return null;
      }, content),
    );
    return this;
  }

  appendTo(target: NodeType | Ref<NodeType> | string | typeof DequeryChain) {
    this.callStack.push(
      new Call(async function appendTo(
        this: CallChainImpl,
        target: NodeType | Ref<NodeType> | string,
      ) {
        let targetElement: NodeType;

        if (isRef(target)) {
          await waitForRef(target as Ref, this.options.maxWaitMs!);
          targetElement = elementGuard(target.current!);
        } else if (typeof target === "string") {
          await waitForSelector(target, this.options.maxWaitMs!);
          targetElement = elementGuard(
            document.querySelector(target) as NodeType,
          );
        } else if (target instanceof Node) {
          targetElement = elementGuard(target);
        } else if (target instanceof DequeryChain) {
          targetElement = elementGuard(target.getFirstElement());
        } else {
          console.warn("appendTo: expected selector, ref or node, got", target);
          return null;
        }

        this.elements.forEach((el) => {
          targetElement.appendChild(el.cloneNode(true));
        });
        return null;
      }, target),
    );
    return this;
  }

  // --- Events & Interaction ---
  // Enhanced event binding with tracking for cleanup
  on(event: string, handler: EventListener) {
    this.callStack.push(
      new Call(
        function on(this: CallChainImpl, ev: string, h: EventListener) {
          this.elements.forEach((el) => {
            const elem = elementGuard(el);

            // Store event bindings for potential cleanup
            if (!elem._dequeryEvents) {
              elem._dequeryEvents = new Map();
            }

            if (!elem._dequeryEvents.has(ev)) {
              elem._dequeryEvents.set(ev, new Set());
            }

            elem._dequeryEvents.get(ev)!.add(h);
            elem.addEventListener(ev, h);
          });
          return null;
        },
        event,
        handler,
      ),
    );
    return this;
  }

  off(event: string, handler?: EventListener) {
    this.callStack.push(
      new Call(
        function off(this: CallChainImpl, ev: string, h?: EventListener) {
          this.elements.forEach((el) => {
            const elem = elementGuard(el);

            if (h) {
              // Remove specific handler
              elem.removeEventListener(ev, h);

              // Update tracking
              if (elem._dequeryEvents?.has(ev)) {
                elem._dequeryEvents.get(ev)!.delete(h);
                if (elem._dequeryEvents.get(ev)!.size === 0) {
                  elem._dequeryEvents.delete(ev);
                }
              }
            } else {
              // Remove all handlers for this event type
              if (elem._dequeryEvents?.has(ev)) {
                elem._dequeryEvents
                  .get(ev)!
                  .forEach((handler: EventListener) => {
                    elem.removeEventListener(ev, handler);
                  });
                elem._dequeryEvents.delete(ev);
              }
            }
          });
          return null;
        },
        event,
        handler,
      ),
    );
    return this;
  }

  // Method to remove all event listeners
  clearEvents() {
    this.callStack.push(
      new Call(function clearEvents(this: CallChainImpl) {
        this.elements.forEach((el) => {
          const elem = elementGuard(el);
          if (elem._dequeryEvents) {
            elem._dequeryEvents.forEach((handlers, eventType) => {
              handlers.forEach((handler: EventListener) => {
                elem.removeEventListener(eventType, handler);
              });
            });
            elem._dequeryEvents.clear();
          }
        });
        return null;
      }),
    );
    return this;
  }

  trigger(eventType: string) {
    this.callStack.push(
      new Call(function trigger(this: CallChainImpl, ev: string) {
        this.elements.forEach((el) =>
          elementGuard(el).dispatchEvent(
            new Event(ev, { bubbles: true, cancelable: true }),
          ),
        );
        return null;
      }, eventType),
    );
    return this;
  }

  // --- Data Extraction ---
  val(val?: string | boolean) {
    if (val !== undefined) {
      this.callStack.push(
        new Call(function setVal(this: CallChainImpl, v: any) {
          this.elements.forEach((el) => {
            const input = el as HTMLInputElement;
            if (input.type === "checkbox" && typeof v === "boolean") {
              input.checked = v;
            } else {
              input.value = String(v);
            }
          });
          return null;
        }, val),
      );
    } else {
      this.callStack.push(
        new Call(function getVal(this: CallChainImpl) {
          const el = elementGuard<HTMLInputElement>(this.getFirstElement());
          if (el.type === "checkbox") {
            return el.checked;
          }
          return el.value;
        }),
      );
    }
    return this;
  }

  map(cb: (el: NodeType, idx: number) => any) {
    this.callStack.push(
      new Call(function map(this: CallChainImpl, fn: any) {
        return this.elements.map(fn);
      }, cb),
    );
    return this;
  }

  toArray() {
    this.callStack.push(
      new Call(function toArray(this: CallChainImpl) {
        return [...this.elements];
      }),
    );
    return this;
  }

  data(name: string, val?: string) {
    if (val !== undefined) {
      this.callStack.push(
        new Call(
          function setData(this: CallChainImpl, n: string, v: string) {
            // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
            this.elements.forEach((el) => (elementGuard(el).dataset[n] = v));
            return null;
          },
          name,
          val,
        ),
      );
    } else {
      this.callStack.push(
        new Call(function getData(this: CallChainImpl, n: string) {
          return elementGuard(this.getFirstElement()).dataset[n];
        }, name),
      );
    }
    return this;
  }

  form(formData?: Record<string, string | boolean>) {
    if (formData) {
      this.callStack.push(
        new Call(function setForm(
          this: CallChainImpl,
          formData: Record<string, string | boolean>,
        ) {
          this.elements.forEach((el) => {
            if (el instanceof Element) {
              const inputElements = el.querySelectorAll(
                "input, select, textarea",
              ) as NodeListOf<HTMLInputElement>;
              inputElements.forEach((input) => {
                if (["INPUT", "SELECT", "TEXTAREA"].includes(input.tagName)) {
                  const key = input.name || input.id;
                  if (formData[key] !== undefined) {
                    if (input.type === "checkbox") {
                      input.checked = Boolean(formData[key]);
                    } else {
                      input.value = String(formData[key]);
                    }
                  }
                }
              });
            }
          });
          return null;
        }, formData),
      );
    } else {
      this.callStack.push(
        new Call(function getForm(this: CallChainImpl) {
          const formFields: Record<string, string | boolean> = {};
          this.elements.forEach((el) => {
            if (el instanceof Element) {
              const inputElements = el.querySelectorAll(
                "input, select, textarea",
              ) as NodeListOf<HTMLInputElement>;
              inputElements.forEach((input) => {
                if (["INPUT", "SELECT", "TEXTAREA"].includes(input.tagName)) {
                  const key = input.name || input.id;
                  if (input.type === "checkbox") {
                    formFields[key] = input.checked;
                  } else {
                    formFields[key] = input.value;
                  }
                }
              });
            }
          });
          return formFields;
        }),
      );
    }
    return this;
  }

  // --- Terminal then() ---

  // biome-ignore lint/suspicious/noThenProperty: We're implementing a custom promise chain here
  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    if (this.stoppedWithError) return Promise.reject(this.stoppedWithError);

    // If there are no calls in the stack, resolve immediately with the last result
    if (this.callStack.length === 0 && this.isResolved) {
      return Promise.resolve(this.lastResult).then(resolve).catch(reject);
    }

    return runWithTimeGuard(
      this.options.timeout!,
      async () => {
        const results: any[] = [];
        const startTime = Date.now();

        for (const call of this.callStack) {
          if (this.stoppedWithError) break;

          // Check if we've exceeded the overall timeout before executing the next call
          if (Date.now() - startTime > this.options.timeout!) {
            throw new Error(
              `Timeout after ${this.options.timeout}ms in call chain execution`,
            );
          }

          try {
            // Directly await the result of the call function.
            // If the function is async or returns a promise (like animateClass),
            // this will wait for it. If it's sync (like getCss), await does nothing.
            // Rely on the outer runWithTimeGuard for the overall timeout.
            const result = await call.fn.apply(this, call.args);
            results.push(result);

            // Only sleep if there are more calls to process and delay is set
            if (
              this.options.delay! > 0 &&
              results.length < this.callStack.length
            ) {
              await sleep(this.options.delay!);
            }
          } catch (err) {
            this.stoppedWithError = err as Error;
            // Re-throw the error to be caught by runWithTimeGuard or the final .catch()
            throw err;
          }
        }

        // If the loop completed without error
        if (!this.stoppedWithError) {
          this.chainStack.push([...results]);
          this.lastResult =
            results.length > 0 ? results[results.length - 1] : null;
          this.callStack = []; // Clear the stack for the next chain
          // Don't reset elements here, let the next chain operation decide
          this.isResolved = true;
          return this.lastResult;
        } else {
          // If stoppedWithError was set, reject the promise
          // The error should have been thrown and caught by runWithTimeGuard's catch block
          // This path might not be strictly necessary if errors always throw
          throw this.stoppedWithError;
        }
      },
      [], // No specific args for the main async function itself
      (ms, call) => {
        // onError handler for runWithTimeGuard timeout
        this.stoppedWithError = new Error(
          `Timeout after ${ms}ms in call chain execution`,
        );
        this.options.onTimeGuardError!(ms, call);
        // Error is rejected by runWithTimeGuard itself
      },
    )
      .then(resolve)
      .catch(reject); // Attach final resolve/reject handlers
  }

  // --- Array-like methods ---
  [Symbol.iterator]() {
    return this.elements[Symbol.iterator]();
  }
}

// --- Proxy Wrapper ---
export const DequeryChain = new Proxy(CallChainImpl, {
  construct(target, args) {
    const inst = new target(...args);
    return new Proxy(inst, {
      get(obj, prop) {
        if (prop === "then" && inst.isResolved) {
          return Promise.resolve(inst.lastResult);
        }
        inst.isResolved = false;
        return (obj as any)[prop];
      },
    });
  },
});

// --- Entry Points ---
export function dequery(
  selectorRefOrEl: string | NodeType | Ref<NodeType, any> | RenderInput,
  options: DequeryOptions | ElementCreationOptions = adefaultConfig,
): DequeryInterface {
  let promise = new DequeryChain({ ...options, elements: [] }).__init(
    selectorRefOrEl,
    options,
  );
  (async () => {
    // auto-start
    promise = await promise;
  })();
  return promise as unknown as DequeryInterface;
}

export const $: typeof dequery = dequery;
export const D: typeof dequery = dequery;

export type Dequery = DequeryInterface;

export function isDequery(obj: unknown): obj is DequeryInterface {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isResolved" in obj &&
    "lastResult" in obj
  );
}

// --- Helpers ---
export async function waitFor<T>(
  check: () => T | null | undefined,
  timeout: number,
): Promise<T> {
  const start = Date.now();

  return new Promise<T>((resolve, reject) => {
    // Check immediately first
    const initialResult = check();
    if (initialResult != null) {
      return resolve(initialResult);
    }

    // Set up timeout for failure case
    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    // Use MutationObserver for better performance
    const observer = new MutationObserver(() => {
      const result = check();
      if (result != null) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(result);
      }
    });

    // Observe entire document for changes
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
    });
  });
}

export async function waitForSelector(
  sel: string,
  timeout: number,
  interval?: number,
): Promise<Element> {
  return waitFor(() => document.querySelector(sel), timeout);
}

export async function waitForRef<T>(
  ref: { current: T | null },
  timeout: number,
): Promise<T> {
  return waitFor(() => ref.current, timeout);
}

export function renderHTML(
  html: string,
  type: DOMParserSupportedType = "text/html",
) {
  const newDom = new DOMParser().parseFromString(html, type);
  return Array.from(newDom.body.childNodes);
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
export function runWithTimeGuard(
  timeout: number,
  fn: Function,
  args: any[],
  onError: (ms: number, call: Call) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const fakeCall = new Call(fn, ...args);
      onError(timeout, fakeCall);
      reject(new Error(`Function execution timed out after ${timeout}ms`));
    }, timeout);
    (async () => {
      try {
        const result = await fn(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    })();
  });
}
