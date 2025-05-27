import { pick, omit } from "defuss-runtime";
import {
  addElementEvent,
  checkElementVisibility,
  clearElementEvents,
  isMarkup,
  removeElementEvent,
  renderMarkup,
  updateDom,
  updateDomWithVdom,
  waitForDOM,
  processAllFormElements,
} from "../common/dom.js";
import {
  isJSX,
  isRef,
  renderIsomorphicSync,
  type Globals,
  type Ref,
  type RenderInput,
  type AllHTMLElements,
  type CSSProperties,
  type NodeType,
} from "../render/index.js";
import { createTimeoutPromise, waitForRef } from "defuss-runtime";
import type {
  DequeryOptions,
  DequerySyncMethodReturnType,
  Dimensions,
  DOMPropValue,
  FormKeyValues,
  Position,
  ElementCreationOptions,
  FormFieldValue,
} from "./types.js";

// --- Core Async Call & Chain ---

export class Call<NT> {
  name: string;
  fn: (...args: any[]) => Promise<NT>;
  args: any[];
  constructor(
    name: string,
    fn: (...args: any[]) => Promise<NT>,
    ...args: any[]
  ) {
    this.name = name;
    this.fn = fn;
    this.args = args;
  }
}

export const NonChainedReturnCallNames = [
  "getFirstElement",
  "toArray",
  "map",
  "isHidden",
  "isVisible",
  "hasClass",
  "dimension",
  "position",
  "offset",
  "prop",
  "val",
  "form",
  "attr",
  "data",
  "css",
  "html",
  "serialize",
];

export const emptyImpl = async <T>(nodes: Array<T>) => {
  nodes.forEach((el) => {
    const element = el as HTMLElement;
    while (element.firstChild) {
      element.firstChild.remove();
    }
  });
  return nodes as T[];
};

