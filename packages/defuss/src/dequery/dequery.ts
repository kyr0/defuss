import { updateDom, updateDomWithVdom } from "../common/dom.js";
import { isJSX, isRef, renderIsomorphicSync, type AllHTMLElements, type CSSProperties, type Globals, type Ref, type RenderInput } from "../render/index.js";

// --- Types & Helpers ---
export type NodeType = Node | Text | Element | Document | DocumentFragment | HTMLElement | SVGElement;
export type FormFieldValue = string | Date | File | boolean | number;
export interface FormKeyValues { [keyOrPath: string]: FormFieldValue; }

const elementGuard = <T = HTMLElement>(el: NodeType): T => {
  if (el instanceof HTMLElement) return el as T;
  console.warn("Expected HTMLElement, but found:", el?.nodeName ?? el);
  return el as T;
};

export interface DequeryOptions {
  maxWaitMs?: number;
  timeout?: number;
  delay?: number;
  initialEl?: NodeType;
  state?: any;
  verbose?: boolean;
  onTimeGuardError?: (ms: number, call: Call) => void;
}

export const adefaultConfig: DequeryOptions = {
  maxWaitMs: 1000,
  timeout: 5000,
  delay: 0,
  verbose: false,
  onTimeGuardError: () => { }
};

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase & JSX.HTMLAttributesLowerCase & { html?: string, text?: string };

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

class CallChainImpl implements DequeryArrayLike {
  [index: number]: NodeType;

  options: DequeryOptions;
  callStack: Array<Call>;
  chainStack: Array<Array<Call>>;
  elements: Array<NodeType>;
  prevElements: Array<NodeType>;
  stoppedWithError: boolean;
  lastResult: any;
  isResolved: boolean;

