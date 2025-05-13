import { pick, omit } from "../common/object.js";
import { updateDom, updateDomWithVdom } from "../common/dom.js";
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

export type FormFieldValue = string | Date | File | boolean | number;
export interface FormKeyValues {
  [keyOrPath: string]: string | boolean;
}

export interface Dimensions {
  width: number;
  height: number;
  outerWidth?: number;
  outerHeight?: number;
}

export interface Position {
  top: number;
  left: number;
}

export type DOMPropValue = string | number | boolean | null;

declare global {
  interface HTMLElement {
    _dequeryEvents?: Map<string, Set<EventListener>>;
  }
}

export interface DequeryOptions<NT = ChainMethodReturnType> {
  timeout?: number;
  autoStart?: boolean;
  autoStartDelay?: number;
  resultStack?: NT[];
  state?: any;
  verbose?: boolean;
  onTimeGuardError?: (ms: number, call: Call<NT>) => void;
  globals?: Partial<Globals>;
}

export function isDequeryOptionsObject(o: object) {
  return (
    o &&
    typeof o === "object" &&
    (o as DequeryOptions).timeout !== undefined &&
    (o as DequeryOptions).globals !== undefined
  );
}

function getDefaultConfig<NT>(): DequeryOptions<NT> {
  return {
    timeout: 500 /** ms */,
    // even long sync chains would execute in < .1ms
    // so after 1ms, we can assume the "await" in front is
    // missing (intentionally non-blocking in sync code)
    autoStartDelay: 1 /** ms */,
    autoStart: true,
    resultStack: [],
    verbose: false,
    onTimeGuardError: () => {},
    globals: {
      document: globalThis.document,
      window: globalThis.window,
      performance: globalThis.performance,
    },
  };
}

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase &
  JSX.HTMLAttributesLowerCase & { html?: string; text?: string };

type ChainMethodReturnType =
  | Array<NodeType>
  | NodeType
  | string
  | boolean
  | null;

// --- Core Async Call & Chain ---
class Call<NT> {
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

const NonChainedReturnCallNames = [
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
];

export class CallChainImpl<NT = ChainMethodReturnType> {
  [index: number]: NT;

  isResolved: boolean;
  options: DequeryOptions<NT>;
  elementCreationOptions: ElementCreationOptions;
  callStack: Call<NT>[];
  resultStack: NT[][];
  stackPointer: number;
  lastResolvedStackPointer: number;
  stoppedWithError: Error | null;
  lastResult: NT[] | CallChainImpl<NT> | CallChainImplThenable<NT>;
  length: number;
  chainStartTime: number;
  chainAsyncStartTime: number;
  chainAsyncFinishTime: number;