export class CallChainImpl<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
> {
  [index: number]: NT;

  isResolved: boolean;
  options: DequeryOptions<NT>;
  elementCreationOptions: ElementCreationOptions;
  callStack: Call<NT>[];
  resultStack: NT[][];
  stackPointer: number;
  lastResolvedStackPointer: number;
  stoppedWithError: Error | null;
  lastResult: NT[] | CallChainImpl<NT, ET> | CallChainImplThenable<NT, ET>;
  length: number;
  chainStartTime: number;
  chainAsyncStartTime: number;
  chainAsyncFinishTime: number;

  // SSR-ability
  document: Document;
  window: Window;
  performance: Performance;
  Parser: typeof DOMParser;

  constructor(options: DequeryOptions<NT> = {}) {
    // merge default options with user-provided options
    this.options = {
      ...getDefaultDequeryOptions(),
      ...options,
    };

    const optionsKeys = Object.keys(getDefaultDequeryOptions()) as Array<
      keyof DequeryOptions<NT>
    >;

    this.options = pick(this.options, optionsKeys);

    this.window = this.options.globals!.window as Window;
    this.document = this.options.globals!.window!.document as Document;
    this.performance = this.options.globals!.performance as Performance;
    this.Parser = this.options.globals!.window!.DOMParser as typeof DOMParser;

    const elementCreationOptions: ElementCreationOptions = omit(
      options,
      optionsKeys,
    );

    this.elementCreationOptions = elementCreationOptions;

    this.callStack = [];
    this.resultStack = (
      options.resultStack ? [options.resultStack] : []
    ) as NT[][];
    this.stackPointer = 0;
    this.lastResolvedStackPointer = 0;
    this.stoppedWithError = null;
    this.lastResult = [];
    this.length = 0;
    this.isResolved = false;
    this.chainStartTime = this.performance.now() ?? 0; // mark start of sync chain
    this.chainAsyncStartTime = 0; // mark start of async chain
    this.chainAsyncFinishTime = 0; // mark end of async chain
  }

  get globals(): Globals {
    return this.options.globals as Globals;
  }

  // sync methods

  // currently selected nodes
  get nodes(): NodeType[] {
    return this.resultStack.length > 0
      ? (this.resultStack[this.resultStack.length - 1] as NodeType[])
      : [];
  }

  // allow for for .. of loop
  [Symbol.iterator]() {
    return this.nodes[Symbol.iterator]() as IterableIterator<NT>;
  }

  // async, direct result method

  getFirstElement() {
    return createCall(
      this,
      "getFirstElement",
      async () => this[0],
    ) as PromiseLike<NT>;
  }

  // async, wrapped/chainable API methods

  debug(cb: (chain: CallChainImpl<NT, ET>) => void) {
    return createCall(this, "debug", async () => {
      cb(this);
      return this.nodes as NT;
    });
  }

  ref(ref: Ref<NodeType>) {
    return createCall(this, "ref", async () => {
      await waitForRef(ref, this.options.timeout!);
      if (ref.current) {
        return [ref.current] as NT;
      } else {
        throw new Error("Ref is null or undefined");
      }
    });
  }

  query(selector: string) {
    return createCall(this, "query", async () => {
      return Array.from(
        await waitForDOM(
          () => Array.from(this.document.querySelectorAll(selector) || []),
          this.options.timeout!,
          this.document,
        ),
      ) as NT;
    });
  }

  next() {
    return traverse(this, "next", (el) => el.nextElementSibling);
  }

  prev() {
    return traverse(this, "prev", (el) => el.previousElementSibling);
  }

  find(
    selector: string,
  ): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
    return createCall(this, "find", async () => {
      // Use Promise.all to wait for all elements to be found
      const results = await Promise.all(
        this.nodes.map(async (el) => {
          return await waitForDOM(
            () => Array.from((el as HTMLElement).querySelectorAll(selector)),
            this.options.timeout!,
            this.document,
          );
        }),
      );
      return results.flat() as NT;
    }) as CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET>;
  }

  parent() {
    return traverse(this, "parent", (el) => el.parentElement);
  }

  children() {
    return traverse(this, "children", (el) => Array.from(el.children));
  }

  closest(selector: string) {
    return traverse(this, "closest", (el) => el.closest(selector));
  }

  first() {
    return createCall(this, "first", async () => {
      return this.nodes.slice(0, 1) as NT;
    });
  }

  last() {
    return createCall(this, "last", async () => {
      return this.nodes.slice(-1) as NT;
    });
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value: string): PromiseLike<ET>;
  attr(name: string): PromiseLike<string | null>;
  attr(name: string, value?: string) {
    return createGetterSetterCall(
      this,
      "attr",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return null;
        return (this.nodes[0] as HTMLElement).getAttribute(name);
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => (el as HTMLElement).setAttribute(name, val));
      },
    ) as PromiseLike<string | null | ET>;
  }

  // TODO: improve type safety here and remove any
  prop<K extends keyof AllHTMLElements>(
    name: K,
    value: DOMPropValue,
  ): PromiseLike<ET>;
  prop<K extends keyof AllHTMLElements>(name: K): PromiseLike<string>;
  prop<K extends keyof AllHTMLElements>(name: K, value?: DOMPropValue) {
    return createGetterSetterCall(
      this,
      "prop",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return undefined;
        return (this.nodes[0] as any)[name];
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as any)[name] = val;
        });
      },
    ) as PromiseLike<DOMPropValue | ET>;
  }

  // --- CSS & Class Methods ---
  private static resultCache = new WeakMap<Element, Map<string, any>>();

  css(prop: CSSProperties): PromiseLike<ET>;
  css(prop: string, value: string): PromiseLike<ET>;
  css(prop: string): PromiseLike<string>;
  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === "object") {
      // Batch DOM operations for object CSS
      return createCall(this, "css", async () => {
        const elements = this.nodes;
        elements.forEach((el) => {
          const htmlEl = el as HTMLElement;
          Object.entries(prop).forEach(([key, val]) => {
            htmlEl.style.setProperty(
              key.replace(/([A-Z])/g, "-$1").toLowerCase(),
              String(val),
            );
          });
        });
        return this.nodes as NT;
      }) as PromiseLike<ET>;
    }

    return createGetterSetterCall(
      this,
      "css",
      value,
      // Getter with caching
      () => {
        if (this.nodes.length === 0) return "";

        const el = this.nodes[0] as HTMLElement;
        const cache = CallChainImpl.resultCache.get(el) || new Map();
        const cacheKey = `css:${prop}`;

        if (cache.has(cacheKey)) {
          return cache.get(cacheKey);
        }

        const result = el.style.getPropertyValue(prop);
        cache.set(cacheKey, result);
        CallChainImpl.resultCache.set(el, cache);

        return result;
      },
      // Setter with cache invalidation
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).style.setProperty(prop, String(val));
          // Invalidate cache
          const cache = CallChainImpl.resultCache.get(el as Element);
          if (cache) {
            cache.delete(`css:${prop}`);
          }
        });
      },
    ) as PromiseLike<ET | string>;
  }

  addClass(name: string | Array<string>): ET {
    return createCall(this, "addClass", async () => {
      const list = Array.isArray(name) ? name : [name];
      this.nodes.forEach((el) => (el as HTMLElement).classList.add(...list));
      return this.nodes as NT;
    }) as unknown as ET;
  }

  removeClass(name: string | Array<string>): ET {
    return createCall(this, "removeClass", async () => {
      const list = Array.isArray(name) ? name : [name];
      this.nodes.forEach((el) => (el as HTMLElement).classList.remove(...list));
      return this.nodes as NT;
    }) as unknown as ET;
  }

  hasClass(name: string) {
    return createCall(
      this,
      "hasClass",
      async () =>
        this.nodes.every((el) =>
          (el as HTMLElement).classList.contains(name),
        ) as NT,
    ) as PromiseLike<boolean>;
  }

  toggleClass(name: string): ET {
    return createCall(this, "toggleClass", async () => {
      this.nodes.forEach((el) => (el as HTMLElement).classList.toggle(name));
      return this.nodes as NT;
    }) as unknown as ET;
  }

  animateClass(name: string, duration: number): ET {
    return createCall(this, "animateClass", async () => {
      this.nodes.forEach((el) => {
        const e = el as HTMLElement;
        e.classList.add(name);
        setTimeout(() => e.classList.remove(name), duration);
      });
      return this.nodes as NT;
    }) as unknown as ET;
  }

  // --- Content Manipulation Methods ---

  empty(): ET {
    return createCall(
      this,
      "empty",
      async () => emptyImpl(this.nodes) as NT,
    ) as unknown as ET;
  }

  html(): PromiseLike<string>;
  html(html: string): PromiseLike<ET>;
  html(html?: string) {
    return createGetterSetterCall(
      this,
      "html",
      html,
      () => {
        // getter
        if (this.nodes.length === 0) return "";
        return (this.nodes[0] as HTMLElement).innerHTML;
      },
      (val) => {
        // setter
        this.nodes.forEach((el) => {
          (el as HTMLElement).innerHTML = val;
        });
      },
    ) as PromiseLike<string | ET>;
  }

  jsx(vdom: RenderInput): ET {
    if (!isJSX(vdom)) {
      throw new Error("Invalid JSX input");
    }

    return createCall(this, "jsx", async () => {
      this.nodes.forEach((el) =>
        updateDomWithVdom(el as HTMLElement, vdom, globalThis as Globals),
      );
      return this.nodes as NT;
    }) as unknown as ET;
  }

  text(text?: string) {
    return createGetterSetterCall(
      this,
      "text",
      text,
      // Getter function
      () => {
        if (this.nodes.length === 0) return "";
        return (this.nodes[0] as HTMLElement).textContent || "";
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).textContent = val;
        });
      },
    ) as PromiseLike<string>;
  }

  remove(): ET {
    return createCall(this, "remove", async () => {
      const removedElements = [...this.nodes];
      this.nodes.forEach((el) => (el as HTMLElement).remove());
      return removedElements as NT;
    }) as unknown as ET;
  }

  replaceWith<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ): ET {
    return createCall(this, "replaceWith", async () => {
      const newElement = await renderNode(content, this);
      if (!newElement) return this.nodes as NT;

      this.nodes.forEach((el, index) => {
        if (!el || !newElement) return;

        if (el.parentNode) {
          // create a fresh clone for each replacement to avoid side effects
          const clone = newElement.cloneNode(true);
          el.parentNode.replaceChild(clone, el);

          // replace the reference in the __elements array
          this.nodes[index] = clone;

          // update indexing
          mapArrayIndexAccess(this, this);
        }
      });

      return this.nodes as NT;
    }) as unknown as ET;
  }

  append<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ): ET {
    return createCall(this, "append", async () => {
      // Don't do anything if content is null or undefined
      if (content == null) {
        return this.nodes as NT;
      }

      if (content instanceof Node) {
        // If content is a Node, append it directly
        this.nodes.forEach((el) => {
          if (
            el &&
            content &&
            !el.isEqualNode(content) &&
            el.parentNode !== content
          ) {
            (el as HTMLElement).appendChild(content);
          }
        });
        return this.nodes as NT;
      }

      const element = await renderNode(content, this);
      if (!element) return this.nodes as NT;

      if (isDequery(content)) {
        // Special handling for Dequery objects which may contain multiple elements
        this.nodes.forEach((el) => {
          (content as CallChainImpl<T>).nodes.forEach((childEl) => {
            if (
              (childEl as Node).nodeType &&
              (el as Node).nodeType &&
              !(childEl as Node).isEqualNode(el) &&
              el!.parentNode !== childEl
            ) {
              (el as HTMLElement).appendChild(childEl as Node);
            }
          });
        });
      } else if (
        typeof content === "string" &&
        isMarkup(content, this.Parser)
      ) {
        // Special handling for HTML strings which might produce multiple elements
        const elements = renderMarkup(content, this.Parser);
        this.nodes.forEach((el) => {
          elements.forEach((childEl) =>
            (el as HTMLElement).appendChild(childEl.cloneNode(true)),
          );
        });
      } else {
        // Single element handling
        this.nodes.forEach((el) => {
          if (!element) return;
          (el as HTMLElement).appendChild(element.cloneNode(true));
        });
      }

      return this.nodes as NT;
    }) as unknown as ET;
  }

  appendTo<T = NT>(
    target:
      | string
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ): ET {
    return createCall(this, "appendTo", async () => {
      const nodes = await resolveNodes(
        target,
        this.options.timeout!,
        this.document,
      );

      if (nodes.length === 0) {
        console.warn("appendTo: no target elements found");
        return this.nodes as NT;
      }

      nodes.forEach((node) => {
        this.nodes.forEach((el) => {
          if (!node || !el) return;
          node.appendChild(el.cloneNode(true));
        });
      });

      return this.nodes as NT;
    }) as unknown as ET;
  }

  update(input: string | RenderInput | NodeType | Dequery<NT>): ET {
    return createCall(this, "update", async () => {
      if (isDequery(input)) {
        input = input[0] as HTMLElement;
      }

      if (input instanceof Node) {
        (await emptyImpl(this.nodes)) as NT;
        for (let i = 0; i < this.nodes.length; i++) {
          const el = this.nodes[i];
          if (
            !el ||
            !input ||
            el.isEqualNode(input as Node) ||
            el.parentNode === input
          ) {
            continue;
          }
          el.appendChild(input);
        }
        return this.nodes as NT;
      }

      if (typeof input === "string") {
        if (isMarkup(input, this.Parser)) {
          this.nodes.forEach((el) => {
            updateDom(el as HTMLElement, input as string, this.Parser);
          });
        } else {
          this.nodes.forEach((el) => {
            (el as HTMLElement).textContent = input as string;
          });
        }
      } else if (isJSX(input)) {
        this.nodes.forEach((el) => {
          updateDomWithVdom(
            el as HTMLElement,
            input as RenderInput,
            globalThis as Globals,
          );
        });
      } else {
        console.warn("update: unsupported content type", input);
      }
      return this.nodes as NT;
    }) as unknown as ET;
  }

  // --- Event Methods ---

  on(event: string, handler: EventListener): ET {
    return createCall(this, "on", async () => {
      this.nodes.forEach((el) => {
        addElementEvent(el as HTMLElement, event, handler);
      });
      return this.nodes as NT;
    }) as unknown as ET;
  }

  off(event: string, handler?: EventListener): ET {
    return createCall(this, "off", async () => {
      this.nodes.forEach((el) => {
        removeElementEvent(el as HTMLElement, event, handler);
      });
      return this.nodes as NT;
    }) as unknown as ET;
  }

  clearEvents(): ET {
    return createCall(this, "clearEvents", async () => {
      this.nodes.forEach((el) => {
        clearElementEvents(el as HTMLElement);
      });
      return this.nodes as NT;
    }) as unknown as ET;
  }

  trigger(eventType: string): ET {
    return createCall(this, "trigger", async () => {
      this.nodes.forEach((el) =>
        (el as HTMLElement).dispatchEvent(
          new Event(eventType, { bubbles: true, cancelable: true }),
        ),
      );
      return this.nodes as NT;
    }) as unknown as ET;
  }

  // --- Position Methods ---

  position() {
    return createCall(
      this,
      "position",
      async () =>
        ({
          top: (this.nodes[0] as HTMLElement).offsetTop,
          left: (this.nodes[0] as HTMLElement).offsetLeft,
        }) as NT,
    ) as PromiseLike<Position>;
  }

  offset() {
    return createCall(this, "offset", async () => {
      const el = this.nodes[0] as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      } as NT;
    }) as PromiseLike<Position>;
  }

  // --- Data Methods ---

  data(name: string, value?: string) {
    return createGetterSetterCall(
      this,
      "data",
      value,
      // Getter function
      () => {
        if (this.nodes.length === 0) return undefined;
        return (this.nodes[0] as HTMLElement).dataset[name];
      },
      // Setter function
      (val) => {
        this.nodes.forEach((el) => {
          (el as HTMLElement).dataset[name] = val;
        });
      },
    ) as PromiseLike<string | undefined>;
  }

  val(val?: string | boolean) {
    return createGetterSetterCall(
      this,
      "val",
      val,
      // Getter function
      () => {
        if (this.nodes.length === 0) return "";
        const el = this.nodes[0] as HTMLInputElement;
        if (el.type === "checkbox") {
          return el.checked;
        }
        return el.value;
      },
      // Setter function
      (value) => {
        this.nodes.forEach((el) => {
          const input = el as HTMLInputElement;
          if (input.type === "checkbox" && typeof value === "boolean") {
            input.checked = value;
          } else {
            input.value = String(value);
          }
        });
      },
    ) as PromiseLike<string | boolean>;
  }

  serialize(
    format: "querystring" | "json" = "querystring",
  ): PromiseLike<string> {
    const mapValue = (value: string | boolean) =>
      typeof value === "boolean" ? (value ? "on" : "off") : value;

    return createCall(this, "serialize", async () => {
      const formData = getAllFormValues(this);
      if (format === "json") {
        return JSON.stringify(formData) as NT;
      } else {
        const urlSearchParams = new URLSearchParams();
        const keys = Object.keys(formData);
        keys.forEach((key) => {
          const value = formData[key];
          if (typeof value === "string") {
            urlSearchParams.append(key, value);
          } else if (typeof value === "boolean") {
            urlSearchParams.append(key, mapValue(value));
          } else if (Array.isArray(value)) {
            value.forEach((value) =>
              urlSearchParams.append(key, mapValue(value)),
            );
          }
        });
        return urlSearchParams.toString() as NT;
      }
    }) as PromiseLike<string>;
  }

  form<T = FormKeyValues>(formData?: Record<string, string | boolean>) {
    return createGetterSetterCall(
      this,
      "form",
      formData,
      // Getter function
      () => getAllFormValues(this),
      // Setter function
      (values) => {
        this.nodes.forEach((el) => {
          processAllFormElements(el, (input, key) => {
            if (values[key] !== undefined) {
              if (input.type === "checkbox") {
                (input as HTMLInputElement).checked = Boolean(values[key]);
              } else {
                input.value = String(values[key]);
              }
            }
          });
        });
      },
    ) as PromiseLike<T>;
  }

  // --- Dimension Methods ---

  dimension(
    includeMarginOrPadding?: boolean,
    includePaddingIfMarginTrue?: boolean,
  ) {
    return createCall(this, "dimension", async () => {
      if (this.nodes.length === 0) {
        return { width: 0, height: 0 } as NT;
      }

      const el = this.nodes[0] as HTMLElement;
      const style = this.window.getComputedStyle(el);
      if (!style) return { width: 0, height: 0 } as NT;

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
        includePadding = !!includeMarginOrPadding;
      }

      // Subtract padding if includePadding is false
      if (!includePadding) {
        const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(style.paddingRight) || 0;
        const paddingTop = Number.parseFloat(style.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;

        // Subtract border widths as well
        const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
        const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
        const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
        const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;

        width -= paddingLeft + paddingRight + borderLeft + borderRight;
        height -= paddingTop + paddingBottom + borderTop + borderBottom;
      }

      // If includeMargin is true, calculate outer dimensions
      if (includeMargin) {
        const marginLeft = Number.parseFloat(style.marginLeft) || 0;
        const marginRight = Number.parseFloat(style.marginRight) || 0;
        const marginTop = Number.parseFloat(style.marginTop) || 0;
        const marginBottom = Number.parseFloat(style.marginBottom) || 0;

        const baseWidthForOuter = includePadding ? rect.width : width;
        const baseHeightForOuter = includePadding ? rect.height : height;

        const outerWidth = baseWidthForOuter + marginLeft + marginRight;
        const outerHeight = baseHeightForOuter + marginTop + marginBottom;

        return {
          width,
          height,
          outerWidth,
          outerHeight,
        } as NT;
      }

      return {
        width,
        height,
      } as NT;
    }) as PromiseLike<Dimensions>;
  }

  // --- Visibility Methods ---

  isVisible() {
    return createCall(this, "isVisible", async () => {
      if (this.nodes.length === 0) return false as NT;
      const el = this.nodes[0] as HTMLElement;
      return checkElementVisibility(el, this.window, this.document) as NT;
    }) as PromiseLike<boolean>;
  }

  isHidden() {
    return createCall(this, "isHidden", async () => {
      if (this.nodes.length === 0) return true as NT;
      const el = this.nodes[0] as HTMLElement;
      return !checkElementVisibility(el, this.window, this.document) as NT;
    }) as PromiseLike<boolean>;
  }

  // --- Scrolling Methods ---

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number): ET {
    return createCall(this, "scrollTo", async () => {
      return scrollHelper("scrollTo", this.nodes, xOrOptions, y) as NT;
    }) as unknown as ET;
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number): ET {
    return createCall(this, "scrollBy", async () => {
      return scrollHelper("scrollBy", this.nodes, xOrOptions, y) as NT;
    }) as unknown as ET;
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions): ET {
    return createCall(this, "scrollIntoView", async () => {
      if (this.nodes.length === 0) return this.nodes as NT;
      (this.nodes[0] as HTMLElement).scrollIntoView(options);
      return this.nodes as NT;
    }) as unknown as ET;
  }

  // --- Transformation Methods ---

  map<T>(cb: (el: NT, idx: number) => T) {
    return createCall(this, "map", async () => {
      const elements = this.nodes;
      const results: T[] = new Array(elements.length);

      for (let i = 0; i < elements.length; i++) {
        results[i] = cb(elements[i] as NT, i);
      }

      return results as any;
    }) as PromiseLike<T[]>;
  }

  toArray() {
    return createCall(
      this,
      "toArray",
      async () => [...(this.nodes as NT[])] as NT,
    ) as PromiseLike<NT[]>;
  }

  filter(selector: string): ET {
    return createCall(
      this,
      "filter",
      async () =>
        this.nodes.filter(
          (el) => el instanceof Element && el.matches(selector),
        ) as NT,
    ) as unknown as ET;
  }

  // --- Cleanup Methods ---

  /** memory cleanup (chain becomes useless after calling this method) */
  dispose(): PromiseLike<void> {
    return createCall(this, "dispose", async () => {
      this.nodes.forEach((el) => {
        CallChainImpl.resultCache.delete(el as Element);
      });

      this.callStack.length = 0;
      this.resultStack.length = 0;
      this.stackPointer = 0;
      this.lastResolvedStackPointer = 0;

      return undefined as any;
    }) as PromiseLike<void>;
  }

  // TODO:
  // - ready (isReady)
  // - deserialize (from URL string, JSON, etc.)
}