  constructor(options: DequeryOptions = {}, isResolved = false) {
    this.options = { ...adefaultConfig, ...options };
    this.callStack = [];
    this.chainStack = [];
    this.elements = options.initialEl ? [options.initialEl] : [];
    this.prevElements = [];
    this.stoppedWithError = false;
    this.lastResult = null;
    this.isResolved = isResolved;

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
            return value.apply(proxy, args)
          };
        }
        return value;
      }
    });
    // biome-ignore lint/correctness/noConstructorReturn: <explanation>
    return proxy;
  }

  // --- Internal ---
  resetElements() {
    this.prevElements = [...this.elements];
    this.elements = this.options.initialEl ? [this.options.initialEl] : [];
  }
  getFirstElement() {
    return this.elements[0];
  }

  createSubChain(clone = true) {
    if (clone) {
      const newChain = new DequeryChain({ ...this.options, initialEl: this.getFirstElement() }, true);
      newChain.elements = this.elements
      newChain.prevElements = this.prevElements
      newChain.callStack = this.callStack
      newChain.chainStack = this.chainStack
      newChain.stoppedWithError = this.stoppedWithError;
      newChain.lastResult = this.lastResult;
      return newChain;
    } else {
      return new DequeryChain({ ...this.options, initialEl: this.getFirstElement() }, true);
    }
  }

  // --- Initialization ---
  __init(selectorHtmlRefOrElementRef: string | NodeType | Ref<NodeType, any> | RenderInput,
    options: DequeryOptions | ElementCreationOptions
  ) {
    if (!selectorHtmlRefOrElementRef) throw new Error('dequery: selector/ref/element required');
    if (typeof selectorHtmlRefOrElementRef === 'string') {
      if (selectorHtmlRefOrElementRef.indexOf('<') === 0) {
        this.elements = renderHTML(selectorHtmlRefOrElementRef)

        const { text, html, ...attributes } = options as ElementCreationOptions;

        if (typeof this.elements[0] !== "undefined" && this.elements[0] instanceof Element) {
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
      const renderResult = renderIsomorphicSync(selectorHtmlRefOrElementRef as RenderInput, undefined, globalThis as Globals);
      this.elements = (typeof renderResult !== "undefined" ? Array.isArray(renderResult) ? renderResult : [renderResult] : []) as NodeType[];
      return this.createSubChain();
    }
    throw new Error('Unsupported selectorOrEl type');
  }

  // --- Traversal ---
  debug(cb: (el: NodeType | Array<NodeType>) => void) {
    this.callStack.push(new Call(function debug(this: CallChainImpl) {
      cb(this.elements);
      return this.createSubChain(true);
    }));
    return this;
  }

  ref(ref: Ref<NodeType>) {
    this.callStack.push(new Call(async function ref(this: CallChainImpl, refObj: Ref<NodeType>) {
      await waitForRefWithPolling(refObj, this.options.maxWaitMs!);
      if (refObj.current) {
        this.elements = [elementGuard(refObj.current)];
      } else {
        throw new Error('Ref is null or undefined');
      }
      return this.createSubChain();
    }, ref));
    return this;
  }

  query(selector: string) {
    // @ts-ignore
    this.callStack.push(new Call(async function query(this: CallChainImpl, sel: string) {
      await waitForSelectorWithPolling(sel, this.options.maxWaitMs!);
      this.elements = Array.from(document.querySelectorAll(sel));
      return this.createSubChain();
    }, selector));
    return this;
  }

  all() {
    this.callStack.push(new Call(function all(this: CallChainImpl) {
      return this.elements.map(el => new DequeryChain({ ...this.options, initialEl: el }, true));
    }));
    return this;
  }

  get length(): number {
    return this.elements.length;
  }

  first() {
    this.callStack.push(new Call(function first(this: CallChainImpl) {
      this.elements = [this.elements[0]];
      return this.createSubChain();
    }));
    return this;
  }

  last() {
    this.callStack.push(new Call(function last(this: CallChainImpl) {
      const els = this.elements;
      this.elements = [els[els.length - 1]];
      return this.createSubChain();
    }));
    return this;
  }

  next() {
    this.callStack.push(new Call(function next(this: CallChainImpl) {
      this.elements = this.elements.map(el => elementGuard(el).nextElementSibling!).filter(Boolean);
      return this.createSubChain();
    }));
    return this;
  }

  prev() {
    this.callStack.push(new Call(function prev(this: CallChainImpl) {
      this.elements = this.elements.map(el => elementGuard(el).previousElementSibling!).filter(Boolean);
      return this.createSubChain();
    }));
    return this;
  }

  find(selector: string) {
    this.callStack.push(new Call(function find(this: CallChainImpl, sel: string) {
      this.elements = this.elements.flatMap(el => Array.from(elementGuard(el).querySelectorAll(sel)));
      return this.createSubChain();
    }, selector));
    return this;
  }

  parent() {
    this.callStack.push(new Call(function parent(this: CallChainImpl) {
      this.elements = this.elements.map(el => (el as Element).parentElement!).filter(Boolean);
      return this.createSubChain();
    }));
    return this;
  }

  children() {
    this.callStack.push(new Call(function children(this: CallChainImpl) {
      this.elements = this.elements.flatMap(el => Array.from(elementGuard(el).children));
      return this.createSubChain(true);
    }));
    return this;
  }

  closest(selector: string) {
    this.callStack.push(new Call(function closest(this: CallChainImpl, sel: string) {
      this.elements = this.elements.map(el => elementGuard(el).closest(sel)!).filter(Boolean);
      return this.createSubChain();
    }, selector));
    return this;
  }

  filter(selector: string) {
    this.callStack.push(new Call(function filter(this: CallChainImpl, sel: string) {
      this.elements = this.elements.filter(el => elementGuard(el).matches(sel));
      // ensure the chain is created with the correct number of elements
      return this.createSubChain(this.elements.length > 0);
    }, selector));
    return this;
  }

  // --- Attributes & Properties ---
  attr(name: string, value?: string) {
    if (value !== undefined) {
      this.callStack.push(new Call(function setAttr(this: CallChainImpl, n: string, v: string) {
        this.elements.forEach(el => elementGuard(el).setAttribute(n, v));
        return null;
      }, name, value));
      return this;
    }
    this.callStack.push(new Call(function getAttr(this: CallChainImpl, n: string) {
      return elementGuard(this.getFirstElement()).getAttribute(n);
    }, name));
    return this;
  }

  prop(name: keyof AllHTMLElements, value?: any) {
    if (value !== undefined) {
      this.callStack.push(new Call(function setProp(this: CallChainImpl, n: string, v: any) {
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        this.elements.forEach(el => (elementGuard(el) as any)[n] = v);
        return null;
      }, name, value));
      return this;
    }
    this.callStack.push(new Call(function getProp(this: CallChainImpl, n: string) {
      return (elementGuard(this.getFirstElement()) as any)[n];
    }, name));
    return this;
  }

  // --- CSS & Classes ---
  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === 'string' && value === undefined) {
      this.callStack.push(new Call(function getCss(this: CallChainImpl, p: string) {
        return elementGuard(this.getFirstElement()).style.getPropertyValue(p);
      }, prop));
    } else {
      this.callStack.push(new Call(function setCss(this: CallChainImpl, p: any, v?: string) {
        this.elements.forEach(el => {
          if (typeof p === 'string') elementGuard(el).style.setProperty(p, v!);
          else for (const k in p) elementGuard(el).style.setProperty(k, (p as any)[k]);
        });
        return null;
      }, prop, value));
    }
    return this;
  }

  addClass(name: string | Array<string>) {
    this.callStack.push(new Call(function addClass(this: CallChainImpl, cl: any) {
      const list = Array.isArray(cl) ? cl : [cl];
      this.elements.forEach(el => elementGuard(el).classList.add(...list));
      return null;
    }, name));
    return this;
  }

  removeClass(name: string | Array<string>) {
    this.callStack.push(new Call(function removeClass(this: CallChainImpl, cl: any) {
      const list = Array.isArray(cl) ? cl : [cl];
      this.elements.forEach(el => elementGuard(el).classList.remove(...list));
      return null;
    }, name));
    return this;
  }

  hasClass(name: string) {
    this.callStack.push(new Call(function hasClass(this: CallChainImpl, cl: string) {
      return this.elements.every(el => elementGuard(el).classList.contains(cl));
    }, name));
    return this;
  }

  toggleClass(name: string) {
    this.callStack.push(new Call(function toggleClass(this: CallChainImpl, cl: string) {
      this.elements.forEach(el => elementGuard(el).classList.toggle(cl));
      return null;
    }, name));
    return this;
  }

  animateClass(name: string, duration: number) {
    this.callStack.push(new Call(function animateClass(this: CallChainImpl, cl: string, d: number) {
      this.elements.forEach(el => {
        const e = elementGuard(el);
        e.classList.add(cl);
        setTimeout(() => e.classList.remove(cl), d);
      });
      return null;
    }, name, duration));
    return this;
  }

  // --- Content Mutations ---
  empty() {
    this.callStack.push(new Call(function empty(this: CallChainImpl) {
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      this.elements.forEach(el => elementGuard(el).innerHTML = '');
      return null;
    }));
    return this;
  }

  html(html: string) {
    this.callStack.push(new Call(function html(this: CallChainImpl, str: string) {
      this.elements.forEach(el => updateDom(elementGuard(el), str));
      return null;
    }, html));
    return this;
  }

  jsx(vdom: RenderInput) {
    if (!isJSX(vdom)) {
      console.warn('jsx: expected JSX, got', vdom);
      return this;
    }
    this.callStack.push(new Call(function jsx(this: CallChainImpl, v: RenderInput) {
      this.elements.forEach(el => updateDomWithVdom(elementGuard(el), v, globalThis as Globals));
      return null;
    }, vdom));
    return this;
  }

  text(text: string) {
    this.callStack.push(new Call(function text(this: CallChainImpl, t: string) {
      // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
      this.elements.forEach(el => elementGuard(el).textContent = t);
      return null;
    }, text));
    return this;
  }

  update(input: string | RenderInput) {
    this.callStack.push(new Call(function update(this: CallChainImpl, input: any) {
      if (typeof input === 'string') {
        const hasHtml = /<\/?>[a-z][\s\S]*>/i.test(input);
        if (hasHtml) this.elements.forEach(el => updateDom(elementGuard(el), input));
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        else this.elements.forEach(el => elementGuard(el).textContent = input);
      } else {
        this.elements.forEach(el => updateDomWithVdom(elementGuard(el), input, globalThis as Globals));
      }
      return null;
    }, input));
    return this;
  }

  remove() {
    this.callStack.push(new Call(function remove(this: CallChainImpl) {
      this.elements.forEach(el => elementGuard(el).remove());
      return null;
    }));
    return this;
  }

  replaceWith(content: string | RenderInput | NodeType | Ref<NodeType> | typeof DequeryChain) {
    this.callStack.push(new Call(async function replaceWith(this: CallChainImpl, content: string | RenderInput | NodeType | Ref<NodeType> | typeof DequeryChain) {
      let newElement: NodeType;

      if (typeof content === 'string') {
        const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
        if (hasHtmlTags) {
          newElement = renderHTML(content)[0];
        } else {
          newElement = document.createTextNode(content);
        }
      } else if (isJSX(content)) {
        newElement = renderIsomorphicSync(content as RenderInput, undefined, globalThis as Globals) as NodeType;
      } else if (isRef(content)) {
        await waitForRefWithPolling(content as Ref, this.options.maxWaitMs!);
        newElement = elementGuard(content.current!);
      } else if (content instanceof Node) {
        newElement = content;
      } else if (content instanceof DequeryChain) {
        newElement = content.getFirstElement();
      } else {
        console.warn('replaceWith: unsupported content type', content);
        return null;
      }

      this.elements.forEach(el => {
        el.parentNode?.replaceChild(newElement.cloneNode(true), el);
      });
      return null;
    }, content));
    return this;
  }

  append(content: string | NodeType | typeof DequeryChain) {
    this.callStack.push(new Call(function append(this: CallChainImpl, c: string | NodeType | typeof DequeryChain) {
      this.elements.forEach(el => {
        if (typeof c === 'string') {
          elementGuard(el).innerHTML += c;
        } else if (c instanceof DequeryChain) {
          c.elements.forEach(childEl => {
            el.appendChild(childEl.cloneNode(true));
          });
        } else {
          el.appendChild((c as Element).cloneNode(true));
        }
      });
      return null;
    }, content));
    return this;
  }

  appendTo(target: NodeType | Ref<NodeType> | string | typeof DequeryChain) {
    this.callStack.push(new Call(async function appendTo(this: CallChainImpl, target: NodeType | Ref<NodeType> | string) {
      let targetElement: NodeType;

      if (isRef(target)) {
        await waitForRefWithPolling(target as Ref, this.options.maxWaitMs!);
        targetElement = elementGuard(target.current!);
      } else if (typeof target === 'string') {
        await waitForSelectorWithPolling(target, this.options.maxWaitMs!);
        targetElement = elementGuard(document.querySelector(target) as NodeType);
      } else if (target instanceof Node) {
        targetElement = elementGuard(target);
      } else if (target instanceof DequeryChain) {
        targetElement = elementGuard(target.getFirstElement());
      } else {
        console.warn('appendTo: expected selector, ref or node, got', target);
        return null;
      }

      this.elements.forEach(el => {
        targetElement.appendChild(el.cloneNode(true));
      });
      return null;
    }, target));
    return this;
  }

  // --- Events & Interaction ---
  on(event: string, handler: EventListener) {
    this.callStack.push(new Call(function on(this: CallChainImpl, ev: string, h: EventListener) {
      this.elements.forEach(el => elementGuard(el).addEventListener(ev, h));
      return null;
    }, event, handler));
    return this;
  }

  off(event: string, handler: EventListener) {
    this.callStack.push(new Call(function off(this: CallChainImpl, ev: string, h: EventListener) {
      this.elements.forEach(el => elementGuard(el).removeEventListener(ev, h));
      return null;
    }, event, handler));
    return this;
  }

  trigger(eventType: string) {
    this.callStack.push(new Call(function trigger(this: CallChainImpl, ev: string) {
      this.elements.forEach(el => elementGuard(el).dispatchEvent(new Event(ev, { bubbles: true, cancelable: true })));
      return null;
    }, eventType));
    return this;
  }

  // --- Data Extraction ---
  val(val?: string | boolean) {
    if (val !== undefined) {
      this.callStack.push(new Call(function setVal(this: CallChainImpl, v: any) {
        this.elements.forEach(el => {
          if (el instanceof HTMLInputElement) el.value = String(v);
        });
        return null;
      }, val));
    } else {
      this.callStack.push(new Call(function getVal(this: CallChainImpl) {
        const el = elementGuard<HTMLInputElement>(this.getFirstElement());
        return el.value;
      }));
    }
    return this;
  }

  map(cb: (el: NodeType, idx: number) => any) {
    this.callStack.push(new Call(function map(this: CallChainImpl, fn: any) {
      return this.elements.map(fn);
    }, cb));
    return this;
  }

  toArray() {
    this.callStack.push(new Call(function toArray(this: CallChainImpl) {
      return [...this.elements];
    }));
    return this;
  }

  data(name: string, val?: string) {
    if (val !== undefined) {
      this.callStack.push(new Call(function setData(this: CallChainImpl, n: string, v: string) {
        // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
        this.elements.forEach(el => elementGuard(el).dataset[n] = v);
        return null;
      }, name, val));
    } else {
      this.callStack.push(new Call(function getData(this: CallChainImpl, n: string) {
        return elementGuard(this.getFirstElement()).dataset[n];
      }, name));
    }
    return this;
  }

  form(formData?: Record<string, string | boolean>) {
    if (formData) {
      this.callStack.push(new Call(function setForm(this: CallChainImpl, formData: Record<string, string | boolean>) {
        this.elements.forEach(el => {
          if (el instanceof Element) {
            const inputElements = el.querySelectorAll('input, select, textarea');
            inputElements.forEach((input) => {
              const key = (input as HTMLInputElement).name || input.id;
              if (formData[key] !== undefined) {
                if (input instanceof HTMLInputElement && input.type === 'checkbox') {
                  input.checked = Boolean(formData[key]);
                } else {
                  (input as HTMLInputElement).value = String(formData[key]);
                }
              }
            });
          }
        });
        return null;
      }, formData));
    } else {
      this.callStack.push(new Call(function getForm(this: CallChainImpl) {
        const formFields: Record<string, string | boolean> = {};
        this.elements.forEach(el => {
          if (el instanceof Element) {
            const inputElements = el.querySelectorAll('input, select, textarea');
            inputElements.forEach((input) => {
              const key = (input as HTMLInputElement).name || input.id;
              if (input instanceof HTMLInputElement && input.type === 'checkbox') {
                formFields[key] = input.checked;
              } else {
                formFields[key] = (input as HTMLInputElement).value;
              }
            });
          }
        });
        return formFields;
      }));
    }
    return this;
  }

  // --- Terminal then() ---

  // biome-ignore lint/suspicious/noThenProperty: We're implementing a custom promise chain here
  then(resolve: (value: any) => void, reject: (reason?: any) => void) {
    if (this.stoppedWithError) return;
    runWithTimeGuard(this.options.timeout!, async () => {
      const results: any[] = [];
      for (const call of this.callStack) {
        if (this.stoppedWithError) break;
        try {
          results.push(await call.fn.apply(this, call.args));
          await sleep(this.options.delay!);
        } catch (err) {
          this.stoppedWithError = true;
          break;
        }
      }
      this.chainStack.push([...results]);
      this.lastResult = results[results.length - 1];
      this.callStack = [];
      this.resetElements();
      this.isResolved = true;
      return this.lastResult;
    }, [], (ms, call) => {
      this.stoppedWithError = true;
      this.options.onTimeGuardError!(ms, call);
    }).then(resolve).catch(reject);
  }
}

