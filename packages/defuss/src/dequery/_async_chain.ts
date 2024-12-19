import type { CSSProperties, Ref, RenderInput, Globals} from "defuss/jsx-runtime";
import { renderIsomorphic } from "../render/index.js";
import { runWithTimeGuard } from "../common/time.js";

export type ChainCall = [Function, Array<any>];
export type ChainCallStack = Array<ChainCall>;
export type NodeType = Node | Text | Element | Document | DocumentFragment;

export interface ApiCallStackExecutor {
  elements: Array<NodeType>;
  callStack: ChainCallStack;
  isResolved: boolean;
  lastResult: any;
  lastError: Error|null;
  then(resolve: any, reject: any): void;
}

export type SerializationValue = 
  | string 
  | SerializationArray;

export interface SerializationObject {
  [key: string]: SerializationValue;
}

export type SerializationArray = Array<SerializationObject>;

export type FormFieldValue = string | Date | File | boolean | number;

export interface FormKeyValues {
  // key or path (object path x.y.z) to form field value
  [keyOrPath: string]: FormFieldValue;
}

export type PropValue = string | boolean | number | null;

export type CssSelectionResult = Text | Element | Document | DocumentFragment;

/*
export interface DequeryApi extends ApiCallStackExecutor {

  // --- Traversal ---
  first(): DequeryApi;
  last(): DequeryApi;
  next(): DequeryApi;
  eq(idx: number): DequeryApi;
  prev(): DequeryApi;
  each(cb: (el: Element, idx: number) => void): DequeryApi;
  find(selector: string): DequeryApi;
  parent(): DequeryApi;
  children(): DequeryApi;
  closest(selector: string): DequeryApi;
  filter(selector: string): DequeryApi;

  // --- Attributes ---
  attr(name: string, value?: string): string | null | DequeryApi;

  // --- Mutations ---
  empty(): DequeryApi;
  html(newInnerHtml?: string): DequeryApi;
  jsx(newJsxPartialDom: RenderInput): DequeryApi;
  text(text?: string): DequeryApi;
  remove(): DequeryApi;
  replaceWith(vdomOrNode: RenderInput | NodeTypes): DequeryApi;
  append(content: string | NodeTypes): DequeryApi;

  // --- Events ---
  on(eventName: string, handler: EventListener): DequeryApi;
  off(eventName: string, handler: EventListener): DequeryApi;

  // --- CSS ---
  css(cssProps: CSSProperties|string, value?: string): DequeryApi;
  addClass(className: Array<string> | string): DequeryApi;
  removeClass(className: Array<string> | string): DequeryApi;
  hasClass(className: string): boolean;
  toggleClass(className: string): DequeryApi;
  animateClass(className: string, duration: number): DequeryApi;

  // --- Interaction Simulation ---
  click(): DequeryApi;
  focus(): DequeryApi;
  blur(): DequeryApi;

  // --- Data extraction ---
  val(value?: string | boolean): string | boolean | DequeryApi;
  map<T = any>(cb: (el: Element, idx: number) => any): Array<T>;
  toArray(): Array<CssSelectionResult>;
  get(): Array<CssSelectionResult>;
  get(idx: number): CssSelectionResult;
  prop(name: string): PropValue;
  prop(name: string, value: PropValue): DequeryApi;

  data(name: string): SerializationValue;
  data(name: string, value: string): DequeryApi;

  // --- Form management ---
  // returns a FormData object with all form fields' names and values
  form(): FormData;

  form(formData: FormData): DequeryApi;

  // performs a validation check on every form field and return the first error message/code or true
  validateForm(): boolean|string;
  // performs a validation check on a single form field and return the error message/code or true
  validateField(name: string): boolean|string;
}
*/

async function runCallStack(this: DequeryApi, resolve: any, reject: any) {
  const callResults = []

  for (let i = 0; i < this.callStack.length; i++) {
    const call = this.callStack[i]
    if (this.lastError) {
      break
    };

    try {
      this.lastResult = await call[0].apply(this, call[1]);
      // 0 is the function, 1 is the arguments
      callResults.push(this.lastResult)
    } catch (error) {
      this.lastError = error as unknown as Error;
      break
    }
  }

  if (this.lastError) {
    return reject(this.lastError)
  }
  return resolve(this.lastResult)
}

const addCall = (
  api: DequeryApi,
  fn: (this: DequeryApi, ...args: any[]) => any,
  args: Array<any> = []
): DequeryApi => {
  api.callStack.push([fn, args]);
  return api;
};

