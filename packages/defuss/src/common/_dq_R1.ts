import {
  isJSX,
  isRef,
  renderIsomorphicSync,
  type Globals,
  type Ref,
  type RenderInput,
  type AllHTMLElements,
  type CSSProperties,
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
  maxWaitMs?: number;
  timeout?: number;
  delay?: number;
  resultStack?: NT[];
  state?: any;
  verbose?: boolean;
  onTimeGuardError?: (ms: number, call: Call<NT>) => void;
}

function getDefaultConfig<NT>(): DequeryOptions<NT> {
  return {
    maxWaitMs: 1000,
    timeout: 5000,
    delay: 0,
    resultStack: [],
    verbose: false,
    onTimeGuardError: () => {},
  };
}

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase &
  JSX.HTMLAttributesLowerCase & { html?: string; text?: string };

type ChainMethodReturnType = Array<NodeType> | NodeType | string | boolean;

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

const SyncCallNames = ["getFirstElement"];

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
    return subChainForNextAwait(this) as PromiseLike<NT>;
  }

  // async, wrapped/chainable API methods

  debug(cb: (currentResult: ChainMethodReturnType) => void) {
    this.callStack.push(
      new Call<NT>("debug", async () => {
        cb(this.__elements);
        return this.__elements as unknown as NT; // pipe
      }),
    );
    return subChainForNextAwait(this);
  }

  ref(ref: Ref<NodeType>) {
    this.callStack.push(
      new Call<NT>("ref", async () => {
        await waitForRef(ref, this.options.maxWaitMs!);
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
        await waitFor(
          () => document.querySelectorAll(selector),
          this.options.maxWaitMs!,
        );
        return Array.from(document.querySelectorAll(selector)) as NT;
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
        console.log("find", selector);
        console.log("elements", this.__elements.length);

        // Use Promise.all to wait for all elements to be found
        const results = await Promise.all(
          this.__elements.map(async (el) => {
            // Create a scoped waitForSelectorAll that works within this element
            const elementResults = await waitFor(
              () => elementGuard(el).querySelectorAll(selector),
              this.options.maxWaitMs!,
            );
            return Array.from(elementResults);
          }),
        );

        // Flatten the results
        const res = results.flat();
        console.log("res", res.length);
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

  all() {
    this.callStack.push(
      new Call<NT>("all", async () => {
        return this.__elements as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Attribute & Property Methods ---

  attr(name: string, value?: string) {
    if (value !== undefined) {
      // Set attribute
      this.callStack.push(
        new Call<NT>("setAttr", async () => {
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
        new Call<NT>("getAttr", async () => {
          return [
            elementGuard(this.__elements[0]).getAttribute(name) as any,
          ] as NT;
        }),
      );
      return subChainForNextAwait(this);
    }
  }

  prop<K extends keyof AllHTMLElements>(name: K, value?: AllHTMLElements[K]) {
    if (value !== undefined) {
      // Set property
      this.callStack.push(
        new Call<NT>("setProp", async () => {
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
        new Call<NT>("getProp", async () => {
          return [(elementGuard(this.__elements[0]) as any)[name]] as NT;
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
          "getCss",
          async () =>
            elementGuard(this.__elements[0]).style.getPropertyValue(prop) as NT,
        ),
      );
    } else {
      // Set CSS property/properties
      this.callStack.push(
        new Call<NT>("setCss", async () => {
          this.__elements.forEach((el) => {
            const elementStyle = elementGuard<HTMLElement>(el).style;
            if (typeof prop === "string") {
              elementStyle.setProperty(prop, value!);
            } else {
              Object.entries(prop).forEach(([key, val]) => {
                (elementStyle as any)[key] = val;
              });
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
        return [
          this.__elements.every((el) =>
            elementGuard(el).classList.contains(name),
          ),
        ] as NT;
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

  html(html: string) {
    this.callStack.push(
      new Call<NT>("html", async () => {
        this.__elements.forEach((el) => {
          elementGuard(el).innerHTML = html;
        });
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
        return [
          {
            top: el.offsetTop,
            left: el.offsetLeft,
          },
        ] as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  offset() {
    this.callStack.push(
      new Call<NT>("offset", async () => {
        const el = elementGuard<HTMLElement>(this.__elements[0]);
        const rect = el.getBoundingClientRect();
        return [
          {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
          },
        ] as NT;
      }),
    );
    return subChainForNextAwait(this);
  }

  // --- Data Extraction Methods ---

  val(val?: string | boolean) {
    if (val !== undefined) {
      this.callStack.push(
        new Call<NT>("setVal", async () => {
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
        new Call<NT>("getVal", async () => {
          const el = elementGuard<HTMLInputElement>(this.__elements[0]);
          if (el.type === "checkbox") {
            return [el.checked] as NT;
          }
          return [el.value] as NT;
        }),
      );
    }
    return subChainForNextAwait(this) as PromiseLike<string | boolean>;
  }

  map<T>(cb: (el: NodeType, idx: number) => T) {
    this.callStack.push(
      new Call<NT>("map", async () => {
        return this.__elements.map(cb) as NT;
      }),
    );
    return subChainForNextAwait(this) as PromiseLike<T[]>;
  }

  toArray() {
    this.callStack.push(
      new Call<NT>("toArray", async () => {
        return [...this.__elements] as NT;
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
    return subChainForNextAwait(this) as PromiseLike<NT[]>;
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
    if (this.stoppedWithError) {
      return Promise.reject(this.stoppedWithError).then(
        onfulfilled as any,
        onrejected,
      );
    }

    console.log(
      "then",
      this.isResolved,
      this.stackPointer,
      this.stackPointer >= this.callStack.length,
      this.callStack,
    );

    if (this.isResolved && this.stackPointer >= this.callStack.length) {
      this.lastResolvedStackPointer = this.stackPointer;
      const lastCallName = this.callStack[this.callStack.length - 1]?.name;

      let result;
      if (SyncCallNames.includes(lastCallName)) {
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
      return Promise.resolve(result).then(onfulfilled as any, onrejected);
    }

    return runWithTimeGuard<NT>(
      this.options.timeout!,
      async () => {
        const startTime = Date.now();
        let call: Call<NT>;
        while (this.stackPointer < this.callStack.length) {
          call = this.callStack[this.stackPointer];
          if (Date.now() - startTime > this.options.timeout!) {
            throw new Error(`Timeout after ${this.options.timeout}ms`);
          }

          try {
            console.log("calling", call.name);
            this.resultStack.push((await call.fn.apply(this)) as NT[]);
            this.lastResult = this.resultStack[this.resultStack.length - 1];

            if (Array.isArray(this.lastResult)) {
              // allow for array-like access, immediately after the call
              // this is important for the next call to be able to access the result index-wise
              mapArrayIndexAccess(this, this);
            }

            this.stackPointer++;

            if (
              this.options.delay! > 0 &&
              this.stackPointer < this.callStack.length
            ) {
              await sleep(this.options.delay!);
            }
          } catch (err) {
            this.stoppedWithError = err as Error;
            throw err;
          }
        }

        // at this point, we have finished all calls
        this.isResolved = true;

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

export function dequery<NT = ChainMethodReturnType>(
  selectorRefOrEl: string | NodeType | Ref<NodeType, any> | RenderInput,
  options: DequeryOptions<NT> | ElementCreationOptions = getDefaultConfig(),
): CallChainImplThenable<NT> {
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
      return chain;
    } else {
      return chain.query(selectorRefOrEl) as CallChainImplThenable<NT>;
    }
  } else if (isRef(selectorRefOrEl)) {
    return chain.ref(selectorRefOrEl) as CallChainImplThenable<NT>;
  } else if ((selectorRefOrEl as Node).nodeType) {
    chain.resultStack = [[selectorRefOrEl as NT]];
    return chain;
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
    return chain;
  }
  throw new Error("Unsupported selectorOrEl type");
}

export const $: typeof dequery = dequery;
export const D: typeof dequery = dequery;

export type Dequery = CallChainImplThenable;

export function isDequery(obj: unknown): obj is CallChainImplThenable {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "isResolved" in obj &&
    "lastResult" in obj &&
    "resultStack" in obj
  );
}

async function waitFor<T>(
  check: () => T | null | undefined,
  timeout: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const initialResult = check();
    if (initialResult != null) return resolve(initialResult);

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const observer = new MutationObserver(() => {
      const result = check();
      if (result != null) {
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

function mapArrayIndexAccess<NT = ChainMethodReturnType>(
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

function createSubChain<NT = ChainMethodReturnType>(
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
  return subChain;
}

function subChainForNextAwait<NT>(
  source: CallChainImpl<NT>,
): CallChainImpl<NT> | CallChainImplThenable<NT> {
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

async function waitForRef<T>(
  ref: { current: T | null },
  timeout: number,
): Promise<T> {
  return waitFor(() => ref.current, timeout);
}

function renderHTML(html: string, type: DOMParserSupportedType = "text/html") {
  const newDom = new DOMParser().parseFromString(html, type);
  return Array.from(newDom.body.childNodes);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function runWithTimeGuard<NT>(
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
