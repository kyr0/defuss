import { updateDomWithVdom } from "@/common/dom.js";
import { isRef, renderIsomorphic, type CSSProperties, type Globals, type Ref, type RenderInput } from "../render/index.js";

export type NodeType = Node | Text | Element | Document | DocumentFragment;

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
  throw new Error(message);
};

export interface DequeryOptions {
  maxWaitMs: number;
}

export const defaultConfig: DequeryOptions = {
  maxWaitMs: 1000,
};

export const dequery = (
  selectorRefOrEl: Element | Ref<Node | Element | Text, any> | string,
  options: DequeryOptions = defaultConfig
): DequeryApi => {

  if (!selectorRefOrEl) {
    console.error("dequery: selector, ref, or element is required. Got nothing.");
    throw new Error("dequery: selector, ref, or element is required. Got nothing.");
  }

  const api = new DequeryApi({ ...defaultConfig, ...options });

  if (typeof selectorRefOrEl === "string") {
    api.query(selectorRefOrEl);
  } else if (isRef(selectorRefOrEl)) {
    api.elements = [selectorRefOrEl.current];
  } else if ((selectorRefOrEl as Node).nodeType === Node.ELEMENT_NODE) {
    api.elements = [selectorRefOrEl as Node];
  }
  // throws if there is no element found
  elementGuard(api.elements[0])
  return api;
};

class DequeryApi {

  constructor(
    public options: DequeryOptions = defaultConfig, 
    public elements: Array<NodeType> = []
  ) {
    this.options = { ...defaultConfig, ...options }; // merge default options with user options
    this.elements = []; // elements found in the most recent operation
  }

  // --- Traversal ---

  tap(cb: (el: NodeType|Array<NodeType>) => void): DequeryApi {
    cb(this.elements);
    return this;
  }

  query(selector: string): DequeryApi {
    console.log('querying', selector);
    this.elements = Array.from(document.querySelectorAll(selector));
    return this;
  }

  first(): DequeryApi {
    this.elements = [this.elements[0]];
    return this;
  }

  last(): DequeryApi {
    const els = this.elements;
    this.elements = [els[els.length - 1]];
    return this;
  }

