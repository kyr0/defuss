import { updateDom, updateDomWithVdom } from "../common/dom.js";
import { isRef, renderIsomorphicSync, type CSSProperties, type Globals, type Ref, type RenderInput } from "../render/index.js";

export type NodeType = Node | Text | Element | Document | DocumentFragment | HTMLElement | SVGElement;

export type FormFieldValue = string | Date | File | boolean | number;

export interface FormKeyValues {
  // key or path (object path x.y.z) to form field value
  [keyOrPath: string]: FormFieldValue;
}

const elementGuard = <T = HTMLElement>(el: NodeType): T => {
  if (el instanceof HTMLElement) return el as T;

  let message = "Expected an HTMLElement, but found: ";
  if (el?.nodeName) {
    message += el.nodeName
  } else {
    message += el
  }
  console.warn(message);
  return el as T;
};

export interface DequeryOptions {
  maxWaitMs: number;
}

export const defaultConfig: DequeryOptions = {
  maxWaitMs: 1000,
};

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase & JSX.HTMLAttributesLowerCase & { html?: string, text?: string };

export const dequery = (
  selectorRefOrEl: Node | Element | Text | Ref<Node | Element | Text, any> | string | null | undefined,
  options: DequeryOptions | ElementCreationOptions = defaultConfig
): Dequery => {

  if (!selectorRefOrEl) {
    console.error("dequery: selector, ref, or element is required. Got nothing.");
    throw new Error("dequery: selector, ref, or element is required. Got nothing.");
  }

  const api = new Dequery({ ...defaultConfig, ...options });

  if (typeof selectorRefOrEl === "string") {
    const elementCreationRegex = /^<(\w+)>$/; // regex to match element creation syntax like <div>
    const matchesCreateElementSyntax = selectorRefOrEl.match(elementCreationRegex);

    if (matchesCreateElementSyntax) {
      // create a new element if the string matches the element creation syntax
      const newElement = document.createElement(matchesCreateElementSyntax[1]);
      const { text, html, ...attributes } = options as ElementCreationOptions;

      // set attributes
      Object.entries(attributes).forEach(([key, value]) => {
        newElement.setAttribute(key, String(value));
      });

      // set innerHTML or textContent if provided
      if (html) {
        newElement.innerHTML = html;
      } else if (text) {
        newElement.textContent = text;
      }

      api.elements = [newElement];
    } else {
      // otherwise, treat it as a query selector
      api.query(selectorRefOrEl);
    }
  } else if (isRef(selectorRefOrEl)) {
    api.elements = [selectorRefOrEl.current];
  } else if ((selectorRefOrEl as Node).nodeType === Node.ELEMENT_NODE) {
    api.elements = [selectorRefOrEl as Node];
  }
  // warns if element is not found
  elementGuard(api.el)
  return api;
};

interface DequeryArrayLike {
  [index: number]: NodeType;
  length: number;
}

export class Dequery implements DequeryArrayLike {
  [index: number]: HTMLElement & SVGElement; // Proxy-based array-like access

  constructor(
    public options: DequeryOptions = defaultConfig,
    public elements: Array<NodeType> = []
  ) {
    this.options = { ...defaultConfig, ...options }; // merge default options with user options
    this.elements = []; // elements found in the most recent operation

    // Create a proxy to allow array-like access and proper "this" binding
    const proxy = new Proxy(this, {
      get(target, prop) {
        if (typeof prop === 'string' && !Number.isNaN(Number(prop))) {
          return target.elements[Number(prop)] as NodeType;
        }
        const value = (target as any)[prop];
        if (typeof value === 'function') {
          // biome-ignore lint/complexity/useArrowFunction: <explanation>
          return function (...args: any[]) {
            // Bind method calls to the proxy so that "this" remains the proxy
            return value.apply(proxy, args);
          };
        }
        return value;
      }
    });
    // biome-ignore lint/correctness/noConstructorReturn: <explanation>
    return proxy;
  }

  get el() {
    return this.elements[0];
  }

  // --- Traversal ---

  tap(cb: (el: NodeType | Array<NodeType>) => void): Dequery {
    cb(this.elements);
    return this;
  }

  query(selector: string): Dequery {
    this.elements = Array.from(document.querySelectorAll(selector));
    return this;
  }

  get length(): number {
    return this.elements.length;
  }

  first(): Dequery {
    this.elements = [this.el];
    return this;
  }

  last(): Dequery {
    const els = this.elements;
    this.elements = [els[els.length - 1]];
    return this;
  }

