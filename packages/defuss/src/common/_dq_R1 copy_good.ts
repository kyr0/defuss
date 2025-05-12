import {
  isJSX,
  isRef,
  renderIsomorphicSync,
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
  resultStack?: NodeType[];
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
  fn: (...args: any[]) => Promise<NodeType[]>;
  args: any[];
  constructor(
    name: string,
    fn: (...args: any[]) => Promise<NodeType[]>,
    ...args: any[]
  ) {
    this.name = name;
    this.fn = fn;
    this.args = args;
  }
}

const SyncCallNames = ["getFirstElement"];

export class CallChainImpl<NT extends NodeType = HTMLElement> {
  [index: number]: NT;

  options: DequeryOptions;
  callStack: Call[];
  resultStack: NT[][];
  stackPointer: number;
  stoppedWithError: Error | null;
  lastResult: NT[] | CallChainImpl<NT> | CallChainImplThenable<NT>;
  length: number;

  constructor(options: DequeryOptions = {}) {
    this.options = { ...adefaultConfig, ...options };
    this.callStack = [];
    this.resultStack = (
      options.resultStack ? [options.resultStack] : []
    ) as NT[][];
    this.stackPointer = 0;
    this.stoppedWithError = null;
    this.lastResult = [];
    this.length = 0;
  }

  // sync methods

  // currently selected elements
  get __elements(): NodeType[] {
    return this.resultStack.length > 0
      ? this.resultStack[this.resultStack.length - 1]
      : [];
  }

  // allow for for .. of loop
  [Symbol.iterator]() {
    return this.__elements[Symbol.iterator]() as IterableIterator<NT>;
  }

  // async API methods

  debug(cb: (el: NodeType | NodeType[]) => void) {
    this.callStack.push(
      new Call("debug", async () => {
        cb(this.__elements);
        return this.__elements;
      }),
    );
    return this;
  }

  getFirstElement<NT extends NodeType = HTMLElement>(): PromiseLike<NT> {
    console.log("called getFirstElement");

    this.callStack.push(
      new Call("getFirstElement", async () => {
        return this[0] as any;
      }),
    );
    return this as unknown as PromiseLike<NT>;
  }

  ref(ref: Ref<NodeType>) {
    this.callStack.push(
      new Call("ref", async () => {
        await waitForRef(ref, this.options.maxWaitMs!);
        if (ref.current) {
          return [elementGuard(ref.current)];
        } else {
          throw new Error("Ref is null or undefined");
        }
      }),
    );
    return this;
  }

  query(selector: string) {
    this.callStack.push(
      new Call("query", async () => {
        await waitFor(
          () => document.querySelectorAll(selector),
          this.options.maxWaitMs!,
        );
        return Array.from(document.querySelectorAll(selector));
      }),
    );
    return this;
  }

  next() {
    this.callStack.push(
      new Call("next", async () => {
        return this.__elements
          .map((el) => (el instanceof Element ? el.nextElementSibling : null))
          .filter((el): el is Element => el instanceof Element);
      }),
    );
    return this;
  }

  prev() {
    this.callStack.push(
      new Call("prev", async () => {
        return this.__elements
          .map((el) =>
            el instanceof Element ? el.previousElementSibling : null,
          )
          .filter((el): el is Element => el instanceof Element);
      }),
    );
    return this;
  }

  find<NT extends NodeType = HTMLElement>(
    selector: string,
  ): CallChainImplThenable<NT> {
    this.callStack.push(
      new Call("find", async () => {
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
        return res;
      }),
    );
    return this as unknown as CallChainImplThenable<NT>;
  }

  parent() {
    this.callStack.push(
      new Call("parent", async () => {
        return this.__elements
          .map((el) => (el as Element).parentElement)
          .filter((el): el is HTMLElement => el !== null);
      }),
    );
    return this;
  }

  children() {
    this.callStack.push(
      new Call("children", async () => {
        return this.__elements.flatMap((el) =>
          Array.from(elementGuard(el).children),
        );
      }),
    );
    return this;
  }

  closest(selector: string) {
    this.callStack.push(
      new Call("closest", async () => {
        return this.__elements
          .map((el) => (el as Element).closest(selector))
          .filter((el): el is HTMLElement => el !== null);
      }),
    );
    return this;
  }

  first() {
    this.callStack.push(
      new Call("first", async () => {
        return this.__elements.slice(0, 1);
      }),
    );
    return this;
  }

  last() {
    this.callStack.push(
      new Call("last", async () => {
        return this.__elements.slice(-1);
      }),
    );
    return this;
  }

  all() {
    this.callStack.push(
      new Call("all", async () => {
        return this.__elements;
      }),
    );
    return this;
  }
}

export class CallChainImplThenable<
  NT extends NodeType = HTMLElement,
> extends CallChainImpl<NT> {
  isResolved: boolean;

  constructor(options: DequeryOptions = {}, isResolved = false) {
    super(options);
    this.isResolved = isResolved;
  }

  // biome-ignore lint/suspicious/noThenProperty: <explanation>
  then(
    onfulfilled?: (value: CallChainImpl<NT>) => CallChainImpl<NT>,
    onrejected?: (reason: any) => any | PromiseLike<any>,
  ): Promise<any> {
    console.log("then", this.isResolved, this.stackPointer);
    if (this.stoppedWithError)
      return Promise.reject(this.stoppedWithError).then(
        onfulfilled as any,
        onrejected,
      );

    if (this.isResolved && this.stackPointer >= this.callStack.length) {
      console.log(
        "early resolve",
        Object.getPrototypeOf(this).constructor.name,
      );

      const lastCallName = this.callStack[this.callStack.length - 1]?.name;

      console.log("lastCallName", lastCallName);

      let result;
      if (SyncCallNames.includes(lastCallName)) {
        result = this.lastResult;
      } else {
        result = createSubChain(this);
      }
      console.log("return ASYNC", Object.getPrototypeOf(this).constructor.name);

      return Promise.resolve(result).then(onfulfilled as any, onrejected);
    }

    return runWithTimeGuard(
      this.options.timeout!,
      async () => {
        const startTime = Date.now();
        let call: Call;
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

export function dequery<NT extends NodeType = HTMLElement>(
  selectorRefOrEl: string | NodeType | Ref<NodeType, any> | RenderInput,
  options: DequeryOptions | ElementCreationOptions = adefaultConfig,
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
      return chain.query(selectorRefOrEl);
    }
  } else if (isRef(selectorRefOrEl)) {
    return chain.ref(selectorRefOrEl);
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

function mapArrayIndexAccess<NT extends NodeType>(
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

function createSubChain<NT extends NodeType = HTMLElement>(
  source: CallChainImpl<NT>,
) {
  const subChain = new CallChainImpl<NT>(source.options);
  subChain.callStack = source.callStack;
  subChain.resultStack = source.resultStack;
  subChain.stackPointer = source.stackPointer;
  subChain.stoppedWithError = source.stoppedWithError;
  subChain.lastResult = source.lastResult;

  if (Array.isArray(subChain.lastResult)) {
    mapArrayIndexAccess(source, subChain);
  }
  return subChain;
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

function runWithTimeGuard(
  timeout: number,
  fn: Function,
  args: any[],
  onError: (ms: number, call: Call) => void,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const fakeCall = new Call("timeout", async () => []);
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