export class CallChainImplThenable<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
> extends CallChainImpl<NT, ET> {
  constructor(options: DequeryOptions<NT> = {}, isResolved = false) {
    super(options);
    this.isResolved = isResolved;
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then(
    onfulfilled?: (value: CallChainImpl<NT, ET>) => CallChainImpl<NT, ET>,
    onrejected?: (reason: any) => any | PromiseLike<any>,
  ): Promise<any> {
    this.chainAsyncStartTime = this.performance.now() ?? 0;

    if (this.stoppedWithError) {
      return Promise.reject(this.stoppedWithError).then(
        onfulfilled as any,
        onrejected,
      );
    }

    if (this.isResolved && this.stackPointer >= this.callStack.length) {
      this.lastResolvedStackPointer = this.stackPointer;
      const lastCallName = this.callStack[this.callStack.length - 1]?.name;

      let result;
      if (NonChainedReturnCallNames.includes(lastCallName)) {
        result = this.lastResult;
      } else {
        // We cannot return a CallChainImplThenable here, because returning
        // a thenable in a thenable will cause the chain to be infinitely recursing.
        // Because we don't want to use a Proxy to intercept the calls,
        // we turn the CallChainImplThenable into a CallChainImpl cloning
        // it's internal state, and marking isResolved as true, as it
        // is, in fact, resolved. This allows to finish the chain for
        // the moment (await will unwrap the Promise), but keep the
        // possibility for any subsequent synchonous calls to be further
        // chained onto the stack (same state, different instance)
        result = createSubChain<NT, ET>(this, CallChainImpl, true);
      }

      // performance metrics tracking
      this.chainAsyncFinishTime =
        (this.performance.now() ?? 0) - this.chainAsyncStartTime;

      return Promise.resolve(result).then(onfulfilled as any, onrejected);
    }

    return runWithTimeGuard<NT>(
      this.options.timeout!,
      async () => {
        //console.log("runWithTimeGuard", this.options.timeout);
        const startTime = Date.now();
        let call: Call<NT>;
        while (this.stackPointer < this.callStack.length) {
          call = this.callStack[this.stackPointer];
          if (Date.now() - startTime > this.options.timeout!) {
            throw new Error(`Timeout after ${this.options.timeout}ms`);
          }

          try {
            //console.log("calling", call.name);

            const callReturnValue = (await call.fn.apply(this)) as NT[];
            this.lastResult = callReturnValue;

            // method returns that return a value directly, don't modify the selection result stack
            // this allows for getting values from elements or modifying elements (e.g. html()) in
            // between selection changes without breaking the chain functionally (the chain expects)
            // all this.resultStack values to be of a DOM node type)
            if (!NonChainedReturnCallNames.includes(call.name)) {
              this.resultStack.push(callReturnValue);
            }

            if (Array.isArray(this.lastResult)) {
              // allow for array-like access, immediately after the call
              // this is important for the next call to be able to access the result index-wise
              mapArrayIndexAccess(this, this);
            }

            this.stackPointer++;
          } catch (err) {
            this.stoppedWithError = err as Error;
            throw err;
          }
        }

        // at this point, we have finished all calls
        this.isResolved = true;

        // performance metrics tracking
        this.chainAsyncFinishTime =
          (this.performance.now() ?? 0) - this.chainAsyncStartTime;

        return this;
      },
      [],
      (ms, call) => {
        this.stoppedWithError = new Error(`Timeout after ${ms}ms`);

        // TODO: implement a onMaxTimeExceeded() method and find it here (Call)
        //this.options.onTimeGuardError!(ms, call);
      },
    )
      .then((result) => {
        onfulfilled!(result);
        return result;
      })
      .catch(onrejected);
  }

  catch<TResult = never>(
    onrejected?: (reason: any) => TResult | PromiseLike<TResult>,
  ): Promise<any | TResult> {
    return this.then(undefined, onrejected);
  }

  finally(onfinally?: () => void): Promise<any> {
    return this.then(
      (value) => {
        onfinally?.();
        return value;
      },
      (reason) => {
        onfinally?.();
        throw reason;
      },
    );
  }
}

export function scrollHelper<T = NodeType>(
  methodName: "scrollTo" | "scrollBy",
  elements: T[],
  xOrOptions: number | ScrollToOptions,
  y?: number,
): T[] {
  elements.forEach((el) => {
    const element = el as unknown as HTMLElement;
    if (typeof xOrOptions === "object") {
      element[methodName](xOrOptions);
    } else if (y !== undefined) {
      element[methodName](xOrOptions, y);
    } else {
      element[methodName](xOrOptions, 0);
    }
  });
  return elements;
}

export function getAllFormValues(
  chain: CallChainImpl<any, any>,
): FormKeyValues {
  const formFields: FormKeyValues = {};

  const mapCheckboxValue = (value: string) => (value === "on" ? true : value);

  chain.nodes.forEach((el) => {
    processAllFormElements(el, (input, key) => {
      if (!key) return; // Skip elements without name/id

      // Handle checkboxes and radio buttons
      if (input instanceof HTMLInputElement) {
        if (input.type === "checkbox") {
          if (input.checked) {
            const value = mapCheckboxValue(input.value);
            if (typeof formFields[key] !== "undefined") {
              formFields[key] = [formFields[key] as FormFieldValue, value];
            } else if (Array.isArray(formFields[key])) {
              (formFields[key] as Array<FormFieldValue>).push(value);
            } else {
              formFields[key] = value;
            }
          }
        } else if (input.type === "radio") {
          // Only include checked radio buttons
          if (input.checked) {
            console.log("input radio value", input.value);
            formFields[key] =
              (input as HTMLInputElement).value === "on"
                ? true
                : (input as HTMLInputElement).value;
          }
        } else if (input.type === "file") {
          // For file inputs, get the file name(s)
          if (input.files?.length) {
            const fileNames = Array.from(input.files).map((file) => file.name);
            formFields[key] = fileNames.length === 1 ? fileNames[0] : fileNames;
          }
        } else {
          // Regular text inputs
          formFields[key] = input.value;
        }
      }
      // Handle select elements
      else if (input instanceof HTMLSelectElement) {
        if (input.multiple) {
          // For multi-select, collect all selected options
          const values = Array.from(input.selectedOptions).map(
            (option) => option.value,
          );
          formFields[key] = values.length === 1 ? values[0] : values;
        } else {
          // Single select
          formFields[key] = input.value;
        }
      }
      // Handle textareas
      else if (input instanceof HTMLTextAreaElement) {
        formFields[key] = input.value;
      }
    });
  });

  console.log("formFields", formFields);
  return formFields;
}

export function delayedAutoStart<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  chain: CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET>,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  if (chain.options.autoStart) {
    setTimeout(async () => {
      // still not started (no then() called)
      if (chain.chainAsyncStartTime === 0) {
        chain = await chain;
      }
    }, chain.options.autoStartDelay!);
  }
  return chain;
}