const elementGuard = <T = HTMLElement>(el: NodeType): T => {
  if(el instanceof HTMLElement) return el as T;
  throw new Error(`Expected an Element, but found: ${el.nodeName}`);
};


export interface DequeryOptions {
  maxWaitMs: number;
}

export const defaultConfig: DequeryOptions = {
  maxWaitMs: 1000,
};

export const dequery = (
  selectorRefOrEl: Element | Ref<Element> | string,
  options: DequeryOptions = defaultConfig
): DequeryApi => {

  if (!selectorRefOrEl) {
    throw new Error("dequery: selector, ref, or element is required. Got nothing.");
  }

  const api = new DequeryApi({ ...defaultConfig, ...options });

  if (typeof selectorRefOrEl === "string") {
    api.query(selectorRefOrEl);
  } else if (isRef(selectorRefOrEl)) {
    api.elements = [selectorRefOrEl.current];
  } else if (selectorRefOrEl.nodeType === Node.ELEMENT_NODE) {
    api.elements = [elementGuard(selectorRefOrEl)];
  }
  return api;
};

// Helper type guard to determine if the object is a Ref
const isRef = (obj: any): obj is Ref<Element> =>
  obj && typeof obj === "object" && "current" in obj;


class DequeryApi {

  constructor(
    public options: DequeryOptions = defaultConfig, 
    public isResolved = false,
    public elements: Array<NodeType> = [],
    public lastResult: any = null,
    public callStack: ChainCallStack = [],
    public lastError: Error|null = null,
  ) {
    this.options = { ...defaultConfig, ...options } // merge default options with user options
    this.callStack = [] // stack of calls to execute in then()
    this.elements = [] // elements found in the most recent waitForElement
    this.lastError = null
    this.lastResult = null
    this.isResolved = isResolved
  }

  // biome-ignore lint/suspicious/noThenProperty: this is a custom promise implementation resembling Playwright's API
  then(resolve: any, reject: any) {
    console.log('then called')
    runCallStack.call(this, resolve, reject);
  }

  // --- Traversal ---
  query(selector: string) {
    return addCall(
      this,
      async function query(this: DequeryApi, selector: string) {

        console.log('querying', selector)

        runWithTimeGuard(this.options.maxWaitMs, () => {
          console.log('querying', selector)
          console.log('this in timeGuard', this)
          this.elements = Array.from(document.querySelectorAll(selector));
        })
      },
      [selector]
    );
  }


  first() {
    return addCall(
      this,
      function first(this: DequeryApi) {
        this.elements = [this.elements[0]];
      }
    );
  }

  last() {
    return addCall(
      this,
      function last(this: DequeryApi) {
        const els = this.elements;
        this.elements = [els[els.length - 1]];
      }
    );
  }

  next() {
    return addCall(
      this,
      function next(this: DequeryApi) {
        const els = this.elements;
        this.elements = els
          .map((el) => elementGuard(el).nextElementSibling)
          .filter(Boolean) as Array<Element>;
      }
    );
  }

  eq(idx: number) {
    return addCall(
      this,
      function eq(this: DequeryApi, idx: number) {
        const els = this.elements;
        this.elements = [els[idx]];
      },
      [idx]
    );
  }

  prev() {
    return addCall(
      this,
      function prev(this: DequeryApi) {
        const els = this.elements;
        this.elements = els
          .map((el) => elementGuard(el).previousElementSibling)
          .filter(Boolean) as Array<Element>;
      }
    );
  }

  each(cb: (el: NodeType, idx: number) => void) {
    return addCall(
      this,
      function each(
        this: DequeryApi,
        cb: (el: NodeType, idx: number) => void
      ) {
        const els = this.elements;
        els.forEach(cb);
      },
      [cb]
    );
  }

  find(selector: string) {
    return addCall(
      this,
      function find(this: DequeryApi, selector: string) {
        const els = this.elements;
        this.elements = els.flatMap((el) =>
          Array.from(elementGuard(el).querySelectorAll(selector))
        );
      },
      [selector]
    );
  }

  parent() {
    return addCall(
      this,
      function parent(this: DequeryApi) {
        const els = this.elements;
        this.elements = els
          .map((el) => el.parentElement)
          .filter(Boolean) as Array<Element>;
      }
    );
  }

  children() {
    return addCall(
      this,
      function children(this: DequeryApi) {
        const els = this.elements;
        this.elements = els.flatMap((el) => Array.from(elementGuard(el).children));
      }
    );
  }