  next(): DequeryApi {
    this.elements = this.elements
      .map((el) => elementGuard(el).nextElementSibling)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  eq(idx: number): DequeryApi {
    this.elements = [this.elements[idx]];
    return this;
  }

  prev(): DequeryApi {
    this.elements = this.elements
      .map((el) => elementGuard(el).previousElementSibling)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  each(cb: (el: NodeType, idx: number) => void): DequeryApi {
    this.elements.forEach(cb);
    return this;
  }

  find(selector: string): DequeryApi {
    this.elements = this.elements.flatMap((el) =>
      Array.from(elementGuard(el).querySelectorAll(selector))
    );
    return this;
  }

  parent(): DequeryApi {
    this.elements = this.elements
      .map((el) => el.parentElement)
      .filter(Boolean) as Array<Element>;
    return this;
  }

  children(): DequeryApi {
    this.elements = this.elements.flatMap((el) => Array.from(elementGuard(el).children));
    return this;
  }

  closest(selector: string): DequeryApi {
    this.elements = this.elements
      .map((el) => elementGuard(el).closest(selector))
      .filter(Boolean) as Array<Element>;
    return this;
  }

  filter(selector: string): DequeryApi {
    this.elements = this.elements.filter((el) => elementGuard(el).matches(selector));
    return this;
  }

  // --- Attributes ---

  attr(name: string): string | null;
  attr(name: string, value: string): DequeryApi;
  attr(name: string, value?: string): DequeryApi | string | null {
    if (value !== undefined) {
      this.elements.forEach((el) => elementGuard(el).setAttribute(name, value));
      return this;
    }
    // retrieve the attribute value from the first element
    return elementGuard(this.elements[0])?.getAttribute(name) ?? null;
  }

  // --- Mutations ---

  empty(): DequeryApi {
    this.elements.forEach((el) => {
      elementGuard(el).innerHTML = "";
    });
    return this;
  }

  html(newInnerHtml?: string): DequeryApi {

    // TODO: would be nive if we could console.warn here only in dev mode!
    if (newInnerHtml) {
      this.elements.forEach((el) => {
        elementGuard(el).innerHTML = newInnerHtml;
      });
    }
    return this;
  }

  jsx(newJsxPartialDom: RenderInput): DequeryApi {
    this.elements.forEach((el) => {

      updateDomWithVdom(elementGuard(el), newJsxPartialDom, globalThis as Globals);
      
      /*
      elementGuard(el).innerHTML = "";

      let nodes = renderIsomorphic(
        newJsxPartialDom,
        elementGuard(el),
        globalThis as Globals
      ) as Array<Node> 

      if (!Array.isArray(nodes)) {
        nodes = [nodes];
      }

      nodes.forEach((node) => {
        el.appendChild(node)
      });
      */
    });
    return this;
  }

  text(text?: string): DequeryApi {
    if (text) {
      this.elements.forEach((el) => {
        elementGuard(el).textContent = text;
      });
    }
    return this;
  }

  remove(): DequeryApi {
    this.elements.forEach((el) => elementGuard(el).remove());
    return this;
  }

  replaceWithJsx(vdomOrNode: RenderInput | NodeType): DequeryApi {
    this.elements.forEach((el) => {
      const newEl =
        vdomOrNode instanceof Node
          ? vdomOrNode
          : (renderIsomorphic(
              vdomOrNode,
              elementGuard(el),
              globalThis as Globals
            ) as Node);
      el.parentNode?.replaceChild(newEl.cloneNode(true), el);
    });
    return this;
  }

  append(content: string | NodeType): DequeryApi {
    this.elements.forEach((el) => {
      if (typeof content === "string") {
        elementGuard(el).innerHTML += content;
      } else {
        el.appendChild(content);
      }
    });
    return this;
  }

  // --- Events ---

  on(eventName: string, handler: EventListener): DequeryApi {
    this.elements.forEach((el) =>
      el.addEventListener(eventName, handler)
    );
    return this;
  }

  off(eventName: string, handler: EventListener): DequeryApi {
    this.elements.forEach((el) =>
      el.removeEventListener(eventName, handler)
    );
    return this;
  }

  // --- CSS ---
  
  css(cssProps: string): string | undefined;
  css(cssProps: CSSProperties): DequeryApi;
  css(cssProps: string, value: string): DequeryApi;
  css(cssProps: CSSProperties | string, value?: string): DequeryApi | string | undefined {
    if (!value && typeof cssProps === "string") {
      // get a single CSS property value
      return elementGuard(this.elements[0])?.style.getPropertyValue(cssProps);
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

  addClass(className: Array<string> | string): DequeryApi {
    const classes = Array.isArray(className) ? className : [className];
    this.elements.forEach((el) => elementGuard(el).classList.add(...classes));
    return this;
  }

  removeClass(className: Array<string> | string): DequeryApi {
    const classes = Array.isArray(className) ? className : [className];
    this.elements.forEach((el) => elementGuard(el).classList.remove(...classes));
    return this;
  }

  hasClass(className: string): DequeryApi {
    const hasAll = this.elements.every((el) => elementGuard(el).classList.contains(className));
    console.log(`Has class "${className}":`, hasAll);
    return this;
  }

  toggleClass(className: string): DequeryApi {
    this.elements.forEach((el) => elementGuard(el).classList.toggle(className));
    return this;
  }

  animateClass(className: string, duration: number): DequeryApi {
    this.elements.forEach((el) => {
      elementGuard(el).classList.add(className);
      setTimeout(() => elementGuard(el).classList.remove(className), duration);
    });
    return this;
  }

  // --- Interaction Simulation ---

  click(): DequeryApi {
    this.elements.forEach((el) => elementGuard(el).click());
    return this;
  }

  focus(): DequeryApi {
    this.elements.forEach((el) => elementGuard(el).focus());
    return this;
  }

  blur(): DequeryApi {
    this.elements.forEach((el) => elementGuard(el).blur());
    return this;
  }

  // --- Data extraction ---
  val(value: string | boolean): DequeryApi;
  val(): string | undefined;
  val(value?: string | boolean): DequeryApi | string | undefined {
    if (typeof value !== 'undefined') {
      this.elements.forEach((el) => {
        if (el instanceof HTMLInputElement) {
          el.value = String(value);
        }
      });
      return this;
    } else {
      return elementGuard<HTMLInputElement>(this.elements[0])?.value;
    }
  }

  map<T = any>(cb: (el: NodeType, idx: number) => any): Array<T> {
    return this.elements.map(cb) as Array<T>;
  }

  get(idx?: number): DequeryApi {
    if (typeof idx !== "undefined") {
      this.elements = [this.elements[idx]];
    }
    return this;
  }

  prop<K extends keyof HTMLElement>(name: K, value: HTMLElement[K]): DequeryApi;
  prop<K extends keyof HTMLElement>(name: K): HTMLElement[K];
  prop<K extends keyof HTMLElement>(name: K, value?: HTMLElement[K]): DequeryApi | HTMLElement[K] {
    if (typeof value !== "undefined") {
      this.elements.forEach((el) => {
        elementGuard(el)[name] = value;
      });
      return this;
    }
    return elementGuard(this.elements[0])[name];
  }

  data(name: string): string | undefined;
  data(name: string, value: string): DequeryApi;
  data(name: string, value?: string): DequeryApi | string | undefined {
    if (typeof value !== "undefined") {
      this.elements.forEach((el) => {
        elementGuard(el).dataset[name] = value;
      });
      return this;
    }
    return elementGuard(this.elements[0])?.dataset[name];
  }

  // --- Form management ---
  
  form(): FormKeyValues;
  form(formData: FormKeyValues): DequeryApi;
  form(formData?: FormKeyValues): DequeryApi | FormKeyValues {
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