export interface Dequery<NT>
  extends CallChainImplThenable<NT>,
    CallChainImpl<NT> {}

export function dequery<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  selectorRefOrEl:
    | string
    | NodeType
    | Ref<NodeType, any>
    | RenderInput
    | Function,
  options: DequeryOptions<NT> &
    ElementCreationOptions = getDefaultDequeryOptions(),
): ET {
  // async co-routine execution
  if (typeof selectorRefOrEl === "function") {
    const syncChain = dequery("body", options);
    requestAnimationFrame(async () => {
      const result = await selectorRefOrEl();
      if (!syncChain.isResolved) {
        if (typeof result !== "undefined") {
          const newChain = dequery(result, options);
          syncChain.resultStack = newChain.resultStack;
          syncChain.lastResult = newChain.lastResult;
          mapArrayIndexAccess(newChain, syncChain);
        }
      }
    });
    return delayedAutoStart(syncChain) as unknown as ET;
  }

  // standard options -- selector handling

  const chain = new CallChainImplThenable<NT, ET>({
    ...options,
    resultStack: [],
  });

  if (!selectorRefOrEl)
    throw new Error("dequery: selector/ref/element required");

  if (typeof selectorRefOrEl === "string") {
    if (selectorRefOrEl.indexOf("<") === 0) {
      const elements = renderMarkup(selectorRefOrEl, chain.Parser);
      const renderRootEl = elements[0];

      const { text, html, ...attributes } = chain.elementCreationOptions;

      if (renderRootEl instanceof Element) {
        Object.entries(attributes).forEach(([key, value]) => {
          (renderRootEl as Element).setAttribute(key, String(value));
        });

        if (html) {
          renderRootEl.innerHTML = html;
        } else if (text) {
          renderRootEl.textContent = text;
        }
      }

      chain.resultStack = [elements as NT[]];
      return delayedAutoStart(chain) as unknown as ET;
    } else {
      return delayedAutoStart(
        chain.query(selectorRefOrEl) as CallChainImplThenable<NT, ET>,
      ) as unknown as ET;
    }
  } else if (isRef(selectorRefOrEl)) {
    return delayedAutoStart(
      chain.ref(selectorRefOrEl) as CallChainImplThenable<NT, ET>,
    ) as unknown as ET;
  } else if ((selectorRefOrEl as Node).nodeType) {
    chain.resultStack = [[selectorRefOrEl as NT]];
    return delayedAutoStart(chain) as unknown as ET;
  } else if (isJSX(selectorRefOrEl)) {
    const renderResult = renderIsomorphicSync(
      selectorRefOrEl as RenderInput,
      chain.document.body,
      chain.globals,
    );
    const elements = (
      typeof renderResult !== "undefined"
        ? Array.isArray(renderResult)
          ? renderResult
          : [renderResult]
        : []
    ) as NodeType[];
    chain.resultStack = [elements as NT[]];
    return delayedAutoStart(chain) as unknown as ET;
  }
  throw new Error("Unsupported selectorOrEl type");
}

