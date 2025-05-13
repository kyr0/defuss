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
  [keyOrPath: string]: string;
}

export interface Dimensions {
  width: number;
  height: number;
  outerWidth?: number;
  outerHeight?: number;
}

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

export interface DequeryOptions<NT = ChainMethodReturnType> {
  timeout?: number;
  autoStart?: boolean;
  autoStartDelay?: number;
  resultStack?: NT[];
  state?: any;
  verbose?: boolean;
  onTimeGuardError?: (ms: number, call: Call<NT>) => void;
}

function getDefaultConfig<NT>(): DequeryOptions<NT> {
  return {
    timeout: 500 /** ms */,
    // even long sync chains would execute in < 0.1ms
    // so after 1ms, we can assume the "await" in front is
    // missing (intentionally non-blocking in sync code)
    autoStartDelay: 1 /** ms */,
    autoStart: true,
    resultStack: [],
    verbose: false,
    onTimeGuardError: () => {},
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
    this.options = { ...getDefaultConfig(), ...options } as DequeryOptions<NT>;
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
    this.chainStartTime = performance.now(); // mark start of sync chain
    this.chainAsyncStartTime = 0; // mark start of async chain
    this.chainAsyncFinishTime = 0; // mark end of async chain
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
    this.callStack.push(
      new Call<NT>("getFirstElement", async () => {
        return this[0];
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<NT> | NT; // returns the first element synchronously
  }

  // async, wrapped/chainable API methods

  debug(cb: (chain: CallChainImpl<NT>) => void) {
    this.callStack.push(
      new Call<NT>("debug", async () => {
        cb(this);
        return this.__elements as NT; // pipe
      }),
    );
    return subChainForNextAwait(this);
  }

  ref(ref: Ref<NodeType>) {
    this.callStack.push(
      new Call<NT>("ref", async () => {
        await waitForRef(ref, this.options.timeout!);
        if (ref.current) {
          return [elementGuard(ref.current)] as NT;
        } else {
          throw new Error("Ref is null or undefined");
        }
      }),
    );
    return subChainForNextAwait(this);
  }

  query(selector: string) {
    this.callStack.push(
      new Call<NT>("query", async () => {
        return Array.from(
          await waitForDOM(
            () => Array.from(document.querySelectorAll(selector)),
            this.options.timeout!,
          ),
        ) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  next() {
    this.callStack.push(
      new Call<NT>("next", async () => {
        return this.__elements
          .map((el) => (el instanceof Element ? el.nextElementSibling : null))
          .filter((el): el is Element => el instanceof Element) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  prev() {
    this.callStack.push(
      new Call<NT>("prev", async () => {
        return this.__elements
          .map((el) =>
            el instanceof Element ? el.previousElementSibling : null,
          )
          .filter((el): el is Element => el instanceof Element) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  find(selector: string) {
    this.callStack.push(
      new Call<NT>("find", async () => {
        //console.log("find", selector);
        //console.log("elements", this.__elements.length);

        // Use Promise.all to wait for all elements to be found
        const results = await Promise.all(
          this.__elements.map(async (el) => {
            return await waitForDOM(
              () => Array.from(elementGuard(el).querySelectorAll(selector)),
              this.options.timeout!,
            );
          }),
        );

        // Flatten the results
        const res = results.flat();
        //console.log("res", res.length);
        return res as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  parent() {
    this.callStack.push(
      new Call<NT>("parent", async () => {
        return this.__elements
          .map((el) => (el as Element).parentElement)
          .filter((el): el is HTMLElement => el !== null) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  children() {
    this.callStack.push(
      new Call<NT>("children", async () => {
        return this.__elements.flatMap((el) =>
          Array.from(elementGuard(el).children),
        ) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  closest(selector: string) {
    this.callStack.push(
      new Call<NT>("closest", async () => {
        return this.__elements
          .map((el) => (el as Element).closest(selector))
          .filter((el): el is HTMLElement => el !== null) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  first() {
    this.callStack.push(
      new Call<NT>("first", async () => {
        return this.__elements.slice(0, 1) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  last() {
    this.callStack.push(
      new Call<NT>("last", async () => {
        return this.__elements.slice(-1) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value?: string) {
    if (value !== undefined) {
      // Set attribute
      this.callStack.push(
        new Call<NT>("attr", async () => {
          this.__elements.forEach((el) =>
            elementGuard(el).setAttribute(name, value),
          );
          return this.__elements as NT;
        }),
      );
      return subChainForNextAwait(this);
    } else {
      // Get attribute
      this.callStack.push(
        new Call<NT>("attr", async () => {
          return elementGuard(this.__elements[0]).getAttribute(name) as NT;
        }),
      );
      return subChainForNextAwait(this);
    }
  }

  prop<K extends keyof AllHTMLElements>(name: K, value?: any) {
    if (value !== undefined) {
      // Set property
      this.callStack.push(
        new Call<NT>("prop", async () => {
          this.__elements.forEach((el) => {
            (elementGuard(el) as any)[name] = value;
          });
          return this.__elements as NT;
        }),
      );
      return subChainForNextAwait(this);
    } else {
      // Get property
      this.callStack.push(
        new Call<NT>("prop", async () => {
          return (elementGuard(this.__elements[0]) as any)[name] as NT;
        }),
      );
      return subChainForNextAwait(this);
    }
  }

  // --- CSS & Class Methods ---

  css(prop: string | CSSProperties, value?: string) {
    if (typeof prop === "string" && value === undefined) {
      // Get CSS property
      this.callStack.push(
        new Call<NT>(
          "css",
          async () =>
            elementGuard(this.__elements[0]).style.getPropertyValue(prop) as NT,
        ),
      );
    } else {
      // Set CSS property/properties
      this.callStack.push(
        new Call<NT>("css", async () => {
          this.__elements.forEach((el) => {
            const elementStyle = elementGuard<HTMLElement>(el).style;
            if (typeof prop === "string") {
              elementStyle.setProperty(prop, value!);
            } else {
              // For object properties, assign directly to handle camelCase
              for (const k in prop) {
                if (Object.prototype.hasOwnProperty.call(prop, k)) {
                  // @ts-ignore - Allow indexing style object with string key
                  elementStyle[k] = (prop as any)[k];
                }
              }
            }
          });
          return this.__elements as NT;
        }),
      );
    }
    return subChainForNextAwait(this) as PromiseLike<CSSStyleDeclaration>;
  }

  addClass(name: string | Array<string>) {
    this.callStack.push(
      new Call<NT>("addClass", async () => {
        const list = Array.isArray(name) ? name : [name];
        this.__elements.forEach((el) =>
          elementGuard(el).classList.add(...list),
        );
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  removeClass(name: string | Array<string>) {
    this.callStack.push(
      new Call<NT>("removeClass", async () => {
        const list = Array.isArray(name) ? name : [name];
        this.__elements.forEach((el) =>
          elementGuard(el).classList.remove(...list),
        );
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  hasClass(name: string) {
    this.callStack.push(
      new Call<NT>("hasClass", async () => {
        return this.__elements.every((el) =>
          elementGuard(el).classList.contains(name),
        ) as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<boolean>;
  }

  toggleClass(name: string) {
    this.callStack.push(
      new Call<NT>("toggleClass", async () => {
        this.__elements.forEach((el) =>
          elementGuard(el).classList.toggle(name),
        );
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  animateClass(name: string, duration: number) {
    this.callStack.push(
      new Call<NT>("animateClass", async () => {
        this.__elements.forEach((el) => {
          const e = elementGuard(el);
          e.classList.add(name);
          setTimeout(() => e.classList.remove(name), duration);
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Content Manipulation Methods ---

  empty() {
    this.callStack.push(
      new Call<NT>("empty", async () => {
        this.__elements.forEach((el) => {
          const element = elementGuard(el);
          while (element.firstChild) {
            element.firstChild.remove();
          }
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  //
  html(html?: string) {
    if (typeof html === "undefined") {
      // Get the HTML contents of the first element in the set of matched elements
      this.callStack.push(
        new Call<NT>("html", async () => {
          return (this.__elements[0] as HTMLElement).innerHTML as NT;
        }),
      );
    } else {
      // set the HTML contents of every matched element.
      this.callStack.push(
        new Call<NT>("html", async () => {
          this.__elements.forEach((el) => {
            elementGuard(el).innerHTML = html;
          });
          return this.__elements as NT;
        }),
      );
    }
    return subChainForNextAwait(this);
  }

  jsx(vdom: RenderInput) {
    if (!isJSX(vdom)) {
      console.warn("jsx: expected JSX, got", vdom);
      return subChainForNextAwait(this);
    }

    this.callStack.push(
      new Call<NT>("jsx", async () => {
        this.__elements.forEach((el) =>
          updateDomWithVdom(elementGuard(el), vdom, globalThis as Globals),
        );
        return this.__elements as NT;
      }),
    );

    return subChainForNextAwait(this);
  }

  text(text: string) {
    this.callStack.push(
      new Call<NT>("text", async () => {
        this.__elements.forEach((el) => {
          elementGuard(el).textContent = text;
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  remove() {
    this.callStack.push(
      new Call<NT>("remove", async () => {
        const removedElements = [...this.__elements];
        this.__elements.forEach((el) => elementGuard(el).remove());
        return removedElements as NT;
      }),
    );
    return subChainForNextAwait(this);
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
    this.callStack.push(
      new Call<NT>("replaceWith", async () => {
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
          await waitForRef(content as Ref<NodeType>, this.options.timeout!);
          newElement = elementGuard(content.current!);
        } else if ((content as Node).nodeType) {
          newElement = content as NodeType;
        } else if (isDequery(content)) {
          const firstElement = await content.getFirstElement();
          newElement = elementGuard(firstElement as NodeType);
        } else {
          console.warn("replaceWith: unsupported content type", content);
          return this.__elements as NT;
        }

        this.__elements.forEach((el) => {
          if (!el || !newElement) return;
          if (el.parentNode) {
            // Create a fresh clone for each replacement to avoid side effects
            const clone = newElement.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
          }
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
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
    this.callStack.push(
      new Call<NT>("append", async () => {
        // Don't do anything if content is null or undefined
        if (content == null) {
          return this.__elements as NT;
        }

        if (typeof content === "string") {
          const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(content);
          if (hasHtmlTags) {
            const elements = renderHTML(content);
            this.__elements.forEach((el) => {
              elements.forEach((childEl) =>
                elementGuard(el).appendChild(childEl.cloneNode(true)),
              );
            });
          } else {
            this.__elements.forEach((el) => {
              elementGuard(el).appendChild(document.createTextNode(content));
            });
          }
        } else if (isJSX(content)) {
          const element = renderIsomorphicSync(
            content as RenderInput,
            undefined,
            globalThis as Globals,
          ) as NodeType;
          this.__elements.forEach((el) => {
            if (!element) return;
            elementGuard(el).appendChild(element.cloneNode(true));
          });
        } else if (isRef(content)) {
          await waitForRef(content as Ref<NodeType>, this.options.timeout!);
          const refElement = elementGuard(content.current!);
          this.__elements.forEach((el) => {
            elementGuard(el).appendChild(refElement.cloneNode(true));
          });
        } else if ((content as Node).nodeType) {
          this.__elements.forEach((el) => {
            elementGuard(el).appendChild((content as Node).cloneNode(true));
          });
        } else if (isDequery(content)) {
          this.__elements.forEach((el) => {
            content.__elements.forEach((childEl) => {
              if ((childEl as Node).nodeType && (el as Node).nodeType) {
                elementGuard(el).appendChild((childEl as Node).cloneNode(true));
              }
            });
          });
        } else {
          console.warn("append: unsupported content type", content);
        }

        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  appendTo<T = NT>(
    target:
      | string
      | NodeType
      | Ref<NodeType>
      | CallChainImpl<T>
      | CallChainImplThenable<T>,
  ) {
    this.callStack.push(
      new Call<NT>("appendTo", async () => {
        let targetElements: NodeType[] = [];

        if (isRef(target)) {
          await waitForRef(target as Ref<NodeType>, this.options.timeout!);
          targetElements = [elementGuard(target.current!)];
        } else if (typeof target === "string") {
          const result = await waitForDOM(() => {
            const el = document.querySelector(target);
            if (el) {
              return [el];
            } else {
              return [];
            }
          }, this.options.timeout!);
          const el = result[0];
          if (el) targetElements = [elementGuard(el as NodeType)];
        } else if ((target as Node).nodeType) {
          targetElements = [elementGuard(target as NodeType)];
        } else if (isDequery(target)) {
          const elements = (target as CallChainImpl<T>).__elements;
          targetElements = elements
            .filter((el) => (el as Node).nodeType !== undefined)
            .map((el) => elementGuard(el as NodeType));
        } else {
          console.warn("appendTo: expected selector, ref or node, got", target);
          return this.__elements as NT;
        }

        if (targetElements.length === 0) {
          console.warn("appendTo: no target elements found");
          return this.__elements as NT;
        }

        targetElements.forEach((targetEl) => {
          this.__elements.forEach((el) => {
            if (!targetEl || !el) return;
            targetEl.appendChild(el.cloneNode(true));
          });
        });

        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  update(input: string | RenderInput) {
    this.callStack.push(
      new Call<NT>("update", async () => {
        if (typeof input === "string") {
          const hasHtmlTags = /<\/?[a-z][\s\S]*>/i.test(input);
          if (hasHtmlTags) {
            this.__elements.forEach((el) => {
              updateDom(elementGuard(el), input);
            });
          } else {
            this.__elements.forEach((el) => {
              elementGuard(el).textContent = input;
            });
          }
        } else if (isJSX(input)) {
          this.__elements.forEach((el) => {
            updateDomWithVdom(elementGuard(el), input, globalThis as Globals);
          });
        } else {
          console.warn("update: unsupported content type", input);
        }
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Event Methods ---

  on(event: string, handler: EventListener) {
    this.callStack.push(
      new Call<NT>("on", async () => {
        this.__elements.forEach((el) => {
          const elem = elementGuard(el);

          // Store event bindings for potential cleanup
          if (!elem._dequeryEvents) {
            elem._dequeryEvents = new Map();
          }

          if (!elem._dequeryEvents.has(event)) {
            elem._dequeryEvents.set(event, new Set());
          }

          elem._dequeryEvents.get(event)!.add(handler);
          elem.addEventListener(event, handler);
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  off(event: string, handler?: EventListener) {
    this.callStack.push(
      new Call<NT>("off", async () => {
        this.__elements.forEach((el) => {
          const elem = elementGuard(el);

          if (handler) {
            // Remove specific handler
            elem.removeEventListener(event, handler);

            // Update tracking
            if (elem._dequeryEvents?.has(event)) {
              elem._dequeryEvents.get(event)!.delete(handler);
              if (elem._dequeryEvents.get(event)!.size === 0) {
                elem._dequeryEvents.delete(event);
              }
            }
          } else {
            // Remove all handlers for this event type
            if (elem._dequeryEvents?.has(event)) {
              elem._dequeryEvents.get(event)!.forEach((h: EventListener) => {
                elem.removeEventListener(event, h);
              });
              elem._dequeryEvents.delete(event);
            }
          }
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  clearEvents() {
    this.callStack.push(
      new Call<NT>("clearEvents", async () => {
        this.__elements.forEach((el) => {
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
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  trigger(eventType: string) {
    this.callStack.push(
      new Call<NT>("trigger", async () => {
        this.__elements.forEach((el) =>
          elementGuard(el).dispatchEvent(
            new Event(eventType, { bubbles: true, cancelable: true }),
          ),
        );
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Position Methods ---

  position() {
    this.callStack.push(
      new Call<NT>("position", async () => {
        const el = elementGuard<HTMLElement>(this.__elements[0]);
        return {
          top: el.offsetTop,
          left: el.offsetLeft,
        } as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  offset() {
    this.callStack.push(
      new Call<NT>("offset", async () => {
        const el = elementGuard<HTMLElement>(this.__elements[0]);
        const rect = el.getBoundingClientRect();
        return {
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
        } as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<DOMRect>;
  }

  // --- Data Methods ---

  data(name: string, value?: string) {
    if (value !== undefined) {
      // Set data attribute
      this.callStack.push(
        new Call<NT>("data", async () => {
          this.__elements.forEach((el) => {
            (elementGuard(el) as HTMLElement).dataset[name] = value;
          });
          return this.__elements as NT;
        }),
      );
      return subChainForNextAwait(this) as PromiseLike<NT>;
    } else {
      // Get data attribute
      this.callStack.push(
        new Call<NT>("data", async () => {
          if (this.__elements.length === 0) return [undefined] as NT;
          return (elementGuard(this.__elements[0]) as HTMLElement).dataset[
            name
          ] as NT;
        }),
      );
      return subChainForNextAwait(this) as PromiseLike<string | undefined>;
    }
  }

  val(val?: string | boolean) {
    if (val !== undefined) {
      this.callStack.push(
        new Call<NT>("val", async () => {
          this.__elements.forEach((el) => {
            const input = el as HTMLInputElement;
            if (input.type === "checkbox" && typeof val === "boolean") {
              input.checked = val;
            } else {
              input.value = String(val);
            }
          });
          return this.__elements as NT;
        }),
      );
    } else {
      this.callStack.push(
        new Call<NT>("val", async () => {
          const el = elementGuard<HTMLInputElement>(this.__elements[0]);
          if (el.type === "checkbox") {
            return el.checked as NT;
          }
          return el.value as NT;
        }),
      );
    }
    return subChainForNextAwait(this) as PromiseLike<string | boolean>;
  }

  form<T = FormKeyValues>(formData?: Record<string, string | boolean>) {
    if (formData) {
      this.callStack.push(
        new Call<NT>("form", async () => {
          this.__elements.forEach((el) => {
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
          return this.__elements as NT;
        }),
      );
      return subChainForNextAwait(this) as PromiseLike<T>;
    } else {
      this.callStack.push(
        new Call<NT>("form", async () => {
          const formFields: Record<string, string | boolean> = {};
          this.__elements.forEach((el) => {
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
          return formFields as NT;
        }),
      );
      return subChainForNextAwait(this) as PromiseLike<T>;
    }
  }

  // --- Dimension Methods ---

  dimension(
    includeMarginOrPadding?: boolean,
    includePaddingIfMarginTrue?: boolean,
  ) {
    this.callStack.push(
      new Call<NT>("dimension", async () => {
        if (this.__elements.length === 0) {
          return { width: 0, height: 0 } as NT;
        }

        const el = elementGuard<HTMLElement>(this.__elements[0]);
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
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<Dimensions>;
  }

  // --- Visibility Methods ---

  isVisible() {
    this.callStack.push(
      new Call<NT>("isVisible", async () => {
        if (this.__elements.length === 0) return false as NT;

        const el = elementGuard<HTMLElement>(this.__elements[0]);
        const style = window.getComputedStyle(el);

        // Check if element has dimensions
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return false as NT;

        // Check if element is hidden via CSS
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          Number.parseFloat(style.opacity) === 0
        )
          return false as NT;

        // Check if element is detached from DOM
        if (!document.body.contains(el)) return false as NT;

        // Check if any parent is hidden
        let parent = el.parentElement;
        while (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.display === "none" ||
            parentStyle.visibility === "hidden" ||
            parentStyle.opacity === "0" ||
            Number.parseFloat(parentStyle.opacity) === 0
          ) {
            return false as NT;
          }
          parent = parent.parentElement;
        }

        return true as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<boolean>;
  }

  isHidden() {
    this.callStack.push(
      new Call<NT>("isHidden", async () => {
        if (this.__elements.length === 0) return true as NT;

        const el = elementGuard<HTMLElement>(this.__elements[0]);
        const style = window.getComputedStyle(el);

        // Check if element has dimensions
        if (el.offsetWidth === 0 || el.offsetHeight === 0) return true as NT;

        // Check if element is hidden via CSS
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0" ||
          Number.parseFloat(style.opacity) === 0
        )
          return true as NT;

        // Check if element is detached from DOM
        if (!document.body.contains(el)) return true as NT;

        // Check if any parent is hidden
        let parent = el.parentElement;
        while (parent) {
          const parentStyle = window.getComputedStyle(parent);
          if (
            parentStyle.display === "none" ||
            parentStyle.visibility === "hidden" ||
            parentStyle.opacity === "0" ||
            Number.parseFloat(parentStyle.opacity) === 0
          ) {
            return true as NT;
          }
          parent = parent.parentElement;
        }

        return false as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<boolean>;
  }

  // --- Scrolling Methods ---

  scrollTo(xOrOptions: number | ScrollToOptions, y?: number) {
    this.callStack.push(
      new Call<NT>("scrollTo", async () => {
        this.__elements.forEach((el) => {
          const element = elementGuard<HTMLElement>(el);
          if (typeof xOrOptions === "object") {
            element.scrollTo(xOrOptions);
          } else if (y !== undefined) {
            element.scrollTo(xOrOptions, y);
          } else {
            element.scrollTo(xOrOptions, 0);
          }
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  scrollBy(xOrOptions: number | ScrollToOptions, y?: number) {
    this.callStack.push(
      new Call<NT>("scrollBy", async () => {
        this.__elements.forEach((el) => {
          const element = elementGuard<HTMLElement>(el);
          if (typeof xOrOptions === "object") {
            element.scrollBy(xOrOptions);
          } else if (y !== undefined) {
            element.scrollBy(xOrOptions, y);
          } else {
            element.scrollBy(xOrOptions, 0);
          }
        });
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
    this.callStack.push(
      new Call<NT>("scrollIntoView", async () => {
        if (this.__elements.length === 0) return this.__elements as NT;
        const el = elementGuard<HTMLElement>(this.__elements[0]);
        el.scrollIntoView(options);
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Transformation Methods ---

  map<T>(cb: (el: NT, idx: number) => T) {
    this.callStack.push(
      new Call<NT>("map", async () => {
        return (this.__elements as NT[]).map(cb) as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<NT[]>;
  }

  toArray() {
    this.callStack.push(
      new Call<NT>("toArray", async () => {
        return [...(this.__elements as NT[])] as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<NT[]>;
  }

  filter(selector: string) {
    this.callStack.push(
      new Call<NT>("filter", async () => {
        return this.__elements.filter(
          (el) => el instanceof Element && el.matches(selector),
        ) as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // TODO:
  // - serialize (to URL string, JSON, etc.)
  // - deserialize (from URL string, JSON, etc.)
  // - dispose() (cleanup, remove event listeners - therefore keep track of on() refs, etc.)
  // Re-use the common/* shared code!
  // Remove duplicated code in the chain methods
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
    this.chainAsyncStartTime = performance.now();

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
      this.chainAsyncFinishTime = performance.now() - this.chainAsyncStartTime;

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
          performance.now() - this.chainAsyncStartTime;

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
  options: DequeryOptions<NT> | ElementCreationOptions = getDefaultConfig(),
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
      const elements = renderHTML(selectorRefOrEl);
      const renderRootEl = elements[0];
      const { text, html, ...attributes } = options as ElementCreationOptions;

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
      undefined,
      globalThis as Globals,
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

export async function waitForWithPolling<T>(
  check: () => T | null | undefined,
  timeout: number,
  interval = 1,
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
      } catch (err) {
        clearInterval(timer);
        reject(err);
        throw err;
      }
    }, interval);
  });
}

export async function waitForDOM(
  check: () => Array<NodeType>,
  timeout: number,
): Promise<Array<NodeType>> {
  return new Promise<Array<NodeType>>((resolve, reject) => {
    const initialResult = check();
    //console.log("waitFor initialResult", initialResult);
    if (initialResult.length) return resolve(initialResult);

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const result = check();
      //console.log("waitFor result", initialResult);
      if (result.length) {
        clearTimeout(timeoutId);
        observer.disconnect();
        resolve(result);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
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

export function runWithTimeGuard<NT>(
  timeout: number,
  fn: Function,
  args: any[],
  onError: (ms: number, call: Call<NT>) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const fakeCall = new Call<NT>("timeout", async () => [] as NT);
      onError(timeout, fakeCall);
      reject(new Error(`Timeout after ${timeout}ms`));
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