  constructor(options: DequeryOptions<NT> = {}) {
    // merge default options with user-provided options
    this.options = {
      ...getDefaultConfig(),
      ...options,
    };

    const optionsKeys = Object.keys(getDefaultConfig()) as Array<
      keyof DequeryOptions<NT>
    >;

    this.options = pick(this.options, optionsKeys);

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

  get window(): Window {
    return this.options.globals!.window as Window;
  }

  get document(): Document {
    return this.options.globals!.window!.document as Document;
  }

  get performance(): Performance {
    return this.options.globals!.performance as Performance;
  }

  get globals(): Globals {
    return this.options.globals as Globals;
  }

  // sync methods

  // currently selected elements
  get __elements(): NodeType[] {
    return this.resultStack.length > 0
      ? (this.resultStack[this.resultStack.length - 1] as NodeType[])
      : [];
  }

  // allow for for .. of loop
  [Symbol.iterator]() {
    return this.__elements[Symbol.iterator]() as IterableIterator<NT>;
  }

  // async, direct result method

  getFirstElement() {
    return this.createCall(
      "getFirstElement",
      async () => this[0],
    ) as PromiseLike<NT>;
  }

  // async, wrapped/chainable API methods

  debug(cb: (chain: CallChainImpl<NT>) => void) {
    return this.createCall("debug", async () => {
      cb(this);
      return this.__elements as NT;
    });
  }

  ref(ref: Ref<NodeType>) {
    return this.createCall("ref", async () => {
      await waitForRef(ref, this.options.timeout!);
      if (ref.current) {
        return [ref.current] as NT;
      } else {
        throw new Error("Ref is null or undefined");
      }
    });
  }

  query(selector: string) {
    return this.createCall("query", async () => {
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
    return this.traverse("next", (el) => el.nextElementSibling);
  }

  prev() {
    return this.traverse("prev", (el) => el.previousElementSibling);
  }

  find(selector: string) {
    return this.createCall("find", async () => {
      // Use Promise.all to wait for all elements to be found
      const results = await Promise.all(
        this.__elements.map(async (el) => {
          return await waitForDOM(
            () => Array.from((el as HTMLElement).querySelectorAll(selector)),
            this.options.timeout!,
            this.document,
          );
        }),
      );

      // Flatten the results
      const res = results.flat();
      return res as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  parent() {
    return this.traverse("parent", (el) => el.parentElement);
  }

  children() {
    return this.traverse("children", (el) => Array.from(el.children));
  }

  closest(selector: string) {
    return this.traverse("closest", (el) => el.closest(selector));
  }

  first() {
    return this.createCall("first", async () => {
      return this.__elements.slice(0, 1) as NT;
    });
  }

  last() {
    return this.createCall("last", async () => {
      return this.__elements.slice(-1) as NT;
    });
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value: string): PromiseLike<CallChainImplThenable<NT>>;
  attr(name: string): PromiseLike<string | null>;
  attr(name: string, value?: string) {
    return this.createGetterSetterCall<string | null, string>(
      "attr",
      value,
      // Getter function
      () => {
        if (this.__elements.length === 0) return null;
        return (this.__elements[0] as HTMLElement).getAttribute(name);
      },
      // Setter function
      (val) => {
        this.__elements.forEach((el) =>
          (el as HTMLElement).setAttribute(name, val),
        );
      },
    ) as PromiseLike<string | null | CallChainImplThenable<NT>>;
  }

  // TODO: improve type safety here and remove any
  prop<K extends keyof AllHTMLElements>(
    name: K,
    value: DOMPropValue,
  ): PromiseLike<CallChainImplThenable<NT>>;
  prop<K extends keyof AllHTMLElements>(name: K): PromiseLike<string>;
  prop<K extends keyof AllHTMLElements>(name: K, value?: DOMPropValue) {
    return this.createGetterSetterCall<DOMPropValue, DOMPropValue>(
      "prop",
      value,
      // Getter function
      () => {
        if (this.__elements.length === 0) return undefined;
        return (this.__elements[0] as any)[name];
      },
      // Setter function
      (val) => {
        this.__elements.forEach((el) => {
          (el as any)[name] = val;
        });
      },
    ) as PromiseLike<DOMPropValue | CallChainImplThenable<NT>>;
  }

  // --- CSS & Class Methods ---

  css(prop: CSSProperties): PromiseLike<CallChainImplThenable<NT>>;
  css(prop: string, value: string): PromiseLike<CallChainImplThenable<NT>>;
  css(prop: string): PromiseLike<string>;
  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === "object") {
      // Handle object-style CSS properties
      return this.createCall("css", async () => {
        this.__elements.forEach((el) => {
          const elementStyle = (el as HTMLElement).style;
          for (const k in prop) {
            if (Object.prototype.hasOwnProperty.call(prop, k)) {
              // @ts-ignore allow indexing style object with string key
              elementStyle[k] = (prop as any)[k];
            }
          }
        });
        return this.__elements as NT;
      }) as PromiseLike<CallChainImplThenable<NT>>;
    }

    return this.createGetterSetterCall<string, string>(
      "css",
      value,
      // Getter function
      () => {
        if (this.__elements.length === 0) return "";
        return (this.__elements[0] as HTMLElement).style.getPropertyValue(prop);
      },
      // Setter function
      (val) => {
        this.__elements.forEach((el) => {
          (el as HTMLElement).style.setProperty(prop, val);
        });
      },
    ) as PromiseLike<CallChainImplThenable<NT> | string>;
  }

  addClass(name: string | Array<string>) {
    return this.createCall("addClass", async () => {
      const list = Array.isArray(name) ? name : [name];
      this.__elements.forEach((el) =>
        (el as HTMLElement).classList.add(...list),
      );
      return this.__elements as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  removeClass(name: string | Array<string>) {
    return this.createCall("removeClass", async () => {
      const list = Array.isArray(name) ? name : [name];
      this.__elements.forEach((el) =>
        (el as HTMLElement).classList.remove(...list),
      );
      return this.__elements as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  hasClass(name: string) {
    return this.createCall(
      "hasClass",
      async () =>
        this.__elements.every((el) =>
          (el as HTMLElement).classList.contains(name),
        ) as NT,
    ) as PromiseLike<boolean>;
  }

  toggleClass(name: string) {
    return this.createCall("toggleClass", async () => {
      this.__elements.forEach((el) =>
        (el as HTMLElement).classList.toggle(name),
      );
      return this.__elements as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  animateClass(name: string, duration: number) {
    return this.createCall("animateClass", async () => {
      this.__elements.forEach((el) => {
        const e = el as HTMLElement;
        e.classList.add(name);
        setTimeout(() => e.classList.remove(name), duration);
      });
      return this.__elements as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  // --- Content Manipulation Methods ---

  empty() {
    return this.createCall("empty", async () => {
      this.__elements.forEach((el) => {
        const element = el as HTMLElement;
        while (element.firstChild) {
          element.firstChild.remove();
        }
      });
      return this.__elements as NT;
    }) as PromiseLike<CallChainImplThenable<NT>>;
  }

  // TODO: add these overload signatures to all methods!
  html(): PromiseLike<string>;
  html(html: string): PromiseLike<CallChainImplThenable<NT>>;
  html(html?: string) {
    return this.createGetterSetterCall<string, string>(
      "html",
      html,
      () => {
        // getter
        if (this.__elements.length === 0) return "";
        return (this.__elements[0] as HTMLElement).innerHTML;
      },
      (val) => {
        // setter
        this.__elements.forEach((el) => {
          (el as HTMLElement).innerHTML = val;
        });
      },
    ) as PromiseLike<string | CallChainImplThenable<NT>>;
  }

  jsx(vdom: RenderInput): CallChainImplThenable<NT> {
    if (!isJSX(vdom)) {
      throw new Error("Invalid JSX input");
    }

    return this.createCall("jsx", async () => {
      this.__elements.forEach((el) =>
        updateDomWithVdom(el as HTMLElement, vdom, globalThis as Globals),
      );
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  text(text?: string) {
    return this.createGetterSetterCall<string, string>(
      "text",
      text,
      // Getter function
      () => {
        if (this.__elements.length === 0) return "";
        return (this.__elements[0] as HTMLElement).textContent || "";
      },
      // Setter function
      (val) => {
        this.__elements.forEach((el) => {
          (el as HTMLElement).textContent = val;
        });
      },
    ) as PromiseLike<string>;
  }

  remove() {
    return this.createCall("remove", async () => {
      const removedElements = [...this.__elements];
      this.__elements.forEach((el) => (el as HTMLElement).remove());
      return removedElements as NT;
    }) as CallChainImplThenable<NT>;
  }

  replaceWith<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ) {
    return this.createCall("replaceWith", async () => {
      const newElement = await resolveContent(content, this.options);
      if (!newElement) return this.__elements as NT;

      this.__elements.forEach((el, index) => {
        if (!el || !newElement) return;

        if (el.parentNode) {
          // create a fresh clone for each replacement to avoid side effects
          const clone = newElement.cloneNode(true);
          el.parentNode.replaceChild(clone, el);

          // replace the reference in the __elements array
          this.__elements[index] = clone;

          // update indexing
          mapArrayIndexAccess(this, this);
        }
      });

      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  append<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ) {
    return this.createCall("append", async () => {
      // Don't do anything if content is null or undefined
      if (content == null) {
        return this.__elements as NT;
      }

      const element = await resolveContent(content, this.options);
      if (!element) return this.__elements as NT;

      if (isDequery(content)) {
        // Special handling for Dequery objects which may contain multiple elements
        this.__elements.forEach((el) => {
          (content as CallChainImpl<T>).__elements.forEach((childEl) => {
            if ((childEl as Node).nodeType && (el as Node).nodeType) {
              (el as HTMLElement).appendChild(
                (childEl as Node).cloneNode(true),
              );
            }
          });
        });
      } else if (
        typeof content === "string" &&
        /<\/?[a-z][\s\S]*>/i.test(content)
      ) {
        // Special handling for HTML strings which might produce multiple elements
        const elements = renderHTML(content, this.options);
        this.__elements.forEach((el) => {
          elements.forEach((childEl) =>
            (el as HTMLElement).appendChild(childEl.cloneNode(true)),
          );
        });
      } else {
        // Single element handling
        this.__elements.forEach((el) => {
          if (!element) return;
          (el as HTMLElement).appendChild(element.cloneNode(true));
        });
      }

      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  appendTo<T = NT>(
    target:
      | string
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ) {
    return this.createCall("appendTo", async () => {
      const targetElements = await resolveTargets(
        target,
        this.options.timeout!,
        this.document,
      );

      if (targetElements.length === 0) {
        console.warn("appendTo: no target elements found");
        return this.__elements as NT;
      }

      targetElements.forEach((targetEl) => {
        this.__elements.forEach((el) => {
          if (!targetEl || !el) return;
          (targetEl as HTMLElement).appendChild(el.cloneNode(true));
        });
      });

      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  update(input: string | RenderInput) {
    return this.createCall("update", async () => {
      if (typeof input === "string") {
        const doc = parseHTML(input, "text/html", this.options);
        if (isHTML(doc)) {
          this.__elements.forEach((el) => {
            updateDom(el as HTMLElement, input, doc);
          });
        } else {
          this.__elements.forEach((el) => {
            (el as HTMLElement).textContent = input;
          });
        }
      } else if (isJSX(input)) {
        this.__elements.forEach((el) => {
          updateDomWithVdom(el as HTMLElement, input, globalThis as Globals);
        });
      } else {
        console.warn("update: unsupported content type", input);
      }
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  // --- Event Methods ---

  on(event: string, handler: EventListener) {
    return this.createCall("on", async () => {
      this.__elements.forEach((el) => {
        this.addElementEvent(el as HTMLElement, event, handler);
      });
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  off(event: string, handler?: EventListener) {
    return this.createCall("off", async () => {
      this.__elements.forEach((el) => {
        this.removeElementEvent(el as HTMLElement, event, handler);
      });
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  clearEvents() {
    return this.createCall("clearEvents", async () => {
      this.__elements.forEach((el) => {
        this.clearElementEvents(el as HTMLElement);
      });
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  trigger(eventType: string) {
    return this.createCall("trigger", async () => {
      this.__elements.forEach((el) =>
        (el as HTMLElement).dispatchEvent(
          new Event(eventType, { bubbles: true, cancelable: true }),
        ),
      );
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  // --- Position Methods ---

  position() {
    return this.createCall(
      "position",
      async () =>
        ({
          top: (this.__elements[0] as HTMLElement).offsetTop,
          left: (this.__elements[0] as HTMLElement).offsetLeft,
        }) as NT,
    ) as PromiseLike<Position>;
  }

  offset() {
    return this.createCall("offset", async () => {
      const el = this.__elements[0] as HTMLElement;
      const rect = el.getBoundingClientRect();
      return {
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      } as NT;
    }) as PromiseLike<Position>;
  }

  // --- Data Methods ---

  data(name: string, value?: string) {
    return this.createGetterSetterCall<string | undefined, string>(
      "data",
      value,
      // Getter function
      () => {
        if (this.__elements.length === 0) return undefined;
        return (this.__elements[0] as HTMLElement).dataset[name];
      },
      // Setter function
      (val) => {
        this.__elements.forEach((el) => {
          (el as HTMLElement).dataset[name] = val;
        });
      },
    ) as PromiseLike<string | undefined>;
  }

  val(val?: string | boolean) {
    return this.createGetterSetterCall<string | boolean, string | boolean>(
      "val",
      val,
      // Getter function
      () => {
        if (this.__elements.length === 0) return "";
        const el = this.__elements[0] as HTMLInputElement;
        if (el.type === "checkbox") {
          return el.checked;
        }
        return el.value;
      },
      // Setter function
      (value) => {
        this.__elements.forEach((el) => {
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

  form<T = FormKeyValues>(formData?: Record<string, string | boolean>) {
    return this.createGetterSetterCall<
      FormKeyValues,
      Record<string, string | boolean>
    >(
      "form",
      formData,
      // Getter function
      () => {
        const formFields: Record<string, string | boolean> = {};
        this.__elements.forEach((el) => {
          this.processFormElements(el, (input, key) => {
            if (input.type === "checkbox") {
              formFields[key] = input.checked;
            } else {
              formFields[key] = input.value;
            }
          });
        });
        return formFields;
      },
      // Setter function
      (values) => {
        this.__elements.forEach((el) => {
          this.processFormElements(el, (input, key) => {
            if (values[key] !== undefined) {
              if (input.type === "checkbox") {
                input.checked = Boolean(values[key]);
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
    return this.createCall("dimension", async () => {
      if (this.__elements.length === 0) {
        return { width: 0, height: 0 } as NT;
      }

      const el = this.__elements[0] as HTMLElement;
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
    return this.createCall("isVisible", async () => {
      if (this.__elements.length === 0) return false as NT;
      const el = this.__elements[0] as HTMLElement;
      return this.checkElementVisibility(el) as NT;
    }) as PromiseLike<boolean>;
  }

  isHidden() {
    return this.createCall("isHidden", async () => {
      if (this.__elements.length === 0) return true as NT;
      const el = this.__elements[0] as HTMLElement;
      return !this.checkElementVisibility(el) as NT;
    }) as PromiseLike<boolean>;
  }

  // --- Scrolling Methods ---

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number) {
    return this.scrollHelper(
      "scrollTo",
      xOrOptions,
      y,
    ) as CallChainImplThenable<NT>;
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number) {
    return this.scrollHelper(
      "scrollBy",
      xOrOptions,
      y,
    ) as CallChainImplThenable<NT>;
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
    return this.createCall("scrollIntoView", async () => {
      if (this.__elements.length === 0) return this.__elements as NT;
      (this.__elements[0] as HTMLElement).scrollIntoView(options);
      return this.__elements as NT;
    }) as CallChainImplThenable<NT>;
  }

  // --- Transformation Methods ---

  map<T>(cb: (el: NT, idx: number) => T) {
    return this.createCall(
      "map",
      async () => (this.__elements as NT[]).map(cb) as NT,
    ) as PromiseLike<NT[]>;
  }

  toArray() {
    return this.createCall(
      "toArray",
      async () => [...(this.__elements as NT[])] as NT,
    ) as PromiseLike<NT[]>;
  }

  filter(selector: string) {
    return this.createCall(
      "filter",
      async () =>
        this.__elements.filter(
          (el) => el instanceof Element && el.matches(selector),
        ) as NT,
    ) as CallChainImplThenable<NT>;
  }

  // --- Cleanup Methods ---

  /** memory cleanup (chain becomes useless after calling this method) */
  dispose(): PromiseLike<void> {
    this.callStack = [];
    this.resultStack = [];
    // @ts-ignore
    this.lastResult = undefined;
    // @ts-ignore
    this.stoppedWithError = undefined;
    return Promise.resolve();
  }

  // TODO:
  // - ready (isReady)
  // - serialize (to URL string, JSON, etc.)
  // - deserialize (from URL string, JSON, etc.)
  // Re-use the common/* shared code!

  // Add this helper function inside the CallChainImpl class or before it as a utility function

  private checkElementVisibility(element: HTMLElement): boolean {
    const style = this.window.getComputedStyle(element);
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
    if (!this.document.body.contains(element)) return false;

    // Check if any parent is hidden
    let parent = element.parentElement;
    while (parent) {
      const parentStyle = this.window.getComputedStyle(parent);
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

  private createCall(
    methodName: string,
    handler: () => Promise<NT>,
  ): CallChainImplThenable<NT> | CallChainImpl<NT> {
    this.callStack.push(new Call<NT>(methodName, handler));
    return subChainForNextAwait(this);
  }

  private createGetterSetterCall<T, V>(
    methodName: string,
    value: V | undefined,
    getter: () => T,
    setter: (value: V) => void,
  ): CallChainImplThenable<NT> | CallChainImpl<NT> {
    if (value !== undefined) {
      return this.createCall(methodName, async () => {
        setter(value);
        return this.__elements as NT;
      });
    } else {
      return this.createCall(methodName, async () => {
        return getter() as unknown as NT;
      });
    }
  }

  private traverse<R = NT>(
    methodName: string,
    selector: (el: Element) => Element | Element[] | null | undefined,
  ): CallChainImplThenable<R> | CallChainImpl<R> {
    return this.createCall(methodName, async () => {
      return this.__elements.flatMap((el) => {
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
    }) as unknown as CallChainImplThenable<R> | CallChainImpl<R>;
  }

  private getEventMap(element: HTMLElement): Map<string, Set<EventListener>> {
    if (!element._dequeryEvents) {
      element._dequeryEvents = new Map();
    }
    return element._dequeryEvents;
  }

  private addElementEvent(
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
  ): void {
    const eventMap = this.getEventMap(element);

    if (!eventMap.has(eventType)) {
      eventMap.set(eventType, new Set());
    }

    eventMap.get(eventType)!.add(handler);
    element.addEventListener(eventType, handler);
  }

  private removeElementEvent(
    element: HTMLElement,
    eventType: string,
    handler?: EventListener,
  ): void {
    const eventMap = this.getEventMap(element);

    if (!eventMap.has(eventType)) return;

    if (handler) {
      // Remove specific handler
      if (eventMap.get(eventType)!.has(handler)) {
        element.removeEventListener(eventType, handler);
        eventMap.get(eventType)!.delete(handler);

        if (eventMap.get(eventType)!.size === 0) {
          eventMap.delete(eventType);
        }
      }
    } else {
      // Remove all handlers for this event type
      eventMap.get(eventType)!.forEach((h: EventListener) => {
        element.removeEventListener(eventType, h);
      });
      eventMap.delete(eventType);
    }
  }

  private clearElementEvents(element: HTMLElement): void {
    const eventMap = this.getEventMap(element);

    eventMap.forEach((handlers, eventType) => {
      handlers.forEach((handler: EventListener) => {
        element.removeEventListener(eventType, handler);
      });
    });

    eventMap.clear();
  }

  private scrollHelper(
    methodName: "scrollTo" | "scrollBy",
    xOrOptions: number | ScrollToOptions,
    y?: number,
  ): CallChainImplThenable<NT> | CallChainImpl<NT> {
    return this.createCall(methodName, async () => {
      this.__elements.forEach((el) => {
        const element = el as HTMLElement;
        if (typeof xOrOptions === "object") {
          element[methodName](xOrOptions);
        } else if (y !== undefined) {
          element[methodName](xOrOptions, y);
        } else {
          element[methodName](xOrOptions, 0);
        }
      });
      return this.__elements as NT;
    });
  }

  /**
   * Helper method to process form elements and apply a callback to each
   * @private
   */
  // TODO: move all private methods outside of the class!
  private processFormElements(
    el: NodeType,
    callback: (input: HTMLInputElement, key: string) => void,
  ): void {
    if (el instanceof Element) {
      const inputElements = el.querySelectorAll(
        "input, select, textarea",
      ) as NodeListOf<HTMLInputElement>;

      inputElements.forEach((input) => {
        if (["INPUT", "SELECT", "TEXTAREA"].includes(input.tagName)) {
          const key = input.name || input.id;
          callback(input, key);
        }
      });
    }
  }
}

// custom promise chain
export class CallChainImplThenable<
  NT = ChainMethodReturnType,
> extends CallChainImpl<NT> {
  constructor(options: DequeryOptions<NT> = {}, isResolved = false) {
    super(options);
    this.isResolved = isResolved;
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then(
    onfulfilled?: (value: CallChainImpl<NT>) => CallChainImpl<NT>,
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
        // because every synchronous call returns the return value of
        // subChainForNextAwait() which decides if an instance clone
        // is necessary to continue the chain or not.
        result = createSubChain<NT>(this, CallChainImpl, true);
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
        this.options.onTimeGuardError!(ms, call);
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

export function delayedAutoStart<NT = ChainMethodReturnType>(
  chain: CallChainImplThenable<NT> | CallChainImpl<NT>,
): CallChainImplThenable<NT> | CallChainImpl<NT> {
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

export function dequery<NT = ChainMethodReturnType>(
  selectorRefOrEl:
    | string
    | NodeType
    | Ref<NodeType, any>
    | RenderInput
    | Function,
  options: DequeryOptions<NT> & ElementCreationOptions = getDefaultConfig(),
): CallChainImplThenable<NT> | CallChainImpl<NT> {
  // async co-routine execution
  if (typeof selectorRefOrEl === "function") {
    const syncChain: CallChainImplThenable<NT> | CallChainImpl<NT> = dequery(
      "body",
      options,
    );
    requestAnimationFrame(async () => {
      const result = await selectorRefOrEl();
      if (!syncChain.isResolved) {
        if (typeof result !== "undefined") {
          // allows for $(async () => { ... }) to be chained
          // e.g. await $(async () => { ... return someRef }).html("foo")
          // would replace the content of the ref'ed element with "foo"
          // asynchronously
          const newChain = dequery(result, options);
          syncChain.resultStack = newChain.resultStack;
          syncChain.lastResult = newChain.lastResult;
          mapArrayIndexAccess(newChain, syncChain);
        }
      }
    });
    return delayedAutoStart(syncChain);
  }

  // standard options -- selector handling

  const chain = new CallChainImplThenable<NT>({
    ...options,
    resultStack: [],
  });

  if (!selectorRefOrEl)
    throw new Error("dequery: selector/ref/element required");

  if (typeof selectorRefOrEl === "string") {
    if (selectorRefOrEl.indexOf("<") === 0) {
      const elements = renderHTML(selectorRefOrEl, chain.options);
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
      return delayedAutoStart(chain);
    } else {
      return delayedAutoStart(
        chain.query(selectorRefOrEl) as CallChainImplThenable<NT>,
      );
    }
  } else if (isRef(selectorRefOrEl)) {
    return delayedAutoStart(
      chain.ref(selectorRefOrEl) as CallChainImplThenable<NT>,
    );
  } else if ((selectorRefOrEl as Node).nodeType) {
    chain.resultStack = [[selectorRefOrEl as NT]];
    return delayedAutoStart(chain);
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
    return delayedAutoStart(chain);
  }
  throw new Error("Unsupported selectorOrEl type");
}

export const $: typeof dequery = dequery;

export type Dequery = CallChainImplThenable | CallChainImpl;

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

/**
 * Creates a promise that rejects if the operation doesn't complete within the timeout
 * @export
 */
export function createTimeoutPromise<T>(
  timeoutMs: number,
  operation: () => Promise<T> | T,
  timeoutCallback?: (ms: number) => void,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      timeoutCallback?.(timeoutMs);
      reject(new Error(`Timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    Promise.resolve().then(async () => {
      try {
        const result = await operation();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  });
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

export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1,
): Promise<T> {
  const start = Date.now();

  return createTimeoutPromise(timeout, () => {
    return new Promise<T>((resolve, reject) => {
      const timer = setInterval(() => {
        try {
          const result = check();
          if (result != null) {
            clearInterval(timer);
            resolve(result);
          }
        } catch (err) {
          clearInterval(timer);
          reject(err);
        }
      }, interval);
    });
  });
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
        // Fallback if no document is provided
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

      // Return function to clean up observer on timeout
      return () => observer.disconnect();
    });
  });
}

export function mapArrayIndexAccess<NT = ChainMethodReturnType>(
  source: CallChainImpl<NT>,
  target: CallChainImpl<NT>,
) {
  const elements = source.__elements;
  // allow for array-like access
  for (let i = 0; i < elements.length; i++) {
    target[i] = elements[i] as NT;
  }
  target.length = elements.length;
}

export function createSubChain<NT = ChainMethodReturnType>(
  source: CallChainImpl<NT>,
  Constructor:
    | typeof CallChainImpl
    | typeof CallChainImplThenable = CallChainImpl,
  isResolved = false,
) {
  const subChain = new Constructor<NT>(source.options);
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

export function subChainForNextAwait<NT>(
  source: CallChainImpl<NT>,
): CallChainImplThenable<NT> | CallChainImpl<NT> {
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
  // If this is already a CallChainImpl but not a thenable
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
    : createSubChain<NT>(source, CallChainImplThenable);
}

export async function waitForRef<T>(
  ref: { current: T | null },
  timeout: number,
): Promise<T> {
  return waitForWithPolling(() => ref.current, timeout);
}

export function parseHTML(
  str: string,
  type: DOMParserSupportedType,
  options: DequeryOptions<any>,
): Document {
  const parser = new options!.globals!.window!.DOMParser();
  return parser.parseFromString(str, type);
}

export function isHTML(doc: Document): boolean {
  return doc.documentElement.querySelectorAll("*").length > 2; // 2 = <html> and <body>
}

export function renderHTML(
  html: string,
  options: DequeryOptions<any>,
  type: DOMParserSupportedType = "text/html",
) {
  return Array.from(parseHTML(html, type, options).body.childNodes);
}

/**
 * Resolves various types of content into a DOM element
 * @export
 */
export async function resolveContent<T = ChainMethodReturnType>(
  content:
    | string
    | RenderInput
    | NodeType
    | Ref<NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>
    | null
    | undefined,
  options: DequeryOptions<any>,
): Promise<NodeType | null> {
  if (content == null) {
    return null;
  }

  if (typeof content === "string") {
    const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
    if (hasHtmlTags) {
      return renderHTML(content, options)[0];
    } else {
      return options.globals!.document!.createTextNode(content);
    }
  } else if (isJSX(content)) {
    return renderIsomorphicSync(
      content as RenderInput,
      options.globals!.document!.body,
      options.globals as Globals,
    ) as NodeType;
  } else if (isRef(content)) {
    await waitForRef(content as Ref<NodeType>, options.timeout!);
    return content.current!;
  } else if ((content as Node).nodeType) {
    return content as NodeType;
  } else if (isDequery(content)) {
    const firstElement = await content.getFirstElement();
    return firstElement as NodeType;
  }

  console.warn("resolveContent: unsupported content type", content);
  return null;
}

/**
 * Resolves various types of targets into an array of DOM elements
 * @export
 */
export async function resolveTargets<T = ChainMethodReturnType>(
  target:
    | string
    | NodeType
    | Ref<NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>,
  timeout: number,
  document?: Document,
): Promise<NodeType[]> {
  let targetElements: NodeType[] = [];

  if (isRef(target)) {
    await waitForRef(target as Ref<NodeType>, timeout);
    targetElements = [target.current!];
  } else if (typeof target === "string" && document) {
    const result = await waitForDOM(
      () => {
        const el = document.querySelector(target);
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
    if (el) targetElements = [el as NodeType];
  } else if ((target as Node).nodeType) {
    targetElements = [target as NodeType];
  } else if (isDequery(target)) {
    const elements = (target as CallChainImpl<T>).__elements;
    targetElements = elements
      .filter((el) => (el as Node).nodeType !== undefined)
      .map((el) => el as NodeType);
  } else {
    console.warn("resolveTargets: expected selector, ref or node, got", target);
  }
  return targetElements;
}