dequery.extend = <TExtendedClass extends new (...args: any[]) => any>(
  ExtensionClass: TExtendedClass,
) => {
  // Get the prototype of the extension class
  const extensionPrototype = ExtensionClass.prototype;
  const basePrototype = CallChainImpl.prototype;

  // Get all method names from the extension class prototype
  const extensionMethods = Object.getOwnPropertyNames(extensionPrototype);
  const baseMethods = Object.getOwnPropertyNames(basePrototype);

  // Only add methods that don't exist on the base prototype
  extensionMethods.forEach((methodName) => {
    if (
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      // Add to both CallChainImpl and CallChainImplThenable prototypes
      (CallChainImpl.prototype as any)[methodName] =
        extensionPrototype[methodName];
      (CallChainImplThenable.prototype as any)[methodName] =
        extensionPrototype[methodName];
    }
  });

  // Return a typed function that produces instances of the extended class type
  return <NT = DequerySyncMethodReturnType>(
    selectorRefOrEl:
      | string
      | NodeType
      | Ref<NodeType, any>
      | RenderInput
      | Function,
    options?: DequeryOptions<NT> & ElementCreationOptions,
  ): InstanceType<TExtendedClass> => {
    return dequery(
      selectorRefOrEl,
      options,
    ) as unknown as InstanceType<TExtendedClass>;
  };
};