  closest(selector: string) {
    return addCall(
      this,
      function closest(this: DequeryApi, selector: string) {
        const els = this.elements;
        this.elements = els
          .map((el) => elementGuard(el).closest(selector))
          .filter(Boolean) as Array<Element>;
      },
      [selector]
    );
  }

  filter(selector: string) {
    return addCall(
      this,
      function filter(this: DequeryApi, selector: string) {
        const els = this.elements;
        this.elements = els.filter((el) => elementGuard(el).matches(selector));
      },
      [selector]
    );
  }

  // --- Attributes ---

  attr(name: string, value?: string) {
    return addCall(
      this,
      function attr(this: DequeryApi, name: string, value?: string) {
        if (value) {
          this.elements.forEach((el) => elementGuard(el).setAttribute(name, value));
        }
        return elementGuard(this.elements[0])?.getAttribute(name);
      },
      [name, value]
    );
  }

  // --- Mutations ---

  empty() {
    return addCall(
      this,
      function empty(this: DequeryApi) {
        // biome-ignore lint/suspicious/noAssignInExpressions: easier to read this way, and safe
        this.elements.forEach((el) => (elementGuard(el).innerHTML = ""));
      }
    );
  }

  html(newInnerHtml?: string) {
    return addCall(
      this,
      function html(this: DequeryApi, newInnerHtml?: string) {
        if (newInnerHtml) {

          // biome-ignore lint/suspicious/noAssignInExpressions: will be replaced by partial hydration
          this.elements.forEach((el) => (elementGuard(el).innerHTML = newInnerHtml));
        }
      },
      [newInnerHtml]
    );
  }


  jsx(newJsxPartialDom: RenderInput) {
    return addCall(
      this,
      function jsx(this: DequeryApi, newJsxPartialDom: RenderInput) {
        this.elements.forEach((el) => {
          elementGuard(el).innerHTML = "";
          el.appendChild(
            renderIsomorphic(
              newJsxPartialDom,
              elementGuard(el),
              globalThis as Globals
            ) as Node
          );
        });
      },
      [newJsxPartialDom]
    );
  }

  text(text?: string) {
    return addCall(
      this,
      function text(this: DequeryApi, _text?: string) {
        if (_text) {
          // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
          this.elements.forEach((el) => (elementGuard(el).textContent = _text));
        }
      },
      [text]
    );
  }

  remove() {
    return addCall(
      this,
      function remove(this: DequeryApi) {
        this.elements.forEach((el) => elementGuard(el).remove());
      }
    );
  }

  replaceWithJsx(vdomOrNode: RenderInput | NodeType) {
    return addCall(
      this,
      function replaceWith(
        this: DequeryApi,
        vdomOrNode: RenderInput | NodeType
      ) {
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
      },
      [vdomOrNode]
    );
  }

  append(content: string | NodeType) {
    return addCall(
      this,
      function append(
        this: DequeryApi,
        content: string | NodeType
      ) {
        this.elements.forEach((el) => {
          if (typeof content === "string") {
            elementGuard(el).innerHTML += content;
          } else {
            el.appendChild(content);
          }
        });
      },
      [content]
    );
  }

  // --- Events ---

  on(eventName: string, handler: EventListener) {
    return addCall(
      this,
      function on(
        this: DequeryApi,
        eventName: string,
        handler: EventListener
      ) {
        this.elements.forEach((el) =>
          el.addEventListener(eventName, handler)
        );
      },
      [eventName, handler]
    );
  }


  off(eventName: string, handler: EventListener) {
    return addCall(
      this,
      function off(
        this: DequeryApi,
        eventName: string,
        handler: EventListener
      ) {
        this.elements.forEach((el) =>
          el.removeEventListener(eventName, handler)
        );
      },
      [eventName, handler]
    );
  }

  // --- CSS ---

  css(cssProps: CSSProperties | string, value?: string) {
    return addCall(
      this,
      function css(
        this: DequeryApi,
        cssProps: CSSProperties | string,
        value?: string
      ) {
        if (!value && typeof cssProps === "string") {
          return elementGuard(this.elements[0])?.style.getPropertyValue(cssProps);
        } else if (!value && typeof cssProps === "object") {
          this.elements.forEach((el) => {
            for (const key in cssProps) {
              elementGuard(el).style.setProperty(key, cssProps[key as keyof CSSProperties] as string);
            }
          });
        } else if (typeof value === "string" && typeof cssProps === "string") {
          this.elements.forEach((el) => {
            elementGuard(el).style.setProperty(cssProps, value);
          });
        }
      },
      [cssProps, value]
    );
  }

