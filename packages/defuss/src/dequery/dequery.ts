import { pick, omit } from "defuss-runtime";
import {
  addElementEvent,
  checkElementVisibility,
  clearElementEvents,
  domNodeToVNode,
  htmlStringToVNodes,
  isMarkup,
  removeElementEvent,
  renderMarkup,
  updateDomWithVdom,
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
  updateDom,
} from "../render/index.js";
import { clearDelegatedEventsDeep } from "../render/delegated-events.js";
import { getComponentInstance } from "../render/component-registry.js";
import type {
  DequeryOptions,
  DequerySyncMethodReturnType,
  Dimensions,
  FormKeyValues,
  Position,
  ElementCreationOptions,
  FormFieldValue,
  EventMapFor,
  TargetOf,
} from "./types.js";

// --- Helpers ---

export const emptyImpl = <T>(nodes: Array<T>) => {
  nodes.forEach((el) => {
    const element = el as HTMLElement;
    const target = element.shadowRoot ?? element;

    while (target.firstChild) {
      const node = target.firstChild;
      if (node instanceof HTMLElement) {
        clearDelegatedEventsDeep(node);
      }
      node.remove();
    }
  });
  return nodes as T[];
};

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

export function getAllFormValues(chain: { nodes: NodeType[] }): FormKeyValues {
  const formFields: FormKeyValues = {};
  const mapCheckboxValue = (value: string) => (value === "on" ? true : value);

  chain.nodes.forEach((el) => {
    processAllFormElements(el, (input, key) => {
      if (!key) return;

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
          if (input.checked) {
            formFields[key] = input.value === "on" ? true : input.value;
          }
        } else if (input.type === "file") {
          if (input.files?.length) {
            const fileNames = Array.from(input.files).map((file) => file.name);
            formFields[key] = fileNames.length === 1 ? fileNames[0] : fileNames;
          }
        } else {
          formFields[key] = input.value;
        }
      } else if (input instanceof HTMLSelectElement) {
        if (input.multiple) {
          const values = Array.from(input.selectedOptions).map(
            (option) => option.value,
          );
          formFields[key] = values.length === 1 ? values[0] : values;
        } else {
          formFields[key] = input.value;
        }
      } else if (input instanceof HTMLTextAreaElement) {
        formFields[key] = input.value;
      }
    });
  });
  return formFields;
}

function renderNodeSync<T = DequerySyncMethodReturnType>(
  input:
    | string
    | RenderInput
    | NodeType
    | Dequery<T>
    | Ref<NodeType, any>
    | CallChainImpl<T>
    | null
    | undefined,
  chain: CallChainImpl<any>,
): NodeType | null {
  if (input == null) return null;

  if (typeof input === "string") {
    if (isMarkup(input, chain.Parser)) {
      return renderMarkup(input, chain.Parser)[0];
    }
    return chain.document.createTextNode(input);
  }
  if (isJSX(input)) {
    return renderIsomorphicSync(
      input as JSX.Element,
      chain.document.body,
      chain.options.globals as Globals,
    ) as NodeType;
  }
  if (isRef(input)) {
    return (input as Ref<NodeType, any>).current ?? null;
  }
  if (input && typeof input === "object" && "nodeType" in input) {
    return input as NodeType;
  }
  if (isDequery(input)) {
    return ((input as CallChainImpl<any>)._nodes[0] as NodeType) ?? null;
  }
  console.warn("renderNodeSync: unsupported content type", input);
  return null;
}

function resolveNodesSync<T = DequerySyncMethodReturnType>(
  input: string | NodeType | Ref<NodeType, any> | CallChainImpl<T>,
  document?: Document,
): NodeType[] {
  if (isRef(input)) {
    const ref = input as Ref<NodeType, any>;
    return ref.current ? [ref.current] : [];
  }
  if (typeof input === "string" && document) {
    const el = document.querySelector(input);
    return el ? [el as NodeType] : [];
  }
  if (input && typeof input === "object" && "nodeType" in input) {
    return [input as NodeType];
  }
  if (isDequery(input)) {
    return (input as CallChainImpl<T>)._nodes
      .filter((el) => (el as Node).nodeType !== undefined)
      .map((el) => el as NodeType);
  }
  console.warn("resolveNodesSync: expected selector, ref or node, got", input);
  return [];
}