export const $: typeof dequery & {
  extend: <TExtendedClass extends new (...args: any[]) => any>(
    ExtensionClass: TExtendedClass,
  ) => <NT = DequerySyncMethodReturnType>(
    selectorRefOrEl:
      | string
      | NodeType
      | Ref<NodeType, any>
      | RenderInput
      | Function,
    options?: DequeryOptions<NT> & ElementCreationOptions,
  ) => InstanceType<TExtendedClass>;
} = dequery as any;

export function isDequery(
  obj: unknown,
): obj is CallChainImplThenable | CallChainImpl {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isResolved" in obj &&
    "lastResult" in obj &&
    "resultStack" in obj &&
    "callStack" in obj &&
    "stackPointer" in obj
  );
}

export function isDequeryOptionsObject(o: object) {
  return (
    o &&
    typeof o === "object" &&
    (o as DequeryOptions).timeout !== undefined &&
    (o as DequeryOptions).globals !== undefined
  );
}

let defaultOptions: DequeryOptions<any> | null = null;

export function getDefaultDequeryOptions<NT>(): DequeryOptions<NT> {
  if (!defaultOptions) {
    defaultOptions = {
      timeout: 500 /** ms */,
      // even long sync chains would execute in < .1ms
      // so after 1ms, we can assume the "await" in front is
      // missing (intentionally non-blocking in sync code)
      autoStartDelay: 1 /** ms */,
      autoStart: true,
      resultStack: [],
      globals: {
        document: globalThis.document,
        window: globalThis.window,
        performance: globalThis.performance,
      },
    };
  }
  return { ...defaultOptions } as DequeryOptions<NT>;
}