  // --- CSS ---

  addClass(className: Array<string> | string) {
    return addCall(
      this,
      function addClass(
        this: DequeryApi,
        className: Array<string> | string
      ) {
        const classes = Array.isArray(className) ? className : [className];
        this.elements.forEach((el) => elementGuard(el).classList.add(...classes));
      },
      [className]
    );
  }

  removeClass(className: Array<string> | string) {
    return addCall(
      this,
      function removeClass(
        this: DequeryApi,
        className: Array<string> | string
      ) {
        const classes = Array.isArray(className) ? className : [className];
        this.elements.forEach((el) => elementGuard(el).classList.remove(...classes));
      },
      [className]
    );
  }

  hasClass(className: string) {
    return addCall(
      this,
      function hasClass(this: DequeryApi, className: string) {
        return this.elements.every((el) => elementGuard(el).classList.contains(className));
      },
      [className]
    );
  }

  toggleClass(className: string) {
    return addCall(
      this,
      function toggleClass(this: DequeryApi, className: string) {
        this.elements.forEach((el) => elementGuard(el).classList.toggle(className));
      },
      [className]
    );
  }

  animateClass(className: string, duration: number) {
    return addCall(
      this,
      function animateClass(
        this: DequeryApi,
        className: string,
        duration: number
      ) {
        this.elements.forEach((el) => {
          elementGuard(el).classList.add(className);
          setTimeout(() => elementGuard(el).classList.remove(className), duration);
        });
      },
      [className, duration]
    );
  }

  // --- Interaction Simulation ---

  click() {
    return addCall(
      this,
      function click(this: DequeryApi) {
        this.elements.forEach((el) => elementGuard(el).click());
      }
    );
  }

  focus() {
    return addCall(
      this,
      function focus(this: DequeryApi) {
        this.elements.forEach((el) => elementGuard(el).focus());
      }
    );
  }

  blur() {
    return addCall(
      this,
      function blur(this: DequeryApi) {
        this.elements.forEach((el) => elementGuard(el).blur());
      }
    );
  }

  // --- Data extraction ---

  val(value?: string | boolean) {
    return addCall(
      this,
      function val(this: DequeryApi, value?: string | boolean) {
        if (value) {
          this.elements.forEach((el) => {
            if (el instanceof HTMLInputElement) {
              el.value = value as string;
            }
          });
        }
        return elementGuard<HTMLInputElement>(this.elements[0])?.value;
      },
      [value]
    );
  }

  map<T = any>(cb: (el: NodeType, idx: number) => any) {

    return addCall(
      this,
      function map(this: DequeryApi, cb: (el: NodeType, idx: number) => any) {
        return this.elements.map(cb) as Array<T>;
      },
      [cb]
    );
  }

  get(idx?: number) {
    return addCall(
      this,
      function get(this: DequeryApi, idx?: number) {
        return idx ? this.elements[idx] : this.elements;
      },
      [idx]
    );
  }

  prop<K extends keyof HTMLElement>(name: K, value?: HTMLElement[K]): DequeryApi {
    return addCall(
      this,
      function prop(this: DequeryApi, propName: K, value?: HTMLElement[K]) {
        if (value !== undefined) {
          this.elements.forEach((el) => {
            elementGuard(el)[propName] = value;
          });
        }
        return elementGuard(this.elements[0])?.[propName] as HTMLElement[K];
      },
      [name, value]
    );
  }

  data(name: string, value?: string) {
    return addCall(
      this,
      function data(this: DequeryApi, name: string, value?: string) {
        if (value) {
          this.elements.forEach((el) => {
            elementGuard(el).dataset[name] = value;
          });
        }
        return elementGuard(this.elements[0])?.dataset[name];
      },
      [name, value]
    );
  }

  // --- Form management ---
  form(formData?: FormKeyValues) {
    return addCall(
      this,
      function form(this: DequeryApi, formData?: FormKeyValues) {
        if (formData) {
          // Iterate over formData entries correctly using Object.entries
          for (const [key, value] of Object.entries(formData)) {
            this.elements.forEach((el) => {
              if (el instanceof HTMLInputElement) {
                el.value = value as string;
              }
            });
          }
        }
        const formFields: Record<string, string> = {};
        this.elements.forEach((el) => {
          if (el instanceof HTMLInputElement) {
            formFields[el.name] = el.value;
          }
        });
        return formFields;
      },
      [formData]
    );
  }
}