  next(): Dequery {
    this.elements = this.elements
      .map((el) => elementGuard(el).nextElementSibling)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  /*
  [Symbol.iterator](): IterableIterator<Dequery> {
    let index = 0;
    const elements = this.elements;

    return {
      next(): IteratorResult<Dequery> {
        if (index < elements.length) {
          return { value: $(elements[index++]), done: false };
        }
        return { value: $(`#_nonexisting${Date.now()}`), done: true };
      },
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  */

  eq(idx: number): Dequery {
    this.elements = [this.elements[idx]];
    return this;
  }

  prev(): Dequery {
    this.elements = this.elements
      .map((el) => elementGuard(el).previousElementSibling)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  each(cb: (el: NodeType, idx: number) => void): Dequery {
    this.elements.forEach(cb);
    return this;
  }

  find(selector: string): Dequery {
    this.elements = this.elements.flatMap((el) =>
      Array.from(elementGuard(el).querySelectorAll(selector))
    );
    return this;
  }

  parent(): Dequery {
    this.elements = this.elements
      .map((el) => el.parentElement)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  children(): Dequery {
    this.elements = this.elements.flatMap((el) => Array.from(elementGuard(el).children));
    return this;
  }

  closest(selector: string): Dequery {
    this.elements = this.elements
      .map((el) => elementGuard(el).closest(selector))
      .filter(Boolean) as Array<Element>;
    return this;
  }

  filter(selector: string): Dequery {
    this.elements = this.elements.filter((el) => elementGuard(el).matches(selector));
    return this;
  }

  // --- Attributes ---

  attr(name: string): string | null;
  attr(name: string, value: string): Dequery;
  attr(name: string, value?: string): Dequery | string | null {
    if (value !== undefined) {
      this.elements.forEach((el) => elementGuard(el).setAttribute(name, value));
      return this;
    }
    // retrieve the attribute value from the first element
    return elementGuard(this.el)?.getAttribute(name) ?? null;
  }

  // --- Mutations ---

  empty(): Dequery {
    this.elements.forEach((el) => {
      elementGuard(el).innerHTML = "";
    });
    return this;
  }

  html(newInnerHtml?: string): Dequery {
    if (newInnerHtml) {
      this.elements.forEach((el) => {
        // partial update HTML sub-tree with new HTML (using DOMParser)
        updateDom(elementGuard(el), newInnerHtml);
      });
    }
    return this;
  }

  jsx(newJsxPartialDom: RenderInput): Dequery {
    this.elements.forEach((el) => {
      // partially update the DOM with new JSX (using renderIsomorphic) 
      updateDomWithVdom(elementGuard(el), newJsxPartialDom, globalThis as Globals);
    });
    return this;
  }

  text(text?: string): Dequery {
    if (text) {
      this.elements.forEach((el) => {
        elementGuard(el).textContent = text;
      });
    }
    return this;
  }

  update(textOrHtmlOrJsx: string | RenderInput): Dequery {
    if (typeof textOrHtmlOrJsx === "string") {
      const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(textOrHtmlOrJsx);
      if (hasHtmlTags) {
        this.html(textOrHtmlOrJsx);
      } else {
        this.text(textOrHtmlOrJsx);
      }
    } else {
      this.jsx(textOrHtmlOrJsx);
    }
    return this;
  }

  remove(): Dequery {
    this.elements.forEach((el) => elementGuard(el).remove());
    return this;
  }

  replaceWithJsx(vdomOrNode: RenderInput | NodeType): Dequery {
    this.elements.forEach((el) => {
      const newEl =
        vdomOrNode instanceof Node
          ? vdomOrNode
          : (renderIsomorphicSync(
            vdomOrNode,
            elementGuard(el),
            globalThis as Globals
          ) as Node);
      el.parentNode?.replaceChild(newEl.cloneNode(true), el);
    });
    return this;
  }

  append(content: string | NodeType | Dequery): Dequery {
    if (content == null) {
      return this;
    }

    // Use a static copy of the elements so that mutations don’t affect the iteration
    const targets = this.elements.slice();
    targets.forEach((el) => {
      if (typeof content === "string") {
        (el as HTMLElement).innerHTML += content;
      } else if (content instanceof Dequery) {
        // Append each element from the content. If appending to multiple targets,
        // clone for all but the first.
        content.elements.forEach((childEl, index) => {
          const nodeToAppend =
            targets.length > 1 && index > 0
              ? childEl.cloneNode(true)
              : childEl;
          el.appendChild(nodeToAppend);
        });
      } else {
        el.appendChild(content);
      }
    });
    return this;
  }

  toArray(): Array<NodeType> {
    return [...this.elements];
  }

  // --- Events ---

  on(eventName: string, handler: EventListener): Dequery {
    this.elements.forEach((el) =>
      el.addEventListener(eventName, handler)
    );
    return this;
  }

  off(eventName: string, handler: EventListener): Dequery {
    this.elements.forEach((el) =>
      el.removeEventListener(eventName, handler)
    );
    return this;
  }

  // --- CSS ---

  css(cssProps: string): string | undefined;
  css(cssProps: CSSProperties): Dequery;
  css(cssProps: string, value: string): Dequery;
  css(cssProps: CSSProperties | string, value?: string): Dequery | string | undefined {
    if (!value && typeof cssProps === "string") {
      // get a single CSS property value
      return elementGuard(this.el)?.style.getPropertyValue(cssProps);
    } else if (!value && typeof cssProps === "object") {
      // set multiple CSS properties
      this.elements.forEach((el) => {
        for (const key in cssProps) {
          elementGuard(el).style.setProperty(
            key,
            cssProps[key as keyof CSSProperties] as string
          );
        }
      });
      return this;
    } else if (typeof value === "string" && typeof cssProps === "string") {
      // set a single CSS property value
      this.elements.forEach((el) => {
        elementGuard(el).style.setProperty(cssProps, value);
      });
      return this;
    }
    return this;
  }

  addClass(className: Array<string> | string): Dequery {
    const classes = Array.isArray(className) ? className : [className];
    this.elements.forEach((el) => elementGuard(el).classList.add(...classes));
    return this;
  }

  removeClass(className: Array<string> | string): Dequery {
    const classes = Array.isArray(className) ? className : [className];
    this.elements.forEach((el) => elementGuard(el).classList.remove(...classes));
    return this;
  }

  hasClass(className: string): boolean {
    return this.elements.every((el) => elementGuard(el).classList.contains(className));
  }

  toggleClass(className: string): Dequery {
    this.elements.forEach((el) => elementGuard(el).classList.toggle(className));
    return this;
  }

  animateClass(className: string, duration: number): Dequery {
    this.elements.forEach((el) => {
      elementGuard(el).classList.add(className);
      setTimeout(() => elementGuard(el).classList.remove(className), duration);
    });
    return this;
  }

  // --- Interaction Simulation ---

  trigger(eventType: string): Dequery {
    this.elements.forEach((el) => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      elementGuard(el).dispatchEvent(event);
    });
    return this;
  }

  // --- Data extraction ---
  val(value: string | boolean): Dequery;
  val(): string | undefined;
  val(value?: string | boolean): Dequery | string | undefined {
    if (typeof value !== 'undefined') {
      this.elements.forEach((el) => {
        if (el instanceof HTMLInputElement) {
          el.value = String(value);
        }
      });
      return this;
    } else {
      return elementGuard<HTMLInputElement>(this.el)?.value;
    }
  }

  map<T = any>(cb: (el: NodeType, idx: number) => any): Array<T> {
    return this.elements.map(cb) as Array<T>;
  }

  prop<K extends keyof HTMLElement>(name: K, value: HTMLElement[K]): Dequery;
  prop<K extends keyof HTMLElement>(name: K): HTMLElement[K];
  prop<K extends keyof HTMLElement>(name: K, value?: HTMLElement[K]): Dequery | HTMLElement[K] {
    if (typeof value !== "undefined") {
      this.elements.forEach((el) => {
        elementGuard(el)[name] = value;
      });
      return this;
    }
    return elementGuard(this.el)[name];
  }

  data(name: string): string | undefined;
  data(name: string, value: string): Dequery;
  data(name: string, value?: string): Dequery | string | undefined {
    if (typeof value !== "undefined") {
      this.elements.forEach((el) => {
        elementGuard(el).dataset[name] = value;
      });
      return this;
    }
    return elementGuard(this.el)?.dataset[name];
  }

  // --- Form management ---

  form(): FormKeyValues;
  form(formData: FormKeyValues): Dequery;
  form(formData?: FormKeyValues): Dequery | FormKeyValues {
    if (formData) {
      Object.entries(formData).forEach(([key, value]) => {
        this.elements.forEach((el) => {
          if (el instanceof HTMLInputElement) {
            el.value = value as string;
          }
        });
      });
      return this;
    }

    const formFields: Record<string, string> = {};
    this.elements.forEach((el) => {
      if (el instanceof HTMLInputElement) {
        formFields[el.name] = el.value;
      }
    });
    return formFields;
  }
}

// for query-like syntax
export const $ = dequery;
// alternative syntax
export const d = dequery;