function updateIndexAccess<NT>(chain: CallChainImpl<NT>) {
  const elements = chain._nodes;
  for (let i = 0; i < elements.length; i++) {
    chain[i] = elements[i] as NT;
  }
  chain.length = elements.length;
}

// --- Core Dequery Class (fully synchronous) ---

export class CallChainImpl<
  NT = DequerySyncMethodReturnType,
  ET extends Dequery<NT> = Dequery<NT>,
> {
  [index: number]: NT;

  options: DequeryOptions<NT>;
  elementCreationOptions: ElementCreationOptions;
  _nodes: NT[];
  length: number;

  // SSR-ability
  document: Document;
  window: Window;
  performance: Performance;
  Parser: typeof DOMParser;

  // result cache for CSS computed values
  private static resultCache = new WeakMap<Element, Map<string, any>>();

  constructor(options: DequeryOptions<NT> = {}) {
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

    this._nodes = (options.resultStack ? [...options.resultStack] : []) as NT[];
    this.length = this._nodes.length;

    updateIndexAccess(this);
  }

  get globals(): Globals {
    return this.options.globals as Globals;
  }

  get nodes(): NodeType[] {
    return this._nodes as NodeType[];
  }

  [Symbol.iterator]() {
    return this._nodes[Symbol.iterator]() as IterableIterator<NT>;
  }

  // --- Selection & Traversal (all sync) ---

  query(selector: string): ET {
    this._nodes = Array.from(this.document.querySelectorAll(selector)) as NT[];
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  find(selector: string): ET {
    this._nodes = this._nodes.flatMap((el) =>
      Array.from((el as unknown as Element).querySelectorAll(selector)),
    ) as NT[];
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  ref<T extends NodeType, ST = any>(ref: Ref<T, ST>): ET {
    this._nodes = ref.current ? [ref.current as unknown as NT] : [];
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  parent(): ET {
    return this._traverse((el) => el.parentElement);
  }

  children(): ET {
    return this._traverse((el) => Array.from(el.children));
  }

  next(): ET {
    return this._traverse((el) => el.nextElementSibling);
  }

  prev(): ET {
    return this._traverse((el) => el.previousElementSibling);
  }

  closest(selector: string): ET {
    return this._traverse((el) => el.closest(selector));
  }

  first(): ET {
    this._nodes = this._nodes.slice(0, 1);
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  last(): ET {
    this._nodes = this._nodes.slice(-1);
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  filter(selector: string): ET {
    this._nodes = this._nodes.filter(
      (el) => el instanceof Element && el.matches(selector),
    );
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  private _traverse(
    selector: (el: Element) => Element | Element[] | null | undefined,
  ): ET {
    this._nodes = this._nodes.flatMap((el) => {
      if (el instanceof Element) {
        try {
          const result = selector(el);
          if (Array.isArray(result)) {
            return result.filter(
              (item): item is Element => item instanceof Element,
            ) as NT[];
          }
          if (result instanceof Element) {
            return [result] as NT[];
          }
        } catch (err) {
          console.warn("Error in traverse selector function:", err);
        }
      }
      return [] as NT[];
    });
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  // --- Direct value methods ---

  getFirstElement(): NT {
    return this[0] as NT;
  }

  toArray(): NT[] {
    return [...this._nodes];
  }

  map<T>(cb: (el: NT, idx: number) => T): T[] {
    const results: T[] = new Array(this._nodes.length);
    for (let i = 0; i < this._nodes.length; i++) {
      results[i] = cb(this._nodes[i] as NT, i);
    }
    return results;
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value: string): ET;
  attr(name: string): string | null;
  attr(name: string, value?: string): ET | string | null {
    if (value !== undefined) {
      this._nodes.forEach((el) => {
        (el as unknown as HTMLElement).setAttribute(name, value);
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return null;
    return (this._nodes[0] as unknown as HTMLElement).getAttribute(name);
  }

  prop<K extends keyof NonNullable<NT>>(name: K, value: NonNullable<NT>[K]): ET;
  prop<K extends keyof NonNullable<NT>>(name: K): NonNullable<NT>[K];
  prop<K extends keyof AllHTMLElements>(name: K, value: any): ET;
  prop<K extends keyof AllHTMLElements>(name: K): any;
  prop(name: string, value: any): ET;
  prop(name: string): any;
  prop(name: string, value?: any): ET | any {
    if (value !== undefined) {
      this._nodes.forEach((el) => {
        (el as any)[name] = value;
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return undefined;
    return (this._nodes[0] as any)[name];
  }

  // --- CSS & Class Methods ---

  css(prop: CSSProperties): ET;
  css(prop: string, value: string): ET;
  css(prop: string): string;
  css(prop: string | CSSProperties, value?: string): ET | string {
    if (typeof prop === "object") {
      this._nodes.forEach((el) => {
        const htmlEl = el as unknown as HTMLElement;
        Object.entries(prop).forEach(([key, val]) => {
          htmlEl.style.setProperty(
            key.replace(/([A-Z])/g, "-$1").toLowerCase(),
            String(val),
          );
        });
      });
      return this as unknown as ET;
    }

    if (value !== undefined) {
      this._nodes.forEach((el) => {
        (el as unknown as HTMLElement).style.setProperty(prop, String(value));
        const cache = CallChainImpl.resultCache.get(el as unknown as Element);
        if (cache) cache.delete(`css:${prop}`);
      });
      return this as unknown as ET;
    }

    if (this._nodes.length === 0) return "";
    const el = this._nodes[0] as unknown as HTMLElement;
    const cache =
      CallChainImpl.resultCache.get(el as unknown as Element) || new Map();
    const cacheKey = `css:${prop}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const computed = this.window.getComputedStyle(el);
    const result = computed.getPropertyValue(prop);
    cache.set(cacheKey, result);
    CallChainImpl.resultCache.set(el as unknown as Element, cache);
    return result;
  }

  addClass(name: string | Array<string>): ET {
    const list = Array.isArray(name) ? name : [name];
    this._nodes.forEach((el) => {
      (el as unknown as HTMLElement).classList.add(...list);
    });
    return this as unknown as ET;
  }

  removeClass(name: string | Array<string>): ET {
    const list = Array.isArray(name) ? name : [name];
    this._nodes.forEach((el) => {
      (el as unknown as HTMLElement).classList.remove(...list);
    });
    return this as unknown as ET;
  }

  hasClass(name: string): boolean {
    return this._nodes.every((el) =>
      (el as unknown as HTMLElement).classList.contains(name),
    );
  }

  toggleClass(name: string): ET {
    this._nodes.forEach((el) => {
      (el as unknown as HTMLElement).classList.toggle(name);
    });
    return this as unknown as ET;
  }

  animateClass(name: string, duration: number): ET {
    this._nodes.forEach((el) => {
      const e = el as unknown as HTMLElement;
      e.classList.add(name);
      setTimeout(() => e.classList.remove(name), duration);
    });
    return this as unknown as ET;
  }

  // --- Content Manipulation ---

  empty(): ET {
    emptyImpl(this._nodes);
    return this as unknown as ET;
  }

  html(): string;
  html(html: string): ET;
  html(html?: string): ET | string {
    if (html !== undefined) {
      this._nodes.forEach((el) => {
        (el as unknown as HTMLElement).innerHTML = html;
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return "";
    return (this._nodes[0] as unknown as HTMLElement).innerHTML;
  }

  jsx(vdom: RenderInput): ET {
    if (!isJSX(vdom)) {
      throw new Error("Invalid JSX input");
    }
    this._nodes.forEach((el) => {
      updateDomWithVdom(el as unknown as HTMLElement, vdom, this.globals);
    });
    return this as unknown as ET;
  }

  render(vdom: RenderInput): ET {
    return this.jsx(vdom);
  }

  text(): string;
  text(text: string): ET;
  text(text?: string): ET | string {
    if (text !== undefined) {
      this._nodes.forEach((el) => {
        (el as unknown as HTMLElement).textContent = text;
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return "";
    return (this._nodes[0] as unknown as HTMLElement).textContent || "";
  }

  remove(): ET {
    const removedElements = [...this._nodes];
    this._nodes.forEach((el) => {
      (el as unknown as HTMLElement).remove();
    });
    this._nodes = removedElements;
    return this as unknown as ET;
  }

  replaceWith(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType, any>
      | CallChainImpl<NT, ET>,
  ): ET {
    const newElements: NodeType[] = [];
    const newElement = renderNodeSync(content, this);

    for (let i = 0; i < this._nodes.length; i++) {
      const originalEl = this._nodes[i] as unknown as Node;
      if (!originalEl?.parentNode) continue;
      if (!newElement) continue;

      const nodeToUse = i === 0 ? newElement : newElement.cloneNode(true);
      originalEl.parentNode.replaceChild(nodeToUse, originalEl);
      newElements.push(nodeToUse as NodeType);
    }

    this._nodes = newElements as NT[];
    updateIndexAccess(this);
    return this as unknown as ET;
  }

  append<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<NodeType, any>
      | CallChainImpl<T>,
  ): ET {
    if (content == null) return this as unknown as ET;

    if (content instanceof Node) {
      this._nodes.forEach((el, index) => {
        if (
          el &&
          content &&
          !(el as unknown as Node).isEqualNode(content) &&
          (el as unknown as Node).parentNode !== content
        ) {
          const nodeToAppend = index === 0 ? content : content.cloneNode(true);
          (el as unknown as HTMLElement).appendChild(nodeToAppend);
        }
      });
      return this as unknown as ET;
    }

    if (isDequery(content)) {
      const children = (content as unknown as CallChainImpl<any>)
        ._nodes as Node[];
      this._nodes.forEach((parent, parentIndex) => {
        children.forEach((child) => {
          if (!child?.nodeType || !(parent as unknown as Node)?.nodeType)
            return;
          if (
            (child as Node).isEqualNode(parent as unknown as Node) ||
            (parent as unknown as Node)?.parentNode === child
          )
            return;
          const nodeToInsert =
            parentIndex === 0 ? child : child.cloneNode(true);
          (parent as unknown as HTMLElement).appendChild(nodeToInsert);
        });
      });
      return this as unknown as ET;
    }

    if (typeof content === "string" && isMarkup(content, this.Parser)) {
      const elements = renderMarkup(content, this.Parser);
      this._nodes.forEach((el, parentIndex) => {
        elements.forEach((childEl) => {
          const node = parentIndex === 0 ? childEl : childEl.cloneNode(true);
          (el as unknown as HTMLElement).appendChild(node as Node);
        });
      });
      return this as unknown as ET;
    }

    const element = renderNodeSync(content, this);
    if (!element) return this as unknown as ET;

    this._nodes.forEach((el, index) => {
      if (!element) return;
      const nodeToAppend = index === 0 ? element : element.cloneNode(true);
      (el as unknown as HTMLElement).appendChild(nodeToAppend as Node);
    });
    return this as unknown as ET;
  }

  appendTo<T = NT>(
    target: string | NodeType | Ref<any, NodeType> | CallChainImpl<T>,
  ): ET {
    const nodes = resolveNodesSync(target, this.document);
    if (nodes.length === 0) return this as unknown as ET;

    nodes.forEach((node) => {
      this._nodes.forEach((el) => {
        if (!node || !el) return;
        node.appendChild((el as unknown as Node).cloneNode(true));
      });
    });
    return this as unknown as ET;
  }

  /**
   * Updates the DOM content of elements. For transitions, uses fire-and-forget async.
   * Use .jsx() or .render() for simpler JSX rendering.
   */
  update(
    input?:
      | string
      | RenderInput
      | Ref<NodeType, any>
      | NodeType
      | CallChainImpl<NT>
      | Record<string, unknown>,
    transitionConfig?: import("../render/transitions.js").TransitionConfig,
  ): ET {
    // Check if this is an implicit props update
    if (
      input &&
      typeof input === "object" &&
      !(input instanceof Node) &&
      !isJSX(input) &&
      !isRef(input) &&
      !isDequery(input)
    ) {
      let didImplicitUpdate = false;
      for (const node of this._nodes) {
        if (!(node instanceof Element)) continue;
        const instance = getComponentInstance(node);
        if (!instance) continue;
        Object.assign(instance.props, input);
        const newVNode = instance.renderFn(instance.props);
        // Safe cast: NT & Element may not be HTMLElement
        updateDomWithVdom(
          node as unknown as HTMLElement,
          newVNode,
          this.globals,
        );
        instance.prevVNode = newVNode;
        didImplicitUpdate = true;
      }
      if (didImplicitUpdate) return this as unknown as ET;
    }

    // For transitions, fire-and-forget the async updateDom
    if (transitionConfig && transitionConfig.type !== "none") {
      updateDom(
        input as RenderInput,
        this._nodes as unknown as NodeType[],
        this.options.timeout!,
        this.Parser,
        transitionConfig,
      );
      return this as unknown as ET;
    }

    // Synchronous core update
    let processedInput = input;

    if (isDequery(processedInput)) {
      processedInput = (processedInput as any)[0] as HTMLElement;
    }

    if (isRef(processedInput)) {
      processedInput = (processedInput as Ref<NodeType>).current;
    }

    const getGlobalsFromElement = (el: NodeType): Globals => {
      const win = (el as Element).ownerDocument?.defaultView;
      return (win as unknown as Globals) ?? (globalThis as unknown as Globals);
    };

    const nodes = this._nodes as unknown as NodeType[];

    if (
      typeof processedInput === "object" &&
      processedInput !== null &&
      "nodeType" in processedInput &&
      typeof (processedInput as any).nodeType === "number" &&
      processedInput instanceof Node
    ) {
      const vnode = domNodeToVNode(processedInput);
      nodes.forEach((el) => {
        if (el)
          updateDomWithVdom(
            el as unknown as HTMLElement,
            vnode,
            getGlobalsFromElement(el),
          );
      });
      return this as unknown as ET;
    }

    if (typeof processedInput === "string") {
      if (isMarkup(processedInput, this.Parser)) {
        const vNodes = htmlStringToVNodes(processedInput, this.Parser);
        nodes.forEach((el) => {
          if (el)
            updateDomWithVdom(
              el as HTMLElement,
              vNodes,
              getGlobalsFromElement(el),
            );
        });
      } else {
        nodes.forEach((el) => {
          if (el) {
            updateDomWithVdom(
              el as HTMLElement,
              processedInput as string,
              getGlobalsFromElement(el),
            );
          }
        });
      }
    } else if (isJSX(processedInput)) {
      nodes.forEach((el) => {
        if (el) {
          updateDomWithVdom(
            el as HTMLElement,
            processedInput as RenderInput,
            getGlobalsFromElement(el),
          );
        }
      });
    } else if (processedInput != null) {
      console.warn("update: unsupported content type", processedInput);
    }

    return this as unknown as ET;
  }

  // --- Event Methods ---

  on<K extends keyof EventMapFor<TargetOf<NT>>>(
    event: K,
    handler: (ev: EventMapFor<TargetOf<NT>>[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): ET;
  on(
    event: string,
    handler: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): ET;
  on(event: string, handler: any): ET {
    this._nodes.forEach((el) => {
      if (el && typeof (el as any).addEventListener === "function") {
        addElementEvent(el as unknown as EventTarget, event, handler);
      }
    });
    return this as unknown as ET;
  }

  off<K extends keyof EventMapFor<TargetOf<NT>>>(
    event: K,
    handler?: (ev: EventMapFor<TargetOf<NT>>[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): ET;
  off(
    event: string,
    handler?: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): ET;
  off(event: string, handler?: any): ET {
    this._nodes.forEach((el) => {
      removeElementEvent(el as unknown as HTMLElement, event, handler);
    });
    return this as unknown as ET;
  }

  clearEvents(): ET {
    this._nodes.forEach((el) => {
      clearElementEvents(el as unknown as HTMLElement);
    });
    return this as unknown as ET;
  }

  trigger(eventType: string): ET {
    this._nodes.forEach((el) => {
      (el as unknown as HTMLElement).dispatchEvent(
        new Event(eventType, { bubbles: true, cancelable: true }),
      );
    });
    return this as unknown as ET;
  }

  // --- Position Methods ---

  position(): Position {
    return {
      top: (this._nodes[0] as unknown as HTMLElement)?.offsetTop ?? 0,
      left: (this._nodes[0] as unknown as HTMLElement)?.offsetLeft ?? 0,
    };
  }

  offset(): Position {
    if (this._nodes.length === 0) return { top: 0, left: 0 };
    const el = this._nodes[0] as unknown as HTMLElement;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + (this.window.scrollY ?? 0),
      left: rect.left + (this.window.scrollX ?? 0),
    };
  }

  // --- Data Methods ---

  data(name: string, value: string): ET;
  data(name: string): string | undefined;
  data(name: string, value?: string): ET | string | undefined {
    if (value !== undefined) {
      this._nodes.forEach((el) => {
        (el as unknown as HTMLElement).dataset[name] = value;
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return undefined;
    return (this._nodes[0] as unknown as HTMLElement).dataset[name];
  }

  val(): string | boolean;
  val(val: string | boolean): ET;
  val(val?: string | boolean): ET | string | boolean {
    if (val !== undefined) {
      this._nodes.forEach((el) => {
        const input = el as unknown as HTMLInputElement;
        if (input.type === "checkbox" && typeof val === "boolean") {
          input.checked = val;
        } else {
          input.value = String(val);
        }
      });
      return this as unknown as ET;
    }
    if (this._nodes.length === 0) return "";
    const el = this._nodes[0] as unknown as HTMLInputElement;
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }

  serialize(format: "querystring" | "json" = "querystring"): string {
    const mapValue = (value: string | boolean) =>
      typeof value === "boolean" ? (value ? "on" : "off") : value;

    const formData = getAllFormValues(this);
    if (format === "json") return JSON.stringify(formData);

    const urlSearchParams = new URLSearchParams();
    Object.keys(formData).forEach((key) => {
      const value = formData[key];
      if (typeof value === "string") {
        urlSearchParams.append(key, value);
      } else if (typeof value === "boolean") {
        urlSearchParams.append(key, mapValue(value));
      } else if (Array.isArray(value)) {
        value.forEach((v) => {
          urlSearchParams.append(key, mapValue(v));
        });
      }
    });
    return urlSearchParams.toString();
  }

  form<T = FormKeyValues>(): T;
  form(formData: Record<string, string | boolean>): ET;
  form<T = FormKeyValues>(formData?: Record<string, string | boolean>): T | ET {
    if (formData !== undefined) {
      this._nodes.forEach((el) => {
        processAllFormElements(el as unknown as NodeType, (input, key) => {
          if (formData[key] !== undefined) {
            if (input.type === "checkbox") {
              (input as HTMLInputElement).checked = Boolean(formData[key]);
            } else {
              input.value = String(formData[key]);
            }
          }
        });
      });
      return this as unknown as ET;
    }
    return getAllFormValues(this) as unknown as T;
  }

  // --- Dimension Methods ---

  dimension(
    includeMarginOrPadding?: boolean,
    includePaddingIfMarginTrue?: boolean,
  ): Dimensions {
    if (this._nodes.length === 0) return { width: 0, height: 0 };

    const el = this._nodes[0] as unknown as HTMLElement;
    const style = this.window.getComputedStyle(el);
    if (!style) return { width: 0, height: 0 };

    const rect = el.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    let includeMargin = false;
    let includePadding = true;

    if (includePaddingIfMarginTrue !== undefined) {
      includeMargin = !!includeMarginOrPadding;
      includePadding = !!includePaddingIfMarginTrue;
    } else if (includeMarginOrPadding !== undefined) {
      includePadding = !!includeMarginOrPadding;
    }

    if (!includePadding) {
      const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
      const paddingRight = Number.parseFloat(style.paddingRight) || 0;
      const paddingTop = Number.parseFloat(style.paddingTop) || 0;
      const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
      const borderLeft = Number.parseFloat(style.borderLeftWidth) || 0;
      const borderRight = Number.parseFloat(style.borderRightWidth) || 0;
      const borderTop = Number.parseFloat(style.borderTopWidth) || 0;
      const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0;
      width -= paddingLeft + paddingRight + borderLeft + borderRight;
      height -= paddingTop + paddingBottom + borderTop + borderBottom;
    }

    if (includeMargin) {
      const marginLeft = Number.parseFloat(style.marginLeft) || 0;
      const marginRight = Number.parseFloat(style.marginRight) || 0;
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      const baseWidthForOuter = includePadding ? rect.width : width;
      const baseHeightForOuter = includePadding ? rect.height : height;
      return {
        width,
        height,
        outerWidth: baseWidthForOuter + marginLeft + marginRight,
        outerHeight: baseHeightForOuter + marginTop + marginBottom,
      };
    }

    return { width, height };
  }

  // --- Visibility Methods ---

  isVisible(): boolean {
    if (this._nodes.length === 0) return false;
    return checkElementVisibility(
      this._nodes[0] as unknown as HTMLElement,
      this.window,
      this.document,
    );
  }

  isHidden(): boolean {
    if (this._nodes.length === 0) return true;
    return !checkElementVisibility(
      this._nodes[0] as unknown as HTMLElement,
      this.window,
      this.document,
    );
  }

  // --- Scrolling Methods ---

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number): ET {
    scrollHelper(
      "scrollTo",
      this._nodes as unknown as NodeType[],
      xOrOptions,
      y,
    );
    return this as unknown as ET;
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number): ET {
    scrollHelper(
      "scrollBy",
      this._nodes as unknown as NodeType[],
      xOrOptions,
      y,
    );
    return this as unknown as ET;
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions): ET {
    if (this._nodes.length > 0) {
      (this._nodes[0] as unknown as HTMLElement).scrollIntoView(options);
    }
    return this as unknown as ET;
  }

  // --- Debug ---

  debug(cb: (chain: CallChainImpl<NT, ET>) => void): ET {
    cb(this);
    return this as unknown as ET;
  }

  // --- Cleanup ---

  dispose(): void {
    this._nodes.forEach((el) => {
      CallChainImpl.resultCache.delete(el as unknown as Element);
    });
    this._nodes.length = 0;
    this.length = 0;
  }

  // --- Ready ---

  ready(callback?: () => void): ET {
    if (
      this.document.readyState === "complete" ||
      this.document.readyState === "interactive"
    ) {
      if (callback) callback();
    } else {
      const doc = this.document;
      const handleDOMContentLoaded = () => {
        doc.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
        if (callback) callback();
      };
      doc.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    }
    return this as unknown as ET;
  }
}

// Dequery is just CallChainImpl - single class, no thenable
export type Dequery<NT> = CallChainImpl<NT, any>;

// --- Factory ---

// overloads for dynamic typing
export function dequery<T extends EventTarget>(
  selectorRefOrEl: T,
  options?: DequeryOptions<T> & ElementCreationOptions,
): Dequery<T>;

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
  options?: DequeryOptions<NT> & ElementCreationOptions,
): ET;

export function dequery<T extends NodeType, ST = any>(
  selectorRefOrEl: Ref<T, ST>,
  options?: DequeryOptions<T> & ElementCreationOptions,
): Dequery<T>;

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
  // Function callback - execute synchronously
  if (typeof selectorRefOrEl === "function") {
    const result = selectorRefOrEl();
    if (typeof result !== "undefined") {
      return dequery(result, options) as unknown as ET;
    }
    return dequery("body", options);
  }

  const chain = new CallChainImpl<NT, ET>({
    ...options,
    resultStack: [],
  });

  if (!selectorRefOrEl)
    throw new Error("dequery: selector/ref/element required");

  if (typeof selectorRefOrEl === "string") {
    if (selectorRefOrEl.indexOf("<") === 0) {
      // HTML string - create elements
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

      chain._nodes = elements as NT[];
      updateIndexAccess(chain);
      return chain as unknown as ET;
    }
    // CSS selector - query immediately
    chain.query(selectorRefOrEl);
    return chain as unknown as ET;
  }

  if (isRef(selectorRefOrEl)) {
    chain.ref(selectorRefOrEl);
    return chain as unknown as ET;
  }

  if ((selectorRefOrEl as Node).nodeType) {
    chain._nodes = [selectorRefOrEl as NT];
    updateIndexAccess(chain);
    return chain as unknown as ET;
  }

  if (isJSX(selectorRefOrEl)) {
    const renderResult = renderIsomorphicSync(
      selectorRefOrEl as JSX.Element,
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
    chain._nodes = elements as NT[];
    updateIndexAccess(chain);
    return chain as unknown as ET;
  }

  throw new Error("Unsupported selectorOrEl type");
}

// --- Extend ---

dequery.extend = <TExtendedClass extends new (...args: any[]) => any>(
  ExtensionClass: TExtendedClass,
) => {
  const extensionPrototype = ExtensionClass.prototype;
  const basePrototype = CallChainImpl.prototype;
  const extensionMethods = Object.getOwnPropertyNames(extensionPrototype);
  const baseMethods = Object.getOwnPropertyNames(basePrototype);

  extensionMethods.forEach((methodName) => {
    if (
      methodName !== "constructor" &&
      !baseMethods.includes(methodName) &&
      typeof extensionPrototype[methodName] === "function"
    ) {
      (CallChainImpl.prototype as any)[methodName] =
        extensionPrototype[methodName];
    }
  });

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

// --- Utilities ---

export function isDequery(obj: unknown): obj is CallChainImpl {
  return (
    typeof obj === "object" && obj !== null && obj instanceof CallChainImpl
  );
}

export function isDequeryOptionsObject(o: object) {
  return (
    o && typeof o === "object" && (o as DequeryOptions).globals !== undefined
  );
}

let defaultOptions: DequeryOptions<any> | null = null;

export function getDefaultDequeryOptions<NT>(): DequeryOptions<NT> {
  if (!defaultOptions) {
    defaultOptions = {
      timeout: 5000,
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