export function mapArrayIndexAccess<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(source: CallChainImpl<NT, ET>, target: CallChainImpl<NT, ET>) {
  const elements = source.nodes;
  // allow for array-like access
  for (let i = 0; i < elements.length; i++) {
    target[i] = elements[i] as NT;
  }
  target.length = elements.length;
}

export function createCall<NT, ET extends Dequery<NT>>(
  chain: CallChainImpl<NT, ET>,
  methodName: string,
  handler: () => Promise<NT>,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  chain.callStack.push(new Call<NT>(methodName, handler));
  return subChainForNextAwait(chain);
}

export function createGetterSetterCall<NT, ET extends Dequery<NT>, T, V>(
  chain: CallChainImpl<NT, ET>,
  methodName: string,
  value: V | undefined,
  getter: () => T,
  setter: (value: V) => void,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  if (value !== undefined) {
    return createCall(chain, methodName, async () => {
      setter(value);
      return chain.nodes as NT;
    });
  } else {
    return createCall(chain, methodName, async () => {
      return getter() as unknown as NT;
    });
  }
}

export function createSubChain<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
>(
  source: CallChainImpl<NT, ET>,
  Constructor:
    | typeof CallChainImpl
    | typeof CallChainImplThenable = CallChainImpl,
  isResolved = false,
) {
  const subChain = new Constructor<NT, ET>(source.options);
  subChain.callStack = source.callStack;
  subChain.resultStack = source.resultStack;
  subChain.stackPointer = source.stackPointer;
  subChain.stoppedWithError = source.stoppedWithError;
  subChain.lastResult = source.lastResult;
  subChain.isResolved =
    typeof isResolved !== "undefined" ? isResolved : source.isResolved;
  subChain.lastResolvedStackPointer = source.lastResolvedStackPointer;

  if (Array.isArray(subChain.lastResult)) {
    mapArrayIndexAccess(source, subChain);
  }
  return delayedAutoStart(subChain);
}