// --- Proxy Wrapper ---
export const DequeryChain = new Proxy(CallChainImpl, {
  construct(target, args) {
    const inst = new target(...args);
    return new Proxy(inst, {
      get(obj, prop) {
        if (prop === 'then' && inst.isResolved) {
          return Promise.resolve(inst.lastResult);
        }
        inst.isResolved = false;
        return (obj as any)[prop];
      }
    });
  }
});

// --- Entry Points ---
export function dequery(selectorRefOrEl: string | NodeType | Ref<NodeType, any> | RenderInput, options: DequeryOptions | ElementCreationOptions = adefaultConfig) {
  let promise = new DequeryChain({ ...options, initialEl: undefined }).__init(selectorRefOrEl, options);

  ; (async () => { // auto-start
    promise = await promise;
  })();
  return promise;
}
export const $ = dequery;
export const D = dequery;

export type Dequery = CallChainImpl;

export function isDequery(obj: unknown): obj is Dequery {
  return typeof obj === 'object' && obj !== null && 'isResolved' in obj && 'lastResult' in obj;
}

// --- Helpers ---
export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1
): Promise<T> {
  const start = Date.now();
  return new Promise<T>((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        const result = check();
        if (result != null) {
          clearInterval(timer);
          resolve(result);
        } else if (Date.now() - start >= timeout) {
          clearInterval(timer);
          reject(new Error(`Timeout after ${timeout}ms`));
        }
      }
      catch (err) {
        clearInterval(timer);
        reject(err);
        throw err;
      }
    }, interval);
  });
}

export async function waitForSelectorWithPolling(
  sel: string,
  timeout: number,
  interval?: number
): Promise<Element> {
  return waitForWithPolling(() => document.querySelector(sel), timeout, interval);
}

export async function waitForRefWithPolling<T>(
  ref: { current: T | null },
  timeout: number,
  interval?: number
): Promise<T> {
  return waitForWithPolling(() => ref.current, timeout, interval);
}

export function renderHTML(html: string, type: DOMParserSupportedType = 'text/html') {
  const newDom = (new DOMParser()).parseFromString(html, type);
  return Array.from(newDom.body.childNodes);
}

export function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
export function runWithTimeGuard(timeout: number, fn: Function, args: any[], onError: (ms: number, call: Call) => void): Promise<any> {
  return fn(...args);
  // TODO: implement the actual time guard!
}