export function subChainForNextAwait<NT, ET extends Dequery<NT>>(
  source: CallChainImpl<NT, ET>,
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  // First continuation of chain case (second await in the chain)
  // The chain was finished by resolving the chain by a then() call.
  // The lastResolvedStackPointer therefore is set to the last call.
  // But in the meantime, the developer has added more calls to the chain.
  // We need to slice the call stack and result stack to the last resolved call.
  // The developer will run the then() again by using the await keyword.
  //
  // Example:
  // const result = await $<HTMLElement>("#container").children().next();
  // const result2 = await result.next();
  //
  // ...we're currently at the synchronous chaining stage here, not the await (then) stage
  // when the next() method called this subChainForNextAwait().
  if (source.lastResolvedStackPointer) {
    source.callStack = source.callStack.slice(source.lastResolvedStackPointer);
    source.stackPointer = source.stackPointer - source.lastResolvedStackPointer;
    source.resultStack = source.resultStack.slice(
      source.lastResolvedStackPointer,
    );
    source.lastResult = source.resultStack[source.resultStack.length - 1] || [];
    source.lastResolvedStackPointer = 0;
    source.stoppedWithError = null;
  }

  // Second continuation (3rd await in a chain case)
  // If this is already a CallChainImplBut not a thenable
  // we need to explicitly return a fresh thenable chain

  // The second chain (see above) finished because the await called the then() again,
  // but this time, no lastResolvedStackPointer is set. However, the chain is in
  // a result state (after then() has been executed). Therefore, the instance is not
  // a CallChainImplThenable but a CallChainImpl. We clone this chain as a
  // CallChainImplThenable and return it.

  // Example:
  // const result = await $<HTMLElement>("#container").children().next();
  // const result2 = await result.next();
  // const result3 = await result2.next(); // we're here.
  return source instanceof CallChainImplThenable
    ? source
    : createSubChain(source, CallChainImplThenable);
}

export function runWithTimeGuard<NT>(
  timeout: number,
  fn: Function,
  args: any[],
  onError: (ms: number, call: Call<NT>) => void,
): Promise<any> {
  return createTimeoutPromise(
    timeout,
    () => fn(...args),
    (ms) => {
      const fakeCall = new Call<NT>("timeout", async () => [] as NT);
      onError(ms, fakeCall);
    },
  );
}

export async function renderNode<T = DequerySyncMethodReturnType>(
  input:
    | string
    | RenderInput
    | NodeType
    | Ref<NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>
    | null
    | undefined,
  chain: CallChainImpl<any> | CallChainImplThenable<any>,
): Promise<NodeType | null> {
  if (input == null) {
    return null;
  }

  if (typeof input === "string") {
    if (isMarkup(input, chain.Parser)) {
      return renderMarkup(input, chain.Parser)[0];
    } else {
      return chain.document.createTextNode(input);
    }
  } else if (isJSX(input)) {
    return renderIsomorphicSync(
      input as RenderInput,
      chain.document.body,
      chain.options.globals as Globals,
    ) as NodeType;
  } else if (isRef(input)) {
    await waitForRef(input as Ref<NodeType>, chain.options.timeout!);
    return input.current!;
  } else if (input && typeof input === "object" && "nodeType" in input) {
    return input as NodeType;
  } else if (isDequery(input)) {
    return (await input.getFirstElement()) as NodeType;
  }
  console.warn("resolveContent: unsupported content type", input);
  return null;
}

export async function resolveNodes<T = DequerySyncMethodReturnType>(
  input:
    | string
    | NodeType
    | Ref<NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>,
  timeout: number,
  document?: Document,
): Promise<NodeType[]> {
  let nodes: NodeType[] = [];

  if (isRef(input)) {
    await waitForRef(input as Ref<NodeType>, timeout);
    nodes = [input.current!];
  } else if (typeof input === "string" && document) {
    const result = await waitForDOM(
      () => {
        const el = document.querySelector(input);
        if (el) {
          return [el];
        } else {
          return [];
        }
      },
      timeout,
      document,
    );
    const el = result[0];
    if (el) nodes = [el as NodeType];
  } else if (input && typeof input === "object" && "nodeType" in input) {
    nodes = [input as NodeType];
  } else if (isDequery(input)) {
    const elements = (input as CallChainImpl<T>).nodes;
    nodes = elements
      .filter((el) => (el as Node).nodeType !== undefined)
      .map((el) => el as NodeType);
  } else {
    console.warn("resolveTargets: expected selector, ref or node, got", input);
  }
  return nodes;
}

export function traverse<NT, R = NT, ET extends Dequery<R> = Dequery<R>>(
  chain: CallChainImpl<NT, any>,
  methodName: string,
  selector: (el: Element) => Element | Element[] | null | undefined,
): ET {
  return createCall(chain as any, methodName, async () => {
    return chain.nodes.flatMap((el) => {
      if (el instanceof Element) {
        try {
          const result = selector(el);
          if (Array.isArray(result)) {
            return result.filter(
              (item): item is Element => item instanceof Element,
            );
          } else if (result instanceof Element) {
            return [result];
          }
        } catch (err) {
          console.warn("Error in traverse selector function:", err);
        }
      }
      return [];
    }) as NT;
  }) as unknown as ET;
}
