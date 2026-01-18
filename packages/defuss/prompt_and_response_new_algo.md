Given the following framework code, implement the fully corrected new implementation on the basis of the ANALYSIS.



<full-context-dump>
./package.json:
```
{
  "name": "defuss",
  "version": "2.1.10",
  "type": "module",
  "publishConfig": {
    "access": "public"
  },
  "license": "MIT",
  "description": "Explicit simplicity for the web.",
  "keywords": [
    "jsx",
    "render",
    "ssr",
    "ssg",
    "isomorphic",
    "jquery-like",
    "defuss",
    "react-like",
    "lightweight",
    "typescript",
    "framework",
    "library",
    "dom-router",
    "spa",
    "csr",
    "store",
    "state",
    "component",
    "components",
    "ui",
    "user-interface",
    "frontend",
    "front-end",
    "web-storage",
    "async"
  ],
  "repository": {
    "url": "git+https://github.com/kyr0/defuss.git",
    "type": "git"
  },
  "scripts": {
    "clean": "rm -rf ./coverage && rm -rf ./node_modules/.pnpm && rm -rf ./node_modules/.vite",
    "pretest": "pnpm run build",
    "test:watch": "vitest --coverage",
    "test": "vitest run --coverage",
    "prebuild": "pnpm run clean",
    "build": "pkgroll --env.PKG_VERSION=$(node -p \"require('./package.json').version\")"
  },
  "author": "Aron Homberg <info@aron-homberg.de>",
  "sideEffects": false,
  "exports": {
    ".": {
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.cjs"
      },
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.mjs"
      }
    },
    "./server": {
      "require": {
        "types": "./dist/render/server.d.ts",
        "default": "./dist/render/server.cjs"
      },
      "import": {
        "types": "./dist/render/server.d.ts",
        "default": "./dist/render/server.mjs"
      }
    },
    "./client": {
      "require": {
        "types": "./dist/render/client.d.ts",
        "default": "./dist/render/client.cjs"
      },
      "import": {
        "types": "./dist/render/client.d.ts",
        "default": "./dist/render/client.mjs"
      }
    },
    "./jsx-runtime": {
      "require": {
        "types": "./dist/render/index.d.ts",
        "default": "./dist/render/index.cjs"
      },
      "import": {
        "types": "./dist/render/index.d.ts",
        "default": "./dist/render/index.mjs"
      }
    },
    "./jsx-dev-runtime": {
      "require": {
        "types": "./dist/render/dev/index.d.ts",
        "default": "./dist/render/dev/index.cjs"
      },
      "import": {
        "types": "./dist/render/dev/index.d.ts",
        "default": "./dist/render/dev/index.mjs"
      }
    }
  },
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.cts",
  "files": ["dist", "assets"],
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@vitest/coverage-v8": "^3.1.3",
    "pkgroll": "^2.6.0",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2",
    "vitest": "^3.1.3",
    "jsdom": "^26.1.0"
  },
  "dependencies": {
    "defuss-runtime": "^1.2.1",
    "@types/w3c-xmlserializer": "^2.0.4",
    "csstype": "^3.1.3",
    "happy-dom": "^15.11.7",
    "w3c-xmlserializer": "^5.0.0"
  }
}

```

./pkgroll.config.mjs:
```
import pkg from "./package.json" assert { type: "json" };

export default {
  rollupOptions: {
    output: {
      banner: `console.log("Running ${pkg.name} v${pkg.version}");`,
    },
  },
};

```

./src/async/Async.tsx:
```
import type {
  RenderInput,
  VNodeChildren,
  VNode,
  Ref,
  Props,
  VNodeChild,
} from "@/render/types.js";
import { createRef, isRef } from "@/render/index.js";
import { $ } from "@/dequery/index.js";
import { inDevMode } from "@/common/index.js";

export type AsyncState = "loading" | "loaded" | "error";

export interface AsyncStateRef extends Ref<AsyncState, HTMLElement> {
  /** The state of the async content */
  state?: AsyncState;

  /** Error details are available here in case the state changes to "error" */
  error?: unknown;
}

export interface AsyncProps extends Props {
  /** to uniquely identify the root DOM element without using a ref */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** The fallback content to display while the async content is loading */
  fallback?: VNode;

  /** Store this with createRef() to update() the Suspense state */
  ref?: AsyncStateRef;

  /** The async content to display when loaded */
  render?: () => Promise<RenderInput>;

  /** to override the name of the .suspense-loading transition CSS class name */
  loadingClassName?: string;

  /** to override the name of the .suspense-loaded transition CSS class name */
  loadedClassName?: string;

  /** to override the name of the .suspense-error transition CSS class name */
  errorClassName?: string;
}

export const Async = ({
  fallback,
  ref,
  children,
  class: _class,
  className,
  id,
  loadingClassName,
  loadedClassName,
  errorClassName,
  onError,
}: AsyncProps) => {
  let childrenToRender: VNodeChild | VNodeChildren = children;

  const containerRef: AsyncStateRef = createRef<AsyncState>(
    function onSuspenseUpdate(state: AsyncState) {
      try {
        if (!containerRef.current) {
          if (inDevMode) {
            console.warn(
              "Suspense container is not mounted yet, but a state update demands a render. State is:",
              state,
            );
          }
          return;
        }
        (async () => {
          // to allow for beautiful CSS state transitions
          await $(containerRef.current).removeClass(
            loadingClassName || "suspense-loading",
          );
          await $(containerRef.current).removeClass(
            loadedClassName || "suspense-loaded",
          );
          await $(containerRef.current).removeClass(
            errorClassName || "suspense-error",
          );

          if (!children || state === "error") {
            await $(containerRef.current).addClass(
              errorClassName || "suspense-error",
            );
            await $(containerRef).jsx({
              type: "div",
              children: ["Loading error!"],
            });
          } else if (state === "loading") {
            await $(containerRef.current).addClass(
              loadingClassName || "suspense-loading",
            );
            await $(containerRef).jsx(fallback);
          } else if (state === "loaded") {
            await $(containerRef.current).addClass(
              loadedClassName || "suspense-loaded",
            );

            console.log("[Async render] start");
            await $(containerRef).jsx(childrenToRender as RenderInput);
            console.log("[Async render] finished");
          }
        })();
      } catch (error) {
        containerRef.update("error");
        containerRef.error = error;

        if (typeof onError === "function") {
          // pass the error up to the parent component
          onError(error);
        }
      }
    },
    "loading",
  );

  if (isRef(ref)) {
    // for the initial state synchronization between outer and inner scope
    // we don't want to trigger the suspense state to render,
    // as the DOM element is not yet mounted (rendered in DOM)
    let isInitial = true;

    // when the suspense state is updated in outer scope
    // we bridge the update to the internal containerRef
    ref.updateState = (state: AsyncState) => {
      if (!isInitial) {
        containerRef.updateState(state);
      }
    };
    // let's tell the outer scope the initial state
    ref.updateState("loading");

    isInitial = false; // render any outer scope updates from now on
  }

  // resolve async children
  const promisedChildren = (
    Array.isArray(children) ? children : children ? [children] : []
  ).map((vnode) => {
    try {
      if (!vnode || (vnode && !(vnode as VNode).type)) {
        return Promise.resolve(""); // becomes a Text node
      }

      // <Async><SomeAsyncComponent /></Async>
      if ((vnode as VNode).type.constructor.name === "AsyncFunction") {
        // construct the props object
        const props = {
          ...(vnode as VNode).attributes,
          children: (vnode as VNode).children,
        };
        // yield the Promise objects
        return (vnode as VNode).type(props);
      }

      // all the other synchronous cases
      return Promise.resolve(vnode);
    } catch (error) {
      containerRef.updateState("error");
      containerRef.error = error;

      if (typeof onError === "function") {
        // pass the error up to the parent component
        onError(error);
      }
    }
  });

  const onMount = () => {
    if (promisedChildren.length) {
      containerRef.updateState("loading");

      Promise.all(promisedChildren)
        .then((awaitedVnodes) => {
          childrenToRender = awaitedVnodes.flatMap((vnode: VNode) =>
            vnode?.type === "Fragment" ? vnode.children : vnode,
          );
          containerRef.updateState("loaded");
        })
        .catch((error) => {
          containerRef.updateState("error");
          containerRef.error = error;

          if (inDevMode) {
            console.error("SuspenseLoadingError", error);
          }
          (async () => {
            await $(containerRef).jsx(`SuspenseLoadingError: ${error}`);
          })();
          if (typeof onError === "function") {
            onError(error);
          }
        });
    }
  };

  return {
    type: "div",
    attributes: { id, class: _class, className, ref: containerRef, onMount },
    children: fallback ? [fallback] : [],
  };
};

// React-mimicing alias
export const Suspense = Async;

```

./src/async/index.ts:
```
export * from "./Async.js";
```

./src/common/devmode.ts:
```
export const inDevMode = true;
```

./src/common/dom.ts:
```
import type {
  Globals,
  RenderInput,
  VNode,
  VNodeAttributes,
  VNodeChild,
} from "defuss/jsx-runtime";
import {
  getRenderer,
  handleLifecycleEventsForOnMount,
} from "../render/isomorph.js";
import type { NodeType } from "../render/index.js";
import { createTimeoutPromise } from "defuss-runtime";

/**
 * Compares two DOM nodes for equality with performance optimizations.
 * 1. Checks for reference equality.
 * 2. Compares node types.
 * 3. For Element nodes, compares tag names and attributes.
 * 4. For Text nodes, compares text content.
 */
export const areDomNodesEqual = (oldNode: Node, newNode: Node): boolean => {
  // return true if both references are identical
  if (oldNode === newNode) return true;

  // compare node types
  if (oldNode.nodeType !== newNode.nodeType) return false;

  // handle Element nodes
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldElement = oldNode as Element;
    const newElement = newNode as Element;

    // compare tag names
    if (oldElement.tagName !== newElement.tagName) return false;

    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;

    // compare number of attributes
    if (oldAttrs.length !== newAttrs.length) return false;

    // iterate and compare each attribute's name and value
    for (let i = 0; i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue) return false;
    }
  }

  // handle Text nodes
  if (oldNode.nodeType === Node.TEXT_NODE) {
    if (oldNode.textContent !== newNode.textContent) return false;
  }
  return true;
};

/**
 * Recursively updates oldNode with the structure of newNode:
 * - If they differ (tag/attrs/text), oldNode is replaced
 * - If same, we recurse on children
 */
const updateNode = (oldNode: Node, newNode: Node) => {
  // 1) If different, replace old with new
  if (!areDomNodesEqual(oldNode, newNode)) {
    oldNode.parentNode?.replaceChild(newNode.cloneNode(true), oldNode);
    return;
  }

  // 2) If they match and are elements, recurse on their children
  if (oldNode.nodeType === Node.ELEMENT_NODE) {
    const oldChildren = oldNode.childNodes;
    const newChildren = newNode.childNodes;
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    for (let i = 0; i < maxLength; i++) {
      const oldChild = oldChildren[i];
      const newChild = newChildren[i];

      if (oldChild && newChild) {
        // both exist; recurse
        updateNode(oldChild, newChild);
      } else if (newChild && !oldChild) {
        // new child doesn't exist in old => append
        oldNode.appendChild(newChild.cloneNode(true));
      } else if (oldChild && !newChild) {
        // old child doesn't exist in new => remove
        oldNode.removeChild(oldChild);
      }
    }
  }
};

/********************************************************
 * 1) Define a "valid" child type & utility
 ********************************************************/
export type ValidChild =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode<VNodeAttributes>;

function toValidChild(child: VNodeChild): ValidChild | undefined {
  if (child == null) return child; // null or undefined
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return child;
  }
  if (typeof child === "object" && "type" in child) {
    return child as VNode<VNodeAttributes>;
  }
  // e.g. function or {} -> filter out
  return undefined;
}

/********************************************************
 * 2) Check if a DOM node and a ValidChild match by type
 ********************************************************/
function areNodeAndChildMatching(domNode: Node, child: ValidChild): boolean {
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    // must be a text node
    return domNode.nodeType === Node.TEXT_NODE;
  } else if (child && typeof child === "object") {
    // must be same tag
    if (domNode.nodeType !== Node.ELEMENT_NODE) return false;
    const oldTag = (domNode as Element).tagName.toLowerCase();
    const newTag = child.type.toLowerCase();
    return oldTag === newTag;
  }
  // if child is null/undefined => definitely no match
  return false;
}

/********************************************************
 * 3) Patch a single DOM node in place (attributes, text, children)
 ********************************************************/
function patchDomInPlace(domNode: Node, child: ValidChild, globals: Globals) {
  const renderer = getRenderer(globals.window.document);

  // textlike
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    const newText = String(child);
    if (domNode.nodeValue !== newText) {
      domNode.nodeValue = newText;
    }
    return;
  }

  // element
  if (
    domNode.nodeType === Node.ELEMENT_NODE &&
    child &&
    typeof child === "object"
  ) {
    // 1) update attributes
    // remove old attributes not present
    const el = domNode as Element;
    const existingAttrs = Array.from(el.attributes);
    for (const attr of existingAttrs) {
      const { name } = attr;
      if (
        !Object.prototype.hasOwnProperty.call(child.attributes, name) &&
        name !== "style" &&
        !name.startsWith("on") // do not remove event listeners
      ) {
        el.removeAttribute(name);
      }
    }
    // set new attributes
    renderer.setAttributes(child, el);

    // 2) dangerouslySetInnerHTML => skip child updates
    if (child.attributes?.dangerouslySetInnerHTML) {
      el.innerHTML = child.attributes.dangerouslySetInnerHTML.__html;
      return;
    }

    // 3) recursively do partial updates for children
    if (child.children) {
      updateDomWithVdom(el, child.children as any, globals);
    } else {
      // remove old children
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    }
  }
}

/********************************************************
 * 4) Create brand new DOM node from a ValidChild
 ********************************************************/
function createDomFromChild(
  child: ValidChild,
  globals: Globals,
): Node | Node[] | undefined {
  const renderer = getRenderer(globals.window.document);

  if (child == null) return undefined;
  if (
    typeof child === "string" ||
    typeof child === "number" ||
    typeof child === "boolean"
  ) {
    return globals.window.document.createTextNode(String(child));
  }

  // else it's a VNode, create without parent as we don't know where it goes yet
  // therefore, we need to handle the onMount lifecycle event later too
  let renderResult = renderer.createElementOrElements(child) as
    | Node
    | Node[]
    | undefined;

  if (renderResult && !Array.isArray(renderResult)) {
    renderResult = [renderResult];
  }
  return renderResult;
}

/********************************************************
 * 5) Main partial-update function (index-by-index approach)
 ********************************************************/
export function updateDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
) {
  //console.log('updateDomWithVdom', newVDOM, parentElement)

  // A) Convert newVDOM => array of "valid" children
  let newChildren: ValidChild[] = [];
  if (Array.isArray(newVDOM)) {
    newChildren = newVDOM
      .map(toValidChild)
      .filter((c): c is ValidChild => c !== undefined);
  } else if (
    typeof newVDOM === "string" ||
    typeof newVDOM === "number" ||
    typeof newVDOM === "boolean"
  ) {
    newChildren = [newVDOM];
  } else if (newVDOM) {
    const child = toValidChild(newVDOM);
    if (child !== undefined) newChildren = [child];
  }

  //console.log("new children to render!", newChildren)

  // B) Generate brand-new DOM for each new child in an array
  //    We'll compare them 1:1 with the old nodes.
  const newDomArray: (Node | Node[] | undefined)[] = newChildren.map(
    (vdomChild) => createDomFromChild(vdomChild, globals),
  );

  // C) Snapshot old children
  const oldNodes = Array.from(parentElement.childNodes);

  // D) Walk up to max length
  const maxLen = Math.max(oldNodes.length, newDomArray.length);
  for (let i = 0; i < maxLen; i++) {
    const oldNode = oldNodes[i];
    const newDom = newDomArray[i]; // might be a single Node or an array of Nodes
    const newChild = newChildren[i];

    if (oldNode && newDom !== undefined) {
      // Both old & new exist
      // 1) If newDom is an array (multiple root nodes?), we do a bigger replace
      //    or partial approach. Typically we might place the 1st in oldNode's position
      //    and then insert the rest right after it, then remove oldNode if needed.
      if (Array.isArray(newDom)) {
        if (newDom.length === 0) {
          // no new => remove old
          parentElement.removeChild(oldNode);
        } else {
          // We might keep the first node and replace oldNode
          const first = newDom[0];
          parentElement.replaceChild(first, oldNode);

          // Insert the rest
          for (let k = 1; k < newDom.length; k++) {
            if (newDom[k]) {
              parentElement.insertBefore(newDom[k]!, first.nextSibling);

              if (typeof newDom[k] !== "undefined") {
                handleLifecycleEventsForOnMount(newDom[k] as HTMLElement);
              }
            }
          }

          if (typeof first !== "undefined") {
            handleLifecycleEventsForOnMount(first as HTMLElement);
          }
        }
      } else if (newDom) {
        // single new node
        // 2) If old & new match => partial patch. Else => replace
        if (newChild && areNodeAndChildMatching(oldNode, newChild)) {
          // partial patch
          patchDomInPlace(oldNode, newChild, globals);
        } else {
          // replace
          parentElement.replaceChild(newDom, oldNode);
          handleLifecycleEventsForOnMount(newDom as HTMLElement);
        }
      }
    } else if (!oldNode && newDom !== undefined) {
      // we have more new nodes => append
      if (Array.isArray(newDom)) {
        newDom.forEach((newNode) => {
          const wasAdded = newNode && parentElement.appendChild(newNode);

          if (wasAdded) {
            handleLifecycleEventsForOnMount(newNode as HTMLElement);
          }
          return wasAdded;
        });
      } else if (newDom) {
        parentElement.appendChild(newDom);
        handleLifecycleEventsForOnMount(newDom as HTMLElement);
      }
    } else if (oldNode && newDom === undefined) {
      // we have leftover old => remove
      parentElement.removeChild(oldNode);
    }
  }
}

/**
 * Directly blow away all children in `parentElement` and create new DOM
 * from `newVDOM`. This never skips or leaves behind stale nodes,
 * at the cost of losing partial update performance.
 */
export function replaceDomWithVdom(
  parentElement: Element,
  newVDOM: RenderInput,
  globals: Globals,
) {
  // 1) Clear all existing DOM children
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }

  // 2) Re-render from scratch
  const renderer = getRenderer(globals.window.document);

  // Possibly convert `newVDOM` to array if needed,
  // but `renderer.createElementOrElements` handles it either way:
  const newDom = renderer.createElementOrElements(
    newVDOM as VNode | undefined | Array<VNode | undefined | string>,
  );

  // 3) Append the newly created node(s)
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) parentElement.appendChild(node);
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
  }
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

      return () => observer.disconnect();
    });
  });
}

export function parseDOM(
  input: string,
  type: DOMParserSupportedType,
  Parser: typeof DOMParser,
): Document {
  return new Parser().parseFromString(input, type);
}

export function isSVG(input: string, Parser: typeof DOMParser) {
  const doc = parseDOM(input, "image/svg+xml", Parser);
  if (!doc.documentElement) return false;
  return doc.documentElement.nodeName.toLowerCase() === "svg";
}

export function isHTML(input: string, Parser: typeof DOMParser): boolean {
  const doc = parseDOM(input, "text/html", Parser);
  return doc.documentElement.querySelectorAll("*").length > 2; // 2 = <html> and <body>
}

export const isMarkup = (input: string, Parser: typeof DOMParser): boolean =>
  input.indexOf("<") > -1 &&
  input.indexOf(">") > -1 &&
  (isHTML(input, Parser) || isSVG(input, Parser));

export function renderMarkup(
  markup: string,
  Parser: typeof DOMParser,
  doc?: Document,
) {
  // TODO: test with SVG markup
  return Array.from(
    (doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser)).body
      .childNodes,
  );
}

export function getMimeType(
  input: string,
  Parser: typeof DOMParser,
): DOMParserSupportedType {
  if (isSVG(input, Parser)) {
    return "image/svg+xml";
  }
  return "text/html";
}

/**
 * Enhanced version of processFormElements that handles all form control types
 * including multiple select elements and radio button groups
 */
export function processAllFormElements(
  node: NodeType,
  callback: (
    input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
    key: string,
  ) => void,
): void {
  if (node instanceof Element) {
    // For form elements
    if (node instanceof HTMLFormElement) {
      Array.from(node.elements).forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
    // For individual elements or container elements
    else {
      const inputElements = node.querySelectorAll("input, select, textarea");

      inputElements.forEach((element) => {
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          const key = element.name || element.id;
          if (key) {
            callback(element, key);
          }
        }
      });
    }
  }
}

export function checkElementVisibility(
  element: HTMLElement,
  window: Window,
  document: Document,
): boolean {
  const style = window.getComputedStyle(element);
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
  if (!document.body.contains(element)) return false;

  // Check if any parent is hidden
  let parent = element.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
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

export function getEventMap(
  element: HTMLElement,
): Map<string, Set<EventListener>> {
  if (!element._dequeryEvents) {
    element._dequeryEvents = new Map();
  }
  return element._dequeryEvents;
}

export function addElementEvent(
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
): void {
  const eventMap = getEventMap(element);

  if (!eventMap.has(eventType)) {
    eventMap.set(eventType, new Set());
  }

  eventMap.get(eventType)!.add(handler);
  element.addEventListener(eventType, handler);
}

export function removeElementEvent(
  element: HTMLElement,
  eventType: string,
  handler?: EventListener,
): void {
  const eventMap = getEventMap(element);

  if (!eventMap.has(eventType)) return;

  if (handler) {
    // remove specific handler
    if (eventMap.get(eventType)!.has(handler)) {
      element.removeEventListener(eventType, handler);
      eventMap.get(eventType)!.delete(handler);

      if (eventMap.get(eventType)!.size === 0) {
        eventMap.delete(eventType);
      }
    }
  } else {
    // remove all handlers for this event type
    eventMap.get(eventType)!.forEach((h: EventListener) => {
      element.removeEventListener(eventType, h);
    });
    eventMap.delete(eventType);
  }
}

export function clearElementEvents(element: HTMLElement): void {
  const eventMap = getEventMap(element);

  eventMap.forEach((handlers, eventType) => {
    handlers.forEach((handler: EventListener) => {
      element.removeEventListener(eventType, handler);
    });
  });

  eventMap.clear();
}

/**
 * Converts a DOM node to a VNode structure for use with updateDomWithVdom.
 * This allows us to leverage the sophisticated partial update system even for Node inputs.
 */
export function domNodeToVNode(node: Node): VNode<VNodeAttributes> | string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || "";
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const attributes: VNodeAttributes = {};

    // Convert DOM attributes to VNode attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = attr.value;
    }

    // Convert child nodes recursively
    const children: (VNode<VNodeAttributes> | string)[] = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }

    return {
      type: element.tagName.toLowerCase(),
      attributes,
      children,
    };
  }

  // For other node types (comments, etc.), convert to empty string
  return "";
}

/**
 * Converts an HTML string to VNode structure for use with updateDomWithVdom.
 * This allows markup strings to benefit from the intelligent partial update system.
 */
export function htmlStringToVNodes(
  html: string,
  Parser: typeof DOMParser,
): (VNode<VNodeAttributes> | string)[] {
  const parser = new Parser();
  const doc = parser.parseFromString(html, "text/html");
  const vNodes: (VNode<VNodeAttributes> | string)[] = [];

  // Convert each child node in the body to a VNode
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }

  return vNodes;
}

```

./src/common/index.ts:
```
export * from "./devmode.js";
export * from "./dom.js";
export * from "./queue.js";

```

./src/common/queue.ts:
```
export const queueCallback = (cb: Function) => () =>
  queueMicrotask(cb as VoidFunction);

```

./src/dequery/dequery.ts:
```
import { pick, omit } from "defuss-runtime";
import {
  addElementEvent,
  checkElementVisibility,
  clearElementEvents,
  isMarkup,
  removeElementEvent,
  renderMarkup,
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
  updateDom,
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

class RefOperationRegistry {
  private operations = new Map<string, () => void>();

  register(operationId: string, cancelFn: () => void): void {
    this.operations.set(operationId, cancelFn);
  }

  cancel(operationId: string): void {
    const cancelFn = this.operations.get(operationId);
    if (cancelFn) {
      cancelFn();
      this.operations.delete(operationId);
    }
  }

  cancelAll(): void {
    for (const [id, cancelFn] of this.operations) {
      cancelFn();
    }
    this.operations.clear();
  }
}

const refOperationRegistry = new RefOperationRegistry();

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

// Global registry for non-chained return call names
const globalRegistry = globalThis as any;
if (!globalRegistry.__defuss_nonChainedReturnCallNames) {
  globalRegistry.__defuss_nonChainedReturnCallNames = [
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
}

// Utility function to add non-chained return call names globally
export function addNonChainedReturnCallNames(callNames: string[]): void {
  const global = globalRegistry.__defuss_nonChainedReturnCallNames;
  callNames.forEach((name) => {
    if (!global.includes(name)) {
      global.push(name);
    }
  });
}

// Utility function to get the current list of non-chained return call names
export function getNonChainedReturnCallNames(): string[] {
  return [...globalRegistry.__defuss_nonChainedReturnCallNames];
}

// Utility function to check if a call name is marked as non-chained
export function isNonChainedReturnCall(callName: string): boolean {
  return globalRegistry.__defuss_nonChainedReturnCallNames.includes(callName);
}

export const emptyImpl = <T>(nodes: Array<T>) => {
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

  getFirstElement(): PromiseLike<NT> {
    return createCall(
      this,
      "getFirstElement",
      async () => this[0] as NT,
    ) as PromiseLike<NT>;
  }

  // async, wrapped/chainable API methods

  debug(cb: (chain: CallChainImpl<NT, ET>) => void): ET {
    return createCall(this, "debug", async () => {
      cb(this);
      return this.nodes as NT;
    }) as unknown as ET;
  }

  ref(ref: Ref<any, NodeType>) {
    return createCall(this, "ref", async () => {
      // Check if ref is already marked as orphaned
      if ((ref as any).orphan) {
        throw new Error("Ref has been orphaned from component unmount");
      }

      // Check if ref is already available
      if (ref.current) {
        return [ref.current] as NT;
      }

      await waitForRef(ref, this.options.timeout!);

      if (ref.current) {
        return [ref.current] as NT;
      } else {
        console.log("❌ ref() - ref is still null after timeout");
        throw new Error("Ref is null or undefined after timeout");
      }
    });
  }

  query(selector: string) {
    return createCall(
      this,
      "query",
      async () => {
        return Array.from(
          await waitForDOM(
            () => Array.from(this.document.querySelectorAll(selector)),
            this.options.timeout!,
            this.document,
          ),
        ) as NT;
      },
      selector,
    );
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
    return createCall(
      this,
      "find",
      async () => {
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
      },
      selector,
    ) as CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET>;
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

  replaceWith(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<any, NodeType>
      | CallChainImpl<NT, ET>
      | CallChainImplThenable<NT, ET>,
  ): ET {
    return createCall(this, "replaceWith", async () => {
      const newElements: NodeType[] = [];

      // Render the new content into a DOM node
      const newElement = await renderNode(content, this);

      // For each element to be replaced
      for (const originalEl of this.nodes) {
        if (!originalEl?.parentNode) continue;

        if (!newElement) continue;

        // Replace the original element with the new one
        originalEl.parentNode.replaceChild(newElement, originalEl);
        newElements.push(newElement);
      }

      // Update the result stack with the new elements
      this.resultStack[this.resultStack.length - 1] = newElements as NT[];

      // Update array-like access (this[0], this[1], etc.) and length
      mapArrayIndexAccess(this, this);

      // Return the new elements that replaced the originals
      return newElements as NT;
    }) as unknown as ET;
  }

  append<T = NT>(
    content:
      | string
      | RenderInput
      | NodeType
      | Ref<any, NodeType>
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
            (el as HTMLElement).appendChild(childEl),
          );
        });
      } else {
        // Single element handling
        this.nodes.forEach((el) => {
          if (!element) return;
          (el as HTMLElement).appendChild(element);
        });
      }

      return this.nodes as NT;
    }) as unknown as ET;
  }

  appendTo<T = NT>(
    target:
      | string
      | NodeType
      | Ref<any, NodeType>
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

  update(
    input:
      | string
      | RenderInput
      | Ref<any, NodeType>
      | NodeType
      | CallChainImpl<NT>
      | CallChainImplThenable<NT>,
    transitionConfig?: import("../render/transitions.js").TransitionConfig,
  ): ET {
    return createCall(this, "update", async () => {
      return (await updateDom(
        input,
        this.nodes,
        this.options.timeout!,
        this.Parser,
        transitionConfig,
      )) as NT;
    }) as unknown as ET;
  }

  // --- Event Methods ---

  on(event: string, handler: EventListener): ET {
    return createCall(
      this,
      "on",
      async () => {
        this.nodes.forEach((el) => {
          addElementEvent(el as HTMLElement, event, handler);
        });
        return this.nodes as NT;
      },
      event,
      handler,
    ) as unknown as ET;
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

  ready(callback?: () => void): ET {
    return createCall(this, "ready", async () => {
      // Check if DOM is already ready
      if (
        this.document.readyState === "complete" ||
        this.document.readyState === "interactive"
      ) {
        // DOM is already ready, execute callback immediately if provided
        if (callback) {
          callback();
        }
        return this.nodes as NT;
      }

      // DOM is not ready, wait for DOMContentLoaded event
      // Capture the current context to avoid scope issues
      const nodes = this.nodes;
      const document = this.document;

      return new Promise<NT>((resolve) => {
        const handleDOMContentLoaded = () => {
          document.removeEventListener(
            "DOMContentLoaded",
            handleDOMContentLoaded,
          );
          if (callback) {
            callback();
          }
          resolve(nodes as NT);
        };

        document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
      });
    }) as unknown as ET;
  }

  // TODO:
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
      if (isNonChainedReturnCall(lastCallName)) {
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
        // Track start time for performance metrics (not for timeout - that's handled by runWithTimeGuard)
        const startTime = Date.now();
        let call: Call<NT>;

        // Process all queued calls in the call stack
        while (this.stackPointer < this.callStack.length) {
          call = this.callStack[this.stackPointer];

          try {
            // Execute the current call in the stack
            const callReturnValue = (await call.fn.apply(this)) as NT[];
            this.lastResult = callReturnValue;

            // Method returns that return a value directly, don't modify the selection result stack.
            // This allows for getting values from elements or modifying elements (e.g. html()) in
            // between selection changes without breaking the chain functionally (the chain expects
            // all this.resultStack values to be of a DOM node type)
            if (!isNonChainedReturnCall(call.name)) {
              this.resultStack.push(callReturnValue);
            }

            if (Array.isArray(this.lastResult)) {
              // Allow for array-like access, immediately after the call.
              // This is important for the next call to be able to access the result index-wise
              mapArrayIndexAccess(this, this);
            }

            this.stackPointer++;
          } catch (err) {
            this.stoppedWithError = err as Error;
            throw err;
          }
        }

        // At this point, we have finished all calls in the stack
        this.isResolved = true;

        // Performance metrics tracking - record the time taken for async chain execution
        this.chainAsyncFinishTime =
          (this.performance.now() ?? 0) - this.chainAsyncStartTime;

        return this;
      },
      [this], // ← Pass the chain context as args[0]
      // Timeout error handler - called by runWithTimeGuard when timeout is exceeded
      (ms, call) => {
        this.stoppedWithError = new Error(
          `Chain execution timeout after ${ms}ms`,
        );
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
    | Ref<any, NodeType>
    | RenderInput
    | Function,
  options: DequeryOptions<NT> &
    ElementCreationOptions = getDefaultDequeryOptions(),
): ET {
  // async co-routine execution
  if (typeof selectorRefOrEl === "function") {
    const syncChain = dequery("body", options);
    queueMicrotask(async () => {
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
      chain.ref(selectorRefOrEl as Ref<any, NodeType>) as CallChainImplThenable<
        NT,
        ET
      >,
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
  nonChainedReturnCalls: string[] = [],
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

  // Add non-chained return calls to the global list
  if (nonChainedReturnCalls.length > 0) {
    addNonChainedReturnCallNames(nonChainedReturnCalls);
  }

  // Return a typed function that produces instances of the extended class type
  return <NT = DequerySyncMethodReturnType>(
    selectorRefOrEl:
      | string
      | NodeType
      | Ref<any, NodeType>
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
      | Ref<any, NodeType>
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
      timeout: 5000 /** ms */,
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
  ...callArgs: any[] // ← Add this to capture call arguments
): CallChainImplThenable<NT, ET> | CallChainImpl<NT, ET> {
  chain.callStack.push(new Call<NT>(methodName, handler, ...callArgs));
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
  const operationId = Math.random().toString(36).substr(2, 9);

  return createTimeoutPromise(
    timeout,
    async () => {
      //console.log(`🟢 Executing operation [${operationId}]`);

      // Log the call stack to see which calls are being processed
      const chainContext = args[0] as CallChainImpl<NT, any>;
      if (chainContext?.callStack && chainContext.stackPointer !== undefined) {
        const remainingCalls = chainContext.callStack
          .slice(chainContext.stackPointer)
          .map((call) => call.name)
          .join(" -> ");
        //console.log(`📋 Call stack [${operationId}]: ${remainingCalls}`);
      } else {
        //console.log(`📋 Call stack [${operationId}]: unknown`);
      }

      const result = await fn(...args);
      //console.log(`✅ Operation [${operationId}] completed successfully`);
      return result;
    },
    (ms) => {
      console.log(`🔴 TIMEOUT [${operationId}] after ${ms}ms`);

      // Log which call was being processed when timeout occurred
      const chainContext = args[0] as CallChainImpl<NT, any>;
      if (chainContext?.callStack && chainContext.stackPointer !== undefined) {
        const currentCall = chainContext.callStack[chainContext.stackPointer];
        const remainingCalls = chainContext.callStack
          .slice(chainContext.stackPointer)
          .map((call) => `${call.name}(${call.args.join(", ")})`)
          .join(" -> ");
        console.log(
          `🔴 TIMEOUT occurred during call: ${currentCall?.name || "unknown"}`,
        );
        console.log(`🔴 Remaining calls were: ${remainingCalls}`);
      } else {
        console.log("🔴 Call stack at timeout: unknown");
      }

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
    | Dequery<T>
    | Ref<any, NodeType>
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
    await waitForRef(input as Ref<any, NodeType>, chain.options.timeout!);
    return input.current!;
  } else if (input && typeof input === "object" && "nodeType" in input) {
    return input as NodeType;
  } else if (isDequery(input)) {
    return (await input.getFirstElement()) as Promise<NodeType | null>;
  }
  console.warn("resolveContent: unsupported content type", input);
  return null;
}

export async function resolveNodes<T = DequerySyncMethodReturnType>(
  input:
    | string
    | NodeType
    | Ref<any, NodeType>
    | CallChainImpl<T>
    | CallChainImplThenable<T>,
  timeout: number,
  document?: Document,
): Promise<NodeType[]> {
  let nodes: NodeType[] = [];

  if (isRef(input)) {
    await waitForRef(input as Ref<any, NodeType>, timeout);
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

```

./src/dequery/index.ts:
```
export * from "./dequery.js";
export * from "./types.js";

```

./src/dequery/types.ts:
```
import type { Globals, NodeType, Ref } from "../render/index.js";

export type FormFieldValue = string | boolean;
export interface FormKeyValues {
  [keyOrPath: string]: FormFieldValue | FormFieldValue[];
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

export interface DequeryOptions<NT = DequerySyncMethodReturnType> {
  timeout?: number;
  autoStart?: boolean;
  autoStartDelay?: number;
  resultStack?: NT[];
  globals?: Partial<Globals>;
}

export type ElementCreationOptions = JSX.HTMLAttributesLowerCase &
  JSX.HTMLAttributesLowerCase & { html?: string; text?: string };

export type DequerySyncMethodReturnType =
  | Array<NodeType>
  | NodeType
  | string
  | boolean
  | null;

// Re-export transition types for convenience
export type { TransitionConfig } from "../render/transitions.js";

```

./src/dom-router/index.ts:
```
export * from "@/dom-router/Route.js"
export * from "@/dom-router/Redirect.js"
export * from "@/dom-router/RouterSlot.js"
export * from "@/dom-router/router.js"
```

./src/dom-router/Redirect.tsx:
```
import type { VNodeChild } from "@/render/types.js";
import type { RouteProps } from "./Route.js";
import { Route } from "./Route.js";
import { Router } from "./router.js";

export interface RedirectProps extends RouteProps {
  to: string;
}

export const Redirect = ({
  path,
  to,
  router = Router,
  exact,
}: RedirectProps): VNodeChild => {
  queueMicrotask(() => {
    if (Route({ path, router, exact, children: [true] })) {
      //console.log("Redirect", to);
      router.navigate(to);
    }
  });
  return null;
};

```

./src/dom-router/Route.tsx:
```
import type { Props, VNodeChild } from "@/render/types.js";
import { Router } from "./router.js";

export interface RouteProps extends Props {
  path: string;
  router?: Router;
  exact?: boolean;
}

export const Route = ({
  path,
  exact,
  children,
  router = Router,
}: RouteProps): VNodeChild => {
  // make sure the router knows the path to be matched
  router.add({
    path,
    exact: exact || false,
  });
  return router.match(path)
    ? Array.isArray(children)
      ? children[0]
      : null
    : null;
};

```

./src/dom-router/router.ts:
```
import { isServer } from "../webstorage/runtime.js";

export type OnHandleRouteChangeFn = (
  newRoute: string,
  oldRoute: string,
) => void;
export type OnRouteChangeFn = (cb: OnHandleRouteChangeFn) => void;
export type RouterStrategy = "page-refresh" | "slot-refresh";

export interface Router {
  listeners: Array<OnHandleRouteChangeFn>;
  strategy: RouterStrategy;
  add(registration: RouteRegistration): Router;
  match(path?: string): RouteRequest | false;
  getRoutes(): Array<RouteRegistration>;
  tokenizePath(path: string): TokenizedPath;
  navigate(path: string): void;
  onRouteChange: OnRouteChangeFn;
  destroy(): void;
  attachPopStateHandler(): void;
}

export interface RouterConfig {
  strategy?: RouterStrategy;
}

interface RouteMatchGroups {
  [matchName: string]: number;
}

export interface RouteParams {
  [name: string]: string;
}

export interface RouteRegistration {
  path: string;
  exact?: boolean;
  tokenizedPath?: TokenizedPath;
  handler?: RouteHandler;
}

export interface RouteRequest {
  url: string;
  params: RouteParams;
}

export interface TokenizedPath {
  regexp: RegExp;
  groups: RouteMatchGroups;
}

export type RouteHandler = (request: RouteRequest) => void;

export const tokenizePath = (path: string): TokenizedPath => {
  const paramNameRegexp = /:([^\/\.\\]+)/g;
  const groups: RouteMatchGroups = {};
  let groupIndex = 1;

  // Replace parameters with capturing groups and store the parameter names.
  const pattern = path.replace(paramNameRegexp, (_, paramName) => {
    groups[paramName] = groupIndex++;
    return "([^/.\\]+)";
  });

  return {
    groups,
    regexp: new RegExp(`^${pattern}$`),
  };
};

export const matchRouteRegistrations = (
  routeRegistrations: Array<RouteRegistration>,
  actualPathName: string,
  haystackPathName?: string,
): RouteRequest | false => {
  for (const route of routeRegistrations) {
    // Check if path is set and route.path matches it
    if (haystackPathName && route.path !== haystackPathName) {
      //console.warn(`Skipped path: Looking for ${haystackPathName}, but found ${route.path}`);
      continue;
    }

    // Check if exact match is required and if the match is exact
    if (route.exact && route.path !== actualPathName) {
      //console.warn(`Exact match required, but found ${actualPathName} instead of ${route.path}`);
      continue;
    }

    const match = route.tokenizedPath!.regexp.exec(actualPathName);
    if (!match) continue;

    //console.log(`Route matched: ${route.path} for URL: ${actualPathName}`);

    const params: RouteParams = {};

    // Extract each parameter using the stored capturing group index.
    for (const [paramName, groupIndex] of Object.entries(
      route.tokenizedPath!.groups,
    )) {
      params[paramName] = match[groupIndex];
    }

    const request: RouteRequest = { url: actualPathName, params };

    if (typeof route.handler === "function") {
      route.handler(request);
    }
    return request;
  }
  return false;
};

export const setupRouter = (
  config: RouterConfig = {
    strategy: "page-refresh", // default
  },
  windowImpl?: Window,
): Router => {
  const routeRegistrations: Array<RouteRegistration> = [];
  let currentPath = ""; // Track current path for popstate events

  // safe SSR rendering, and fine default for client side
  if (typeof window !== "undefined" && !windowImpl) {
    windowImpl = globalThis.__defuss_window /** for SSR support */ || window;
  }

  if (!windowImpl && !isServer()) {
    console.warn("Router requires a Window API implementation!");
  }

  // Initialize current path
  if (windowImpl) {
    currentPath = windowImpl.document.location.pathname;
  }

  const api = {
    ...config,
    listeners: [] as Array<OnHandleRouteChangeFn>,
    onRouteChange: (cb: OnHandleRouteChangeFn) => {
      api.listeners.push(cb);
    },
    tokenizePath,
    add(registration: RouteRegistration): Router {
      const isAlreadyRegistered = routeRegistrations.some(
        (registeredRoute) => registeredRoute.path === registration.path,
      );

      if (!isAlreadyRegistered) {
        routeRegistrations.push({
          ...registration,
          tokenizedPath: tokenizePath(registration.path),
        });
      }
      return api as Router;
    },
    match(path?: string) {
      return matchRouteRegistrations(
        routeRegistrations,
        windowImpl!.document.location.pathname,
        path,
      );
    },
    navigate(newPath: string) {
      const strategy = api.strategy || "page-refresh";
      const oldPath = currentPath; // Use tracked currentPath instead of window location

      if (strategy === "page-refresh") {
        document.location.href = newPath;
      } else if (strategy === "slot-refresh") {
        // show new path in the address bar
        if (typeof windowImpl !== "undefined") {
          windowImpl!.history.pushState({}, "", newPath);
        }

        // Update current path tracker
        currentPath = newPath;

        // Queue listeners to be called asynchronously
        queueMicrotask(() => {
          for (const listener of api.listeners) {
            listener(newPath, oldPath);
          }
        });
      }
    },
    getRoutes() {
      return routeRegistrations;
    },
    destroy() {
      // Remove popstate event listener when router is destroyed
      if (windowImpl && api.strategy === "slot-refresh") {
        windowImpl.removeEventListener("popstate", handlePopState);
      }
    },
    attachPopStateHandler() {
      if (windowImpl && api.strategy === "slot-refresh") {
        windowImpl.addEventListener("popstate", handlePopState);
      }
    },
  };

  // Handle browser back/forward navigation
  const handlePopState = (event: PopStateEvent) => {
    if (api.strategy === "slot-refresh" && windowImpl) {
      const newPath = windowImpl.document.location.pathname;
      const oldPath = currentPath;

      // Update current path tracker
      currentPath = newPath;

      // Queue listeners to be called asynchronously to ensure proper timing
      queueMicrotask(() => {
        for (const listener of api.listeners) {
          listener(newPath, oldPath);
        }
      });
    }
  };

  // Add popstate event listener for slot-refresh strategy during initialization
  if (windowImpl && api.strategy === "slot-refresh") {
    api.attachPopStateHandler();
  }

  return api as Router;
};

export const Router = setupRouter();

```

./src/dom-router/RouterSlot.tsx:
```
import type { Props, VNodeChild } from "../render/types.js";
import {
  createRef,
  type Ref,
  type NodeType,
  type TransitionType,
} from "../render/client.js";
import { Router } from "./router.js";
import { $, type TransitionConfig } from "../dequery/index.js";

export const RouterSlotId = "router-slot";

export interface RouterSlotProps extends Props {
  /** to override the tag name used for the router slot */
  tag?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** to override the default global router */
  router?: Router;

  /** A component reference that returns many <Route />, <Redirect ... /> etc. components */
  RouterOutlet?: any;

  /** Transition configuration for route changes; default: { type: 'fade', duration: 50 } */
  transitionConfig?: TransitionConfig;
}

/**
 * RouterSlot registers a slot refresh handler with the global router configuration
 * and renders its default children (RouterOutlet). Whenever the route changes, it re-renders dynamically.
 * This decouples the slot refresh logic from route registration.
 */
export const RouterSlot = ({
  router = Router,
  children,
  RouterOutlet,
  transitionConfig = {
    type: "fade",
    duration: 25,
    target: "self",
  } as TransitionConfig,
  ...attributes
}: RouterSlotProps): VNodeChild => {
  const { tag, ...attributesWithoutTag } = attributes;
  const ref: Ref<NodeType> = createRef();

  // by using this component, we automatically switch to slot-refresh strategy
  router.strategy = "slot-refresh";
  router.attachPopStateHandler();

  router.onRouteChange(async () => {
    //console.log("<RouterSlot> RouterSlot.onRouteChange", newPath, oldPath, ref.current);
    await $(ref).update(RouterOutlet(), transitionConfig);
  });

  if (document.getElementById(RouterSlotId)) {
    console.warn(
      `It seems there's more than one <RouterSlot /> components defined as an element with id #${RouterSlotId} already exists in the DOM.`,
    );
  }

  return {
    children: RouterOutlet() || [],
    type: attributes.tag || "div",
    attributes: {
      ...attributesWithoutTag,
      id: RouterSlotId,
      ref,
    },
  };
};

```

./src/i18n/i18n.tsx:
```
import type { VNode } from "../render/types.js";
import { createStore, type Store } from "../store/index.js";

export type TranslationObject = {
  [key: string]: string | VNode | TranslationObject;
};
export type Translations = { [language: string]: TranslationObject };
export type OnLanguageChangeListener = (newLanguage: string) => void;
export type Replacements = Record<string, string>;

export interface I18nStore {
  language: string;
  changeLanguage: (language: string) => void;
  t: (path: string, options?: Record<string, string>) => string;
  loadLanguage: (language: string, translations: TranslationObject) => void;
  subscribe: (onLanguageChange: OnLanguageChangeListener) => () => void;
  unsubscribe: (onLanguageChange: OnLanguageChangeListener) => void;
}

// example of placeholders: {name}, {age}, {city}
const VARIABLE_REGEX = /{([^}]*)}/g;
const DOUBLE_BRACE_REGEX = /\{\{([^}]*)\}\}/g;

const interpolate = (template: string, replacements: Replacements): string => {
  // First handle double braces {{key}} pattern - these become {replacement}
  let result = template.replace(DOUBLE_BRACE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return `{${replacement}}`;
    }
    return match;
  });

  // Then handle regular single braces {key} pattern
  result = result.replace(VARIABLE_REGEX, (match, key) => {
    const replacement = replacements[key];
    if (replacement !== undefined) {
      return replacement;
    }
    return match;
  });

  return result;
};

export const createI18n = (): I18nStore => {
  const translationsStore: Store<Translations> = createStore({});
  let language = "en";

  const onLanguageChangeCallbacks: Array<OnLanguageChangeListener> = [];

  const api = {
    get language() {
      return language;
    },

    changeLanguage(newLanguage: string) {
      // Only trigger callbacks if the language actually changes
      if (newLanguage !== language) {
        language = newLanguage;
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(newLanguage);
        });
      }
    },

    // example usage of the t function with placeholders:
    // const translatedString = t('greeting', { name: 'John', age: '30' }, 'common');
    // this would replace placeholders {name} and {age} in the translation string with 'John' and '30' respectively.
    t(path: string, replacements: Record<string, string> = {}): string {
      const languageData = translationsStore.get<TranslationObject>(language);
      if (!languageData) {
        return path;
      }

      // First try to get the translation as a literal key (for keys with dots)
      let template = languageData[path];

      // If literal key doesn't exist, try nested path access
      if (template === undefined) {
        const pathParts = path.split(".");
        let current: any = languageData;
        for (const part of pathParts) {
          current = current?.[part];
          if (current === undefined) {
            break;
          }
        }
        template = current;
      }

      // If still not found, return the key itself
      if (template === undefined) {
        return path;
      }

      // VDOM (VNode) - convert to string representation
      if (typeof template !== "string") {
        return path; // Fallback to path for non-string templates
      }
      // plaintext string or HTML
      return interpolate(template, replacements);
    },

    loadLanguage(
      newLanguage: string,
      namespaceTranslations: TranslationObject,
    ) {
      translationsStore.set(newLanguage, {
        ...translationsStore.get<TranslationObject>(newLanguage),
        ...namespaceTranslations,
      });
      // Only notify subscribers if the new language is the current language
      if (newLanguage === language) {
        onLanguageChangeCallbacks.forEach((callback) => {
          callback(language);
        });
      }
    },

    subscribe(onLanguageChange: OnLanguageChangeListener) {
      onLanguageChangeCallbacks.push(onLanguageChange);
      return () => api.unsubscribe(onLanguageChange);
    },

    unsubscribe(onLanguageChange: OnLanguageChangeListener) {
      const index = onLanguageChangeCallbacks.indexOf(onLanguageChange);
      if (index >= 0) onLanguageChangeCallbacks.splice(index, 1);
    },
  };
  return api;
};

if (!globalThis.__defuss_i18n) {
  globalThis.__defuss_i18n = createI18n();
}
export const i18n = globalThis.__defuss_i18n as I18nStore;

export const t = i18n.t.bind(i18n);
export const changeLanguage = i18n.changeLanguage.bind(i18n);
export const loadLanguage = i18n.loadLanguage.bind(i18n);
export const getLanguage = () => i18n.language;

```

./src/i18n/index.ts:
```
export * from "../i18n/i18n.js";
export * from "../i18n/trans.js";

```

./src/i18n/trans.tsx:
```
import type { Props, Ref, VNodeChild } from "../render/types.js";
import { type Replacements, i18n } from "./i18n.js";

export interface TransRef extends Ref<string, HTMLElement> {
  updateValues: (values: Replacements) => void;
}

export interface TransProps extends Props {
  key: string;
  ref?: TransRef;
  tag?: string;
  values?: Replacements;
  class?: string;
  className?: string;
  style?: string;
  // allow for arbitrary attributes
  [propName: string]: any;
}

export const Trans = ({
  key,
  values,
  tag,
  ref,
  ...attrs
}: TransProps): VNodeChild => {
  const _ref: TransRef = ref || ({} as TransRef);

  const updateContent = () => {
    const value = i18n.t(key, values);
    if (_ref.current) {
      _ref.current.textContent = value;
    }
  };

  _ref.updateValues = (newValues: Replacements) => {
    values = newValues;
    updateContent();
  };

  // Mount handler to set up subscription after element is in DOM
  const onMount = () => {
    // Subscribe to i18n changes after the element is mounted
    i18n.subscribe(updateContent);

    if (attrs.onMount) {
      // Call the provided onMount handler if it exists
      attrs.onMount(_ref.current);
    }
  };

  // auto-unsubscribe when component is unmounted
  const onUnmount = () => {
    // unsubscribe from language change
    i18n.unsubscribe(updateContent);

    if (attrs.onUnmount) {
      // Call the provided onUnmount handler if it exists
      attrs.onUnmount(_ref.current);
    }
  };

  return {
    type: tag || "span",
    attributes: {
      ref: _ref,
      ...attrs,
      onMount,
      onUnmount,
    },
    // initially render
    children: i18n.t(key, values),
  };
};

export const T = Trans;

```

./src/i18n/types.d.ts:
```
import type { I18nStore } from "./i18n.js";

declare global {
  namespace globalThis {
    var __defuss_i18n: I18nStore | undefined;
  }
}

```

./src/index.ts:
```
console.log(`defuss v${process.env.PKG_VERSION}`);

export * from "@/common/index.js";
export * from "@/render/index.js";
export * from "@/dequery/index.js";
export * from "@/webstorage/index.js";
export * from "@/store/index.js";
export * from "@/i18n/index.js";
//export * from "@/net/index.js"
export * from "@/dom-router/index.js";
export * from "@/async/index.js";

```

./src/net/fetch.ts:
```

/**
 * custom headers class to manage HTTP headers with case-insensitive keys.
 * simplifies header manipulation by providing utility methods.
 */
export class Headers {
  // internal map to store headers
  private map: Map<string, string>;

  /**
   * initializes the Headers instance with provided headers or another Headers object.
   * ensures all header keys are stored in lowercase for consistent access.
   * @param init initial headers as a record or another Headers instance
   */
  constructor(init: Record<string, string> | Headers = {}) {
    this.map = new Map();

    if (init instanceof Headers) {
      init.forEach((value, key) => this.map.set(key, value));
    } else {
      Object.entries(init).forEach(([key, value]) =>
        this.map.set(key.toLowerCase(), value)
      );
    }
  }

  /**
   * appends or sets the value for a specific header key.
   * stores the key in lowercase to maintain case-insensitivity.
   * @param key header name
   * @param value header value
   */
  append(key: string, value: string): void {
    this.map.set(key.toLowerCase(), value);
  }

  /**
   * retrieves the value of a specific header key.
   * @param key header name
   * @returns the header value or null if not found
   */
  get(key: string): string | null {
    return this.map.get(key.toLowerCase()) || null;
  }

  /**
   * checks if a specific header key exists.
   * @param key header name
   * @returns boolean indicating existence of the header
   */
  has(key: string): boolean {
    return this.map.has(key.toLowerCase());
  }

  /**
   * iterates over all headers and executes the provided callback for each.
   * @param callback function to execute for each header
   */
  forEach(callback: (value: string, key: string) => void): void {
    this.map.forEach((value, key) => callback(value, key));
  }
}

/**
 * ProgressSignal extends EventTarget to dispatch and track progress events.
 * useful for monitoring the progress of network requests.
 */
export class ProgressSignal extends EventTarget {
  // internal progress state
  private _progress: { loaded: number; total: number };

  /**
   * initializes the ProgressSignal with zero progress.
   */
  constructor() {
    super();
    this._progress = { loaded: 0, total: 0 };
  }

  /**
   * retrieves the current progress.
   * @returns an object containing loaded and total bytes
   */
  get progress(): { loaded: number; total: number } {
    return this._progress;
  }

  /**
   * dispatches a progress event with updated loaded and total bytes.
   * updates the internal progress state.
   * @param event the ProgressEvent containing progress information
   */
  dispatchProgress(event: ProgressEvent): void {
    this._progress = { loaded: event.loaded, total: event.total };
    this.dispatchEvent(
      new ProgressEvent('progress', { loaded: event.loaded, total: event.total })
    );
  }
}

/**
 * ProgressController manages a ProgressSignal for tracking request progress.
 * provides a centralized way to handle progress events.
 */
export class ProgressController {
  signal: ProgressSignal;

  /**
   * initializes the ProgressController with a new ProgressSignal.
   */
  constructor() {
    this.signal = new ProgressSignal();
  }
}

/**
 * serializes the request body into a format suitable for XMLHttpRequest.
 * handles various body types including JSON objects and FormData.
 * @param body the body to serialize
 * @returns the serialized body or null if no body is provided
 */
export function serializeBody(
  body: BodyInit | Record<string, unknown> | null | undefined
): XMLHttpRequestBodyInit | Document | null {
  if (!body) return null;

  if (
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body) ||
    typeof body === "string"
  ) {
    return body;
  }

  if (typeof body === "object") {
    return JSON.stringify(body); // convert object to JSON string for transmission
  }

  return String(body); // ensure fallback to string for unsupported types
}

/**
 * parses a raw header string from an XMLHttpRequest into a Headers instance.
 * @param headerStr the raw header string
 * @returns a Headers instance containing parsed headers
 */
export function parseHeaders(headerStr: string): Headers {
  const headers = new Headers();
  headerStr.split('\r\n').forEach((line) => {
    const [key, ...rest] = line.split(': ');
    if (key) headers.append(key, rest.join(': '));
  });
  return headers;
}

/**
 * extends the standard RequestInit to include an optional ProgressSignal.
 * allows tracking the progress of the network request.
 */
export interface FetchWithControllersInit extends RequestInit {
  progressSignal?: ProgressSignal;
}

/**
 * represents the response from a fetch operation, mirroring the native Response interface.
 * includes methods to access the response body in various formats.
 */
export interface FetchResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;
  url: string;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  blob: () => Promise<Blob>;
}

/**
 * performs a network fetch request with support for progress tracking using XMLHttpRequest.
 * falls back to the native fetch implementation if no ProgressSignal is provided.
 * @param input the resource to fetch, typically a URL string
 * @param init optional configuration for the request, including method, headers, body, credentials, and progressSignal
 * @returns a promise resolving to a FetchResponse containing the response details
 */
export async function fetch(
  input: string | URL,
  init: FetchWithControllersInit = {}
): Promise<FetchResponse> {
  // use native fetch if ProgressSignal is not provided for simplicity and efficiency
  if (!init.progressSignal && typeof globalThis.fetch === "function") {
    return fetch(input, init) as unknown as FetchResponse;
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const method = (init.method || 'GET').toUpperCase();
    const body = serializeBody(init.body || null);
    const progressSignal = init.progressSignal;
    const abortSignal = init.signal;

    // handle abort events to allow request cancellation
    if (abortSignal) {
      const abortHandler = () => {
        xhr.abort();
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      abortSignal.addEventListener('abort', abortHandler, { once: true });
    }

    xhr.open(method, input.toString(), true);

    // set credentials based on the init configuration
    if (init.credentials === 'include') {
      xhr.withCredentials = true;
    } else if (init.credentials === 'omit') {
      xhr.withCredentials = false;
    }

    // set request headers using the custom Headers class or raw headers
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => xhr.setRequestHeader(key, value));
    } else if (init.headers) {
      Object.entries(init.headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value as string);
      });
    }

    // attach progress listeners if a ProgressSignal is provided
    if (progressSignal) {
      if (xhr.upload) {
        xhr.upload.onprogress = (event) => progressSignal.dispatchProgress(event);
      }
      xhr.onprogress = (event) => progressSignal.dispatchProgress(event);
    }

    // handle the response once the request is completed
    xhr.onload = () => {
      const response: FetchResponse = {
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        statusText: xhr.statusText,
        headers: parseHeaders(xhr.getAllResponseHeaders()),
        url: xhr.responseURL,
        text: () => Promise.resolve(xhr.responseText),
        json: () => Promise.resolve(JSON.parse(xhr.responseText)),
        blob: () => Promise.resolve(new Blob([xhr.response])),
      };
      resolve(response);
    };

    // handle network errors
    xhr.onerror = () => reject(new TypeError('Network request failed'));
    xhr.ontimeout = () => reject(new TypeError('Network request timed out'));
    xhr.onabort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));

    // send the serialized request body
    xhr.send(body);
  });
}


/*
 // example usage of fetch with upload tracking
 async function exampleFetchWithUploadTracking() {
   const url = 'https://example.com/upload';
   const data = new FormData();
   data.append('file', new Blob(['file content'], { type: 'text/plain' }), 'example.txt');

   const { signal: progressSignal } = new ProgressController();

   progressSignal.addEventListener('progress', (event: ProgressEvent) => {
     console.log(`Uploaded ${event.loaded} of ${event.total} bytes`);
   });

   try {
     const response = await fetch(url, {
       method: 'POST',
       body: data,
       headers: {
         'Accept': 'application/json'
       },
       credentials: 'include',
       progressSignal
     });

     if (response.ok) {
       const jsonResponse = await response.json();
       console.log('Upload successful:', jsonResponse);
     } else {
       console.error('Upload failed:', response.statusText);
     }
   } catch (error) {
     console.error('Error during fetch:', error);
   }
 }
 
 */
```

./src/net/index.ts:
```
export * from "@/net/fetch.js"


```

./src/render/client.ts:
```
import type { Dequery, DequerySyncMethodReturnType } from "@/dequery/index.js";
import {
  observeUnmount,
  renderIsomorphicSync,
  renderIsomorphicAsync,
  type ParentElementInput,
  type ParentElementInputAsync,
  globalScopeDomApis,
} from "./isomorph.js";
import type { Globals, RenderInput, RenderResult, VNode } from "./types.js";

export const renderSync = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement: ParentElementInput = document.documentElement,
): RenderResult<T> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const render = async <T extends RenderInput>(
  virtualNode: T | Promise<T>,
  parentDomElement: ParentElementInputAsync | any = document.documentElement,
): Promise<RenderResult<T>> => {
  globalScopeDomApis(window, document);
  return renderIsomorphicAsync(
    virtualNode,
    parentDomElement,
    window as Globals,
  ) as any;
};

export const renderToString = (el: Node) =>
  new XMLSerializer().serializeToString(el);

export const hydrate = (
  nodes: Array<VNode | string | null>,
  parentElements: Array<HTMLElement | Text | Node>,
  debug?: boolean,
) => {
  let elementIndex = 0;

  if (nodes.length !== parentElements.length) {
    // Last-chance fix: fuse consecutive string/number nodes into a single Text node,
    // restarting when encountering a non-fusable vnode. Continue scanning afterwards.
    const fusedNodes: Array<VNode | string | null> = [];
    let textBuffer: string | null = null;

    const flush = () => {
      if (textBuffer && textBuffer.length > 0) {
        fusedNodes.push(textBuffer);
      }
      textBuffer = null;
    };

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i] as any;
      // Values that produce text in HTML output
      if (
        typeof node === "string" ||
        typeof node === "number" ||
        typeof node === "bigint"
      ) {
        textBuffer = (textBuffer ?? "") + String(node);
        continue;
      }

      // Values that render nothing in HTML output (do not break fusion)
      if (
        node === null ||
        typeof node === "undefined" ||
        typeof node === "boolean"
      ) {
        continue;
      }

      // Non-fusable (VNode/object/etc.) -> boundary: flush and push
      flush();
      fusedNodes.push(node);
    }

    // push any trailing buffered text
    flush();

    if (fusedNodes.length === parentElements.length) {
      nodes = fusedNodes;
      if (debug) {
        console.debug(
          "[defuss] Hydration: resolved mismatch via text-node fusion.",
        );
      }
    } else {
      // Fail hard: we couldn't reconcile vnode count with DOM children
      throw new Error(
        `【defuss】Hydration error: Mismatched number of VNodes (${fusedNodes.length}) and DOM elements (${parentElements.length}) after text-node fusion attempt.`,
      );
    }
  }

  for (const node of nodes) {
    // Text-like nodes: will correspond to a single DOM Text node
    if (
      typeof node === "string" ||
      typeof node === "number" ||
      typeof node === "bigint"
    ) {
      // for text nodes, skip DOM nodes that are not elements or text
      while (
        elementIndex < parentElements.length &&
        parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE &&
        parentElements[elementIndex].nodeType !== Node.TEXT_NODE
      ) {
        elementIndex++;
      }

      if (elementIndex >= parentElements.length) {
        if (debug) {
          console.warn(
            "[defuss] Hydration warning: Ran out of DOM nodes while matching text content.",
          );
        }
        break;
      }

      const domNode = parentElements[elementIndex];
      const expected = String(node);

      if (domNode.nodeType === Node.TEXT_NODE) {
        const textNode = domNode as Text;
        if (textNode.nodeValue !== expected) {
          if (debug) {
            console.warn(
              `[defuss] Hydration text mismatch: expected "${expected}", got "${textNode.nodeValue ?? ""}". Correcting.`,
            );
          }
          textNode.nodeValue = expected;
        }
        elementIndex++;
        continue;
      }

      // Encountered an element where a text node was expected
      if (domNode.nodeType === Node.ELEMENT_NODE) {
        const message =
          "[defuss] Hydration error: ELEMENT_NODE encountered where TEXT_NODE was expected for text content.";
        if (debug) {
          throw new Error(message);
        } else {
          console.warn(message);
          // Best effort: advance to keep indexes moving; hydration may drift
          elementIndex++;
          continue;
        }
      }
    }

    // Values that render nothing: do not consume a DOM node
    if (
      node === null ||
      typeof node === "undefined" ||
      typeof node === "boolean"
    ) {
      continue;
    }

    // find the next relevant DOM element
    while (
      elementIndex < parentElements.length &&
      parentElements[elementIndex].nodeType !== Node.ELEMENT_NODE
    ) {
      elementIndex++;
    }

    if (elementIndex >= parentElements.length && debug) {
      console.warn(
        "[defuss] Hydration warning: Not enough DOM elements to match VNodes.",
      );
      break;
    }

    const vnode = node as VNode;
    const element = parentElements[elementIndex] as HTMLElement;

    // update ref.current if ref is provided
    if (vnode.attributes!.ref) {
      vnode.attributes!.ref.current = element;
      element._defussRef = vnode.attributes!.ref; // store ref on element for later access
    }

    // attach event listeners
    for (const key of Object.keys(vnode.attributes!)) {
      if (key === "ref") continue; // don't override ref.current with [object Object] again

      // TODO: refactor: this maybe can be unified with isomorph render logic
      if (
        key.startsWith("on") &&
        typeof vnode.attributes![key] === "function"
      ) {
        let eventName = key.substring(2).toLowerCase();
        let capture = false;

        // check for specific suffixes to set event options
        if (eventName.endsWith("capture")) {
          capture = true;
          eventName = eventName.replace(/capture$/, "");
        }

        element.addEventListener(eventName, vnode.attributes![key], capture);
      }
    }

    // --- element lifecycle ---

    // TODO: this should be refactored to re-use logic in lifecycle.js!

    if (vnode?.attributes?.onUnmount) {
      observeUnmount(element, vnode.attributes.onUnmount);
    }

    // recursively hydrate children
    if (vnode?.children && vnode?.children?.length > 0) {
      hydrate(
        vnode.children as Array<VNode | string | null>,
        Array.from(element.childNodes),
      );
    }

    // call onMount if provided
    if (vnode?.attributes?.onMount) {
      // ensure onMount is a function
      vnode.attributes?.onMount?.(element);
    }
    elementIndex++;
  }

  // Optionally, warn if there are unmatched DOM elements
  if (elementIndex < parentElements.length && debug) {
    console.warn(
      "[defuss] Hydration warning: There are more DOM elements than VNodes.",
    );
  }
};

export * from "./index.js";

```

./src/render/dev/index.ts:
```
export * from "../../render/types.js";
export * from "../../render/isomorph.js";
export * from "../../render/ref.js";
export * from "../../render/transitions.js";

```

./src/render/index.ts:
```
export * from "../render/types.js";
export * from "../render/isomorph.js";
export * from "../render/ref.js";
export * from "../render/transitions.js";

```

./src/render/isomorph.ts:
```
import { isRef, type NodeType } from "../render/index.js";
import type {
  CallChainImpl,
  CallChainImplThenable,
  Dequery,
} from "../dequery/index.js";
import { isDequery } from "../dequery/index.js";
import type {
  VNodeChild,
  VNodeChildren,
  VNode,
  VNodeType,
  VNodeAttributes,
  DomAbstractionImpl,
  Globals,
  RenderInput,
  Ref,
  JsxSourceInfo,
} from "./types.js";
import {
  domNodeToVNode,
  htmlStringToVNodes,
  isMarkup,
  updateDomWithVdom,
} from "../common/dom.js";
import { waitForRef } from "defuss-runtime";
import { queueCallback } from "../common/queue.js";
import {
  performTransition,
  DEFAULT_TRANSITION_CONFIG,
  type TransitionConfig,
} from "./transitions.js";

export const CLASS_ATTRIBUTE_NAME = "class";
export const XLINK_ATTRIBUTE_NAME = "xlink";
export const XMLNS_ATTRIBUTE_NAME = "xmlns";
export const REF_ATTRIBUTE_NAME = "ref";
export const DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";

const nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: "http://www.w3.org/2000/xmlns/",
  [XLINK_ATTRIBUTE_NAME]: "http://www.w3.org/1999/xlink",
  svg: "http://www.w3.org/2000/svg",
};

declare global {
  var __defuss_document: Document;
  var __defuss_window: Window;
}

// If a JSX comment is written, it looks like: { /* this */ }
// Therefore, it turns into: {}, which is detected here
const isJSXComment = (node: VNode): boolean =>
  /* v8 ignore next */
  node &&
  typeof node === "object" &&
  !node.attributes &&
  !node.type &&
  !node.children;

// Filters comments and undefines like: ['a', 'b', false, {}] to: ['a', 'b', false]
const filterComments = (children: Array<VNode> | Array<VNodeChild>) =>
  children.filter((child: VNodeChild) => !isJSXComment(child as VNode));

export const createInPlaceErrorMessageVNode = (error: unknown) => ({
  type: "p",
  attributes: {},
  children: [`FATAL ERROR: ${(error as Error)?.message || error}`],
});

export type JsxRuntimeHookFn = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  sourceInfo?: JsxSourceInfo,
) => void;

export const jsx = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  sourceInfo?: JsxSourceInfo,
): Array<VNode> | VNode => {
  // clone attributes as well
  attributes = { ...attributes };

  if (typeof key !== "undefined") {
    /* key passed for instance-based lifecycle event listener registration */
    attributes.key = key;
  }

  // extract children from attributes and ensure it's always an array
  let children: Array<VNodeChild> = (
    attributes?.children ? [].concat(attributes.children) : []
  ).filter(Boolean);
  delete attributes?.children;

  children = filterComments(
    // Implementation to flatten virtual node children structures like:
    // [<p>1</p>, [<p>2</p>,<p>3</p>]] to: [<p>1</p>,<p>2</p>,<p>3</p>]
    ([] as Array<VNodeChildren>).concat.apply(
      [],
      children as any,
    ) as Array<VNodeChildren>,
  );

  // effectively unwrap by directly returning the children
  if (type === "fragment") {
    return filterComments(children) as Array<VNode>;
  }

  // it's a component, divide and conquer children
  // in case of async functions, we just pass them through
  if (typeof type === "function" && type.constructor.name !== "AsyncFunction") {
    try {
      return type({
        children,
        ...attributes,
      });
    } catch (error) {
      if (typeof error === "string") {
        error = `[JsxError] in ${type.name}: ${error}`;
      } else if (error instanceof Error) {
        error.message = `[JsxError] in ${type.name}: ${error.message}`;
      }

      // render the error in place
      return createInPlaceErrorMessageVNode(error);
    }
  }

  return {
    type,
    attributes,
    children,
    sourceInfo,
  } as VNode;
};

export const observeUnmount = (domNode: Node, onUnmount: () => void): void => {
  if (!domNode || typeof onUnmount !== "function") {
    throw new Error(
      "Invalid arguments. Ensure domNode and onUnmount are valid.",
    );
  }

  const parentNode = domNode.parentNode;
  if (!parentNode) {
    throw new Error("The provided domNode does not have a parentNode.");
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            onUnmount(); // Call the onUnmount function
            observer.disconnect(); // Stop observing after unmount
            return;
          }
        }
      }
    }
  });

  // Observe the parentNode for child removals
  observer.observe(parentNode, { childList: true });
};

/** lifecycle event attachment has been implemented separately, because it is also required to run when partially updating the DOM */
export const handleLifecycleEventsForOnMount = (newEl: HTMLElement) => {
  // check for a lifecycle "onMount" hook and call it
  if (typeof (newEl as any)?.$onMount === "function") {
    (newEl as any).$onMount!(); // remove the hook after it's been called
    (newEl as any).$onMount = null;
  }

  // optionally check for a element lifecycle "onUnmount" and hook it up
  if (typeof (newEl as any)?.$onUnmount === "function") {
    // register the unmount observer (MutationObserver)
    observeUnmount(newEl as HTMLElement, (newEl as any).$onUnmount!);
  }
};

export const getRenderer = (document: Document): DomAbstractionImpl => {
  // DOM abstraction layer for manipulation
  const renderer = {
    hasElNamespace: (domElement: Element | Document): boolean =>
      (domElement as Element).namespaceURI === nsMap.svg,

    hasSvgNamespace: (
      parentElement: Element | Document,
      type: string,
    ): boolean =>
      renderer.hasElNamespace(parentElement) &&
      type !== "STYLE" &&
      type !== "SCRIPT",

    createElementOrElements: (
      virtualNode: VNode | undefined | Array<VNode | undefined | string>,
      parentDomElement?: Element | Document,
    ): Array<Element | Text | undefined> | Element | Text | undefined => {
      if (Array.isArray(virtualNode)) {
        return renderer.createChildElements(virtualNode, parentDomElement);
      }
      if (typeof virtualNode !== "undefined") {
        return renderer.createElement(virtualNode, parentDomElement);
      }
      // undefined virtualNode -> e.g. when a tsx variable is used in markup which is undefined
      return renderer.createTextNode("", parentDomElement);
    },

    createElement: (
      virtualNode: VNode,
      parentDomElement?: Element | Document,
    ): Element | undefined => {
      let newEl: Element | undefined = undefined;

      try {
        // if a synchronous function is still a function, VDOM has obviously not resolved, probably an
        // Error occurred while generating the VDOM (in JSX runtime)
        if (virtualNode.constructor.name === "AsyncFunction") {
          newEl = document.createElement("div");
        } else if (typeof virtualNode.type === "function") {
          newEl = document.createElement("div");
          (newEl as HTMLElement).innerText =
            `FATAL ERROR: ${virtualNode.type._error}`;
        } else if (
          // SVG support
          virtualNode.type.toUpperCase() === "SVG" ||
          (parentDomElement &&
            renderer.hasSvgNamespace(
              parentDomElement,
              virtualNode.type.toUpperCase(),
            ))
        ) {
          // SVG support
          newEl = document.createElementNS(
            nsMap.svg,
            virtualNode.type as string,
          );
        } else {
          newEl = document.createElement(virtualNode.type as string);
        }

        if (virtualNode.attributes) {
          renderer.setAttributes(virtualNode, newEl as Element);

          // Apply dangerouslySetInnerHTML if provided
          if (virtualNode.attributes.dangerouslySetInnerHTML) {
            // Old: newEl.innerHTML = virtualNode.attributes.dangerouslySetInnerHTML.__html;
            // New: use updateDom to handle the innerHTML update
            updateDom(
              virtualNode.attributes.dangerouslySetInnerHTML.__html,
              [newEl],
              1000, // timeout in ms
              globalThis.DOMParser,
            );
          }
        }

        if (virtualNode.children) {
          renderer.createChildElements(virtualNode.children, newEl as Element);
        }

        if (parentDomElement) {
          parentDomElement.appendChild(newEl);
          handleLifecycleEventsForOnMount(newEl as HTMLElement);
        }
      } catch (e) {
        console.error(
          "Fatal error! Error happend while rendering the VDOM!",
          e,
          virtualNode,
        );
        throw e;
      }
      return newEl as Element;
    },

    createTextNode: (text: string, domElement?: Element | Document): Text => {
      const node = document.createTextNode(text.toString());

      if (domElement) {
        domElement.appendChild(node);
      }
      return node;
    },

    createChildElements: (
      virtualChildren: VNodeChildren,
      domElement?: Element | Document,
    ): Array<Element | Text | undefined> => {
      const children: Array<Element | Text | undefined> = [];

      for (let i = 0; i < virtualChildren.length; i++) {
        const virtualChild = virtualChildren[i];
        if (
          virtualChild === null ||
          (typeof virtualChild !== "object" &&
            typeof virtualChild !== "function")
        ) {
          children.push(
            renderer.createTextNode(
              (typeof virtualChild === "undefined" || virtualChild === null
                ? ""
                : virtualChild!
              ).toString(),
              domElement,
            ),
          );
        } else {
          children.push(
            renderer.createElement(virtualChild as VNode, domElement),
          );
        }
      }
      return children;
    },

    setAttribute: (
      name: string,
      value: any,
      domElement: Element,
      virtualNode: VNode<VNodeAttributes>,
    ) => {
      // attributes not set (undefined) are ignored; use null value to reset an attributes state
      if (typeof value === "undefined") return; // if not set, ignore

      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return; // special case, handled elsewhere

      // save ref as { current: DOMElement } in ref object
      // allows for ref={someRef}
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        value.current = domElement; // update ref
        (domElement as any)._defussRef = value; // store ref on element for later access
        // register an unmount handler to mark ref as orphaned when the element is removed from the DOM
        (domElement as any).$onUnmount = queueCallback(() => {
          // DISABLED: mark the ref as orphaned
          // value.orphan = true;
        });

        if (domElement.parentNode) {
          observeUnmount(domElement, (domElement as any).$onUnmount);
        } else {
          // If element doesn't have a parent yet, set it up after a microtask
          queueMicrotask(() => {
            if (domElement.parentNode) {
              observeUnmount(domElement, (domElement as any).$onUnmount);
            }
          });
        }
        return; // but do not render the ref as a string [object Object] into the DOM
      }

      if (name.startsWith("on") && typeof value === "function") {
        let eventName = name.substring(2).toLowerCase();
        const capturePos = eventName.indexOf("capture");
        const doCapture = capturePos > -1;

        if (eventName === "mount") {
          (domElement as any).$onMount = queueCallback(value); // DOM event lifecycle hook
        }

        if (eventName === "unmount") {
          if ((domElement as any).$onUnmount) {
            // chain multiple unmount handlers (when ref is used - see above)
            const existingUnmount = (domElement as any).$onUnmount;
            (domElement as any).$onUnmount = () => {
              existingUnmount();
              value();
            };
          } else {
            (domElement as any).$onUnmount = queueCallback(value); // DOM event lifecycle hook
          }
        }

        // onClickCapture={...} support
        if (doCapture) {
          eventName = eventName.substring(0, capturePos);
        }
        domElement.addEventListener(eventName, value, doCapture);
        return;
      }

      // transforms className="..." -> class="..."
      // allows for React JSX to work seamlessly
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }

      // transforms class={['a', 'b']} into class="a b"
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.join(" ");
      }

      // SVG support
      const nsEndIndex = name.match(/[A-Z]/)?.index;
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase();
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
        const namespace = nsMap[ns as keyof typeof nsMap] || null;
        domElement.setAttributeNS(
          namespace,
          ns === XLINK_ATTRIBUTE_NAME || ns === "xmlns"
            ? `${ns}:${attrName}`
            : name,
          value,
        );
      } else if (name === "style" && typeof value !== "string") {
        const propNames = Object.keys(value);

        // allows for style={{ margin: 10 }} etc.
        for (let i = 0; i < propNames.length; i++) {
          (domElement as HTMLElement).style[propNames[i] as any] =
            value[propNames[i]];
        }
      } else if (typeof value === "boolean") {
        // for cases like <button checked={false} />
        (domElement as any)[name] = value;
      } else {
        // for any other case
        domElement.setAttribute(name, value);
      }
    },

    setAttributes: (
      virtualNode: VNode<VNodeAttributes>,
      domElement: Element,
    ) => {
      const attrNames = Object.keys(virtualNode.attributes!);
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(
          attrNames[i],
          virtualNode.attributes![attrNames[i]],
          domElement,
          virtualNode,
        );
      }
    },
  };
  return renderer;
};

export type SyncRenderInput =
  | VNode
  | undefined
  | string
  | Array<VNode | undefined | string>;
export type ParentElementInput =
  | Element
  | Document
  | Dequery<NodeType>
  | undefined;
export type SyncRenderResult =
  | Array<Element | Text | undefined>
  | Element
  | Text
  | undefined;

export const renderIsomorphicSync = (
  virtualNode: SyncRenderInput,
  parentDomElement: ParentElementInput,
  globals: Globals,
): SyncRenderResult => {
  if (isDequery(parentDomElement)) {
    parentDomElement =
      ((
        parentDomElement as Dequery<NodeType>
      ).getFirstElement() as unknown as Element) || parentDomElement;
  }

  let renderResult: SyncRenderResult;

  if (typeof virtualNode === "string") {
    renderResult = getRenderer(globals.window.document).createTextNode(
      virtualNode,
      parentDomElement,
    );
  } else {
    renderResult = getRenderer(globals.window.document).createElementOrElements(
      virtualNode,
      parentDomElement,
    );
  }
  return renderResult;
};

export type ParentElementInputAsync =
  | ParentElementInput
  | Dequery<NodeType>
  | Promise<ParentElementInput | Dequery<NodeType>>;

export const renderIsomorphicAsync = async (
  virtualNode: SyncRenderInput | Promise<SyncRenderInput>,
  parentDomElement: ParentElementInputAsync,
  globals: Globals,
): Promise<SyncRenderResult> => {
  if (parentDomElement instanceof Promise) {
    parentDomElement = (await parentDomElement) as
      | ParentElementInput
      | Dequery<NodeType>;
  }

  if (isDequery(parentDomElement)) {
    // awaits the dequery chain to resolve or fail, then renders the VDOM
    parentDomElement = (
      await (parentDomElement as Dequery<NodeType>).toArray()
    )[0] as Element;
  }

  if (virtualNode instanceof Promise) {
    virtualNode = await virtualNode;
  }
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement as ParentElementInput,
    globals,
  );
};

export const globalScopeDomApis = (window: Window, document: Document) => {
  globalThis.__defuss_document = document;
  globalThis.__defuss_window = window;
};

export const isJSX = (o: any): boolean => {
  if (o === null || typeof o !== "object") return false;
  if (Array.isArray(o)) return o.every(isJSX);
  if (typeof o.type === "string") return true;
  if (typeof o.type === "function") return true;
  if (typeof o.attributes === "object" && typeof o.children === "object")
    return true;
  return false;
};

// --- JSX standard (necessary exports for jsx-runtime)
export const Fragment = (props: VNode) => props.children;
export const jsxs = jsx;
export const jsxDEV = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
  allChildrenAreStatic?: boolean,
  sourceInfo?: JsxSourceInfo,
  selfReference?: any,
): Array<VNode> | VNode => {
  let renderResult: Array<VNode> | VNode;
  try {
    if (sourceInfo) {
      if (
        typeof type === "function" &&
        type.constructor.name !== "AsyncFunction"
      ) {
        // attach sourceInfo to function components for better error messages and for automatic hydration
        sourceInfo.exportName = type.name || sourceInfo?.exportName;
      }
      sourceInfo.allChildrenAreStatic = allChildrenAreStatic;
      sourceInfo.selfReference = selfReference;
    }
    renderResult = jsx(type, attributes, key, sourceInfo);
  } catch (error) {
    console.error(
      "JSX error:",
      error,
      "in",
      sourceInfo,
      "component",
      selfReference,
    );
  }
  return renderResult!;
};

/**
 * Helper function to perform the actual DOM update without transitions
 */
async function performCoreDomUpdate<NT>(
  input:
    | string
    | RenderInput
    | Ref<NodeType>
    | NodeType
    | CallChainImpl<NT>
    | CallChainImplThenable<NT>,
  nodes: readonly NodeType[],
  timeout: number,
  Parser: typeof globalThis.DOMParser,
): Promise<void> {
  let processedInput = input;

  if (isDequery(processedInput)) {
    processedInput = (processedInput as any)[0] as HTMLElement;
  }

  if (isRef(processedInput)) {
    await waitForRef(processedInput as Ref<NodeType>, timeout);
    processedInput = (processedInput as Ref<NodeType>).current;
  }

  if (processedInput instanceof Node) {
    // Convert DOM node to VNode and use the intelligent updateDomWithVdom
    // This preserves existing DOM structure and event listeners
    const vnode = domNodeToVNode(processedInput);
    nodes.forEach((el) => {
      if (el) {
        updateDomWithVdom(el as HTMLElement, vnode, globalThis as Globals);
      }
    });
    return;
  }

  if (typeof processedInput === "string") {
    if (isMarkup(processedInput, Parser)) {
      // Convert HTML markup to VNodes and use intelligent updateDomWithVdom
      // This provides better DOM state preservation than the older updateDom approach
      const vNodes = htmlStringToVNodes(processedInput, Parser);
      nodes.forEach((el) => {
        if (el) {
          updateDomWithVdom(el as HTMLElement, vNodes, globalThis as Globals);
        }
      });
    } else {
      // For plain text, use the more efficient updateDomWithVdom approach
      // This preserves existing DOM structure where possible
      nodes.forEach((el) => {
        if (el) {
          updateDomWithVdom(
            el as HTMLElement,
            processedInput as string,
            globalThis as Globals,
          );
        }
      });
    }
  } else if (isJSX(processedInput)) {
    // Use the intelligent updateDomWithVdom for JSX
    // This function performs partial updates, preserving existing DOM elements
    // and only updating what has actually changed
    nodes.forEach((el) => {
      if (el) {
        updateDomWithVdom(
          el as HTMLElement,
          processedInput as RenderInput,
          globalThis as Globals,
        );
      }
    });
  } else {
    console.warn("update: unsupported content type", processedInput);
  }
}

export async function updateDom<NT>(
  input:
    | string
    | RenderInput
    | Ref<NodeType>
    | NodeType
    | CallChainImpl<NT>
    | CallChainImplThenable<NT>,
  nodes: readonly NodeType[],
  timeout: number,
  Parser: typeof globalThis.DOMParser,
  transitionConfig?: TransitionConfig,
): Promise<readonly NodeType[]> {
  // Handle transitions if configuration is provided
  if (transitionConfig && transitionConfig.type !== "none") {
    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transitionConfig };
    const { target = "self" } = config;

    const transitionPromises = nodes.map(async (node) => {
      if (!node) return node;

      const element = node as HTMLElement;
      const transitionTarget =
        target === "self" ? element : element.parentElement;

      if (!transitionTarget) {
        await performCoreDomUpdate(input, [node], timeout, Parser);
        return node;
      }

      await performTransition(
        transitionTarget,
        () => performCoreDomUpdate(input, [node], timeout, Parser),
        config,
      );
      return node;
    });

    await Promise.all(transitionPromises);
    return nodes;
  }

  // No transitions - perform regular update
  await performCoreDomUpdate(input, nodes, timeout, Parser);
  return nodes;
}

export default {
  jsx,
  Fragment,
  renderIsomorphic: renderIsomorphicSync,
  getRenderer,

  // implementing the full standard
  // https://github.com/reactjs/rfcs/blob/createlement-rfc/text/0000-create-element-changes.md
  jsxs,
  jsxDEV,
};

```

./src/render/ref.ts:
```
import type { PersistenceProviderType } from "../webstorage/index.js";
import { $ } from "../dequery/dequery.js";
import type {
  NodeType,
  Ref,
  RefUpdateFn,
  RefUpdateRenderFnInput,
} from "../render/types.js";
import { createStore } from "../store/store.js";

export const isRef = <
  ST = any,
  NT extends Node | Element | Text | null = HTMLElement,
>(
  obj: any,
): obj is Ref<ST, NT> =>
  Boolean(obj && typeof obj === "object" && "current" in obj);

export function createRef<
  ST = any,
  NT extends Node | Element | Text | null = HTMLElement,
>(refUpdateFn?: RefUpdateFn<ST>, defaultState?: ST): Ref<ST, NT> {
  const stateStore = createStore<ST>(defaultState as ST);

  const ref: Ref<ST, NT> = {
    current: null as NT,
    store: stateStore,
    get state() {
      return stateStore.value;
    },
    set state(value: ST) {
      stateStore.set(value);
    },
    persist: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.persist(key, provider);
    },
    restore: (key: string, provider: PersistenceProviderType = "local") => {
      stateStore.restore(key, provider);
    },
    updateState: (state: ST) => {
      stateStore.set(state);
    },
    update: async (input: RefUpdateRenderFnInput) =>
      await $<NodeType>(ref.current).update(input),
    subscribe: (refUpdateFn: RefUpdateFn<ST>) =>
      stateStore.subscribe(refUpdateFn),
  };

  if (typeof refUpdateFn === "function") {
    ref.subscribe(refUpdateFn);
  }
  return ref;
}

```

./src/render/server.ts:
```
import * as HappyDom from "happy-dom";
import {
  renderIsomorphicSync,
  renderIsomorphicAsync,
  globalScopeDomApis,
  type ParentElementInput,
  type ParentElementInputAsync,
} from "./isomorph.js";
import type { RenderInput, RenderResult, Globals } from "./types.js";
import serializeHtml from "w3c-xmlserializer";

export interface RenderOptions {
  /** choose an arbitrary server-side DOM / Document implementation; this library defaults to 'linkedom'; default: undefined */
  browserGlobals?: Globals;

  /** creates a synthetic <html> root element in case you want to render in isolation; default: false; also happens when parentDomElement isn't present */
  createRoot?: boolean;
}

const setupDomApis = (options: RenderOptions = {}) => {
  const browserGlobals = options.browserGlobals
    ? options.browserGlobals
    : getBrowserGlobals();
  const document = getDocument(options.createRoot, browserGlobals);
  globalScopeDomApis(browserGlobals, document);
  return { browserGlobals, document };
};

export const renderSync = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement?: ParentElementInput,
  options: RenderOptions = {},
): RenderResult<T> => {
  const { browserGlobals, document } = setupDomApis(options);
  if (!parentDomElement) {
    parentDomElement = document.documentElement;
  }
  return renderIsomorphicSync(
    virtualNode,
    parentDomElement,
    browserGlobals,
  ) as any;
};

export const render = <T extends RenderInput>(
  virtualNode: T,
  parentDomElement?: ParentElementInputAsync | any,
  options: RenderOptions = {},
): Promise<RenderResult<T>> => {
  const { browserGlobals, document } = setupDomApis(options);
  if (!parentDomElement) {
    parentDomElement = document.documentElement;
  }
  return renderIsomorphicAsync(
    virtualNode,
    parentDomElement,
    browserGlobals,
  ) as any;
};

export const createRoot = (document: Document): Element => {
  const htmlElement = document.createElement("html");
  document.appendChild(htmlElement);
  return document.documentElement;
};

export const getBrowserGlobals = (): Globals => {
  return new HappyDom.Window({
    url: "http://localhost/",
  }) as unknown as Globals;
};

export const getDocument = (
  shouldCreateRoot = false,
  browserGlobals?: Globals,
): Document => {
  const document = (browserGlobals || getBrowserGlobals()).document;
  if (shouldCreateRoot) {
    createRoot(document);
    return document;
  }
  return document;
};

export const renderToString = (el: Node) =>
  serializeHtml(el).replaceAll(' xmlns="http://www.w3.org/1999/xhtml"', "");

export * from "./index.js";

```

./src/render/transitions.ts:
```
export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "shake"
  | "none";

export interface TransitionStyles {
  enter: Record<string, string>;
  enterActive: Record<string, string>;
  exit: Record<string, string>;
  exitActive: Record<string, string>;
}

export type TransitionsEasing =
  | "linear"
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  | "step-start"
  | "step-end";

export interface TransitionConfig {
  type?: TransitionType;
  styles?: TransitionStyles;
  duration?: number;
  easing?: TransitionsEasing | string;
  delay?: number;
  target?: "parent" | "self";
}

const injectShakeKeyframes = () => {
  if (!document.getElementById("defuss-shake")) {
    const style = document.createElement("style");
    style.id = "defuss-shake";
    style.textContent =
      "@keyframes shake{0%,100%{transform:translate3d(0,0,0)}10%,30%,50%,70%,90%{transform:translate3d(-10px,0,0)}20%,40%,60%,80%{transform:translate3d(10px,0,0)}}";
    document.head.appendChild(style);
  }
};

export const getTransitionStyles = (
  type: TransitionType,
  duration: number,
  easing = "ease-in-out",
): TransitionStyles => {
  const t = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
  const styles: Record<string, TransitionStyles> = {
    fade: {
      enter: { opacity: "0", transition: t, transform: "translate3d(0,0,0)" },
      enterActive: { opacity: "1" },
      exit: { opacity: "1", transition: t, transform: "translate3d(0,0,0)" },
      exitActive: { opacity: "0" },
    },
    "slide-left": {
      enter: {
        transform: "translate3d(100%,0,0)",
        opacity: "0.5",
        transition: t,
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(-100%,0,0)", opacity: "0.5" },
    },
    "slide-right": {
      enter: {
        transform: "translate3d(-100%,0,0)",
        opacity: "0.5",
        transition: t,
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(100%,0,0)", opacity: "0.5" },
    },
    shake: (() => {
      injectShakeKeyframes();
      return {
        enter: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none",
        },
        enterActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`,
        },
        exit: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none",
        },
        exitActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`,
        },
      };
    })(),
  };
  return (
    styles[type] || { enter: {}, enterActive: {}, exit: {}, exitActive: {} }
  );
};

export const applyStyles = (
  el: HTMLElement,
  styles: Record<string, string | number>,
) =>
  Object.entries(styles).forEach(([k, v]) =>
    el.style.setProperty(k, String(v)),
  );

export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
  target: "parent",
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const performCrossfade = async (
  element: HTMLElement,
  updateCallback: () => Promise<void>,
  duration: number,
  easing: string,
): Promise<void> => {
  const originalStyle = element.style.cssText;
  const snapshot = element.cloneNode(true) as HTMLElement;

  try {
    // Set up container for crossfade
    const container = element.parentElement || element;
    const rect = element.getBoundingClientRect();

    // Position snapshot absolutely over original
    snapshot.style.cssText = `position:absolute;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:1;transition:opacity ${duration}ms ${easing};z-index:1000;`;

    // Prepare new content (initially hidden)
    element.style.opacity = "0";
    element.style.transition = `opacity ${duration}ms ${easing}`;

    // Insert snapshot and update content
    document.body.appendChild(snapshot);
    await updateCallback();

    // Trigger simultaneous crossfade
    void element.offsetHeight;
    snapshot.style.opacity = "0";
    element.style.opacity = "1";

    await wait(duration);
    document.body.removeChild(snapshot);
  } catch (error) {
    if (snapshot.parentElement) document.body.removeChild(snapshot);
    throw error;
  } finally {
    element.style.cssText = originalStyle;
  }
};

export const performTransition = async (
  element: HTMLElement,
  updateCallback: () => Promise<void>,
  config: TransitionConfig = {},
): Promise<void> => {
  const {
    type = "fade",
    duration = 300,
    easing = "ease-in-out",
    delay = 0,
  } = { ...DEFAULT_TRANSITION_CONFIG, ...config };

  if (type === "none") {
    await updateCallback();
    return;
  }

  if (delay > 0) await wait(delay);

  // Use crossfade for fade transitions
  if (type === "fade") {
    await performCrossfade(element, updateCallback, duration, easing);
    return;
  }

  const styles = config.styles || getTransitionStyles(type, duration, easing);
  const originalTransition = element.style.transition;
  const originalAnimation = element.style.animation;

  try {
    // Clear any existing animation for shake restart
    if (type === "shake") {
      element.style.animation = "none";
      void element.offsetHeight;
    }

    // Apply exit transition
    applyStyles(element, styles.exit);
    void element.offsetHeight;
    applyStyles(element, styles.exitActive);

    await wait(duration);

    // Update content
    await updateCallback();

    // Apply enter transition
    applyStyles(element, styles.enter);
    void element.offsetHeight;
    applyStyles(element, styles.enterActive);

    await wait(duration);

    // Restore original styles
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
  } catch (error) {
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
    throw error;
  }
};

```

./src/render/types.ts:
```
import type { PersistenceProviderType } from "../webstorage/index.js";
import type { CallChainImpl, Dequery } from "../dequery/dequery.js";
import type { Store } from "../store/store.js";
import type * as CSS from "csstype";

export type * as CSS from "csstype";

export type Globals = Performance & Window & typeof globalThis;

declare global {
  interface HTMLElement {
    _defussRef?: Ref;
  }
}

// --- Types & Helpers ---
export type NodeType =
  | Node
  | Text
  | Element
  | Document
  | DocumentFragment
  | HTMLElement
  | SVGElement
  | null;


export type RefUpdateRenderFnInput =
  | string
  | RenderInput
  | NodeType
  | Dequery<NodeType>;
export type RefUpdateFn<ST> = (state: ST) => void;
export type RefUpdateRenderFn = (
  input: RefUpdateRenderFnInput,
) => Promise<CallChainImpl<NodeType>>;

export interface Ref<ST = any, NT = null | Node | Element | Text> {
  orphan?: boolean;
  current: NT;
  store?: Store<ST>;
  state?: ST;
  update: RefUpdateRenderFn;
  updateState: RefUpdateFn<ST>;
  subscribe: (
    refUpdateFn: RefUpdateFn<ST>,
  ) => /* unsubscribe function */ () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

//export type VRef = (el: Element) => void

export interface VAttributes {
  // typing; detect ref
  ref?: Ref;

  // array-local unique key to identify element items in a NodeList
  key?: string;
}

export interface VNodeAttributes extends VAttributes {
  [attributeName: string]: any;
  key?: string;
}

export interface JsxSourceInfo {
  fileName: string;
  lineNumber: number;
  columnNumber: number;
  exportName?: string;
  allChildrenAreStatic?: boolean;
  selfReference?: boolean;
}

export interface VNode<A = VNodeAttributes> {
  type?: VNodeType;
  attributes?: A;
  children?: VNodeChildren;
  sourceInfo?: JsxSourceInfo;
}

// string as in "div" creates an HTMLElement in the renderer
// function as in functional component is called to return a VDOM object
export type VNodeType = string | Function | any;
export type VNodeKey = string | number | any;
export type VNodeRefObject<T> = { current?: T | null };
export type VNodeRefCallback<T> = (instance: T | null) => void;
export type VNodeRef<T> = VNodeRefObject<T> | VNodeRefCallback<T>;
export type VNodeChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;
export type VNodeChildren = VNodeChild[];

// simple types for declaring children and props
export type Children = VNodeChildren;

export interface DomAbstractionImpl {
  hasElNamespace(domElement: Element): boolean;

  hasSvgNamespace(parentElement: Element, type: string): boolean;

  createElementOrElements(
    virtualNode: VNode | undefined | Array<VNode | undefined | string>,
    parentDomElement?: Element | Document,
  ): Array<Element | Text | undefined> | Element | Text | undefined;

  createElement(
    virtualNode: VNode | undefined,
    parentDomElement?: Element | Document,
  ): Element | undefined;

  createTextNode(text: string, parentDomElement?: Element | Document): Text;

  createChildElements(
    virtualChildren: VNodeChildren,
    parentDomElement?: Element,
  ): Array<Element | Text | undefined>;

  setAttribute(
    name: string,
    value: any,
    parentDomElement: Element,
    attributes: VNodeAttributes,
  ): void;

  setAttributes(
    attributes: VNode<VNodeAttributes>,
    parentDomElement: Element,
  ): void;
}

declare global {
  namespace JSX {
    interface ElementAttributesProperty {
      attrs: {};
    }

    export interface DOMAttributeEventHandlersLowerCase {
      // defuss custom elment lifecycle events
      onmount?: Function;
      onunmount?: Function;

    }

    export interface DOMAttributes
      extends VAttributes,
        DOMAttributeEventHandlersLowerCase {
      // defuss custom attributes
      ref?: Ref /*| VRef*/;

      // defuss custom element lifecycle events
      onMount?: Function;
      onUnmount?: Function;

    }

    export interface HTMLAttributesLowerCase {
      ref?: Ref; // | VRef

      dangerouslysetinnerhtml?: {
        __html: string;
      };

    }

    export interface HTMLAttributes
      extends HTMLAttributesLowerCase,
        DOMAttributes {
      ref?: Ref; // | VRef

      dangerouslySetInnerHTML?: {
        __html: string;
      };

    }

    export interface IVirtualIntrinsicElements {
      // some-custom-element-name: HTMLAttributes;
    }

    export interface IntrinsicElements extends IVirtualIntrinsicElements {
    
    }

    interface IntrinsicElements {
      // will be deleted by tsx factory
      fragment: {};
    }
  }
}

export type RenderNodeInput = VNode | string | undefined;
export type RenderInput = RenderNodeInput | Array<RenderNodeInput>;
export type RenderResultNode = Element | Text | undefined;

export interface Props {
  children?: VNodeChild | VNodeChildren;

  // allow for forwardRef
  ref?: Ref;

  // array-local unique key to identify element items in a NodeList
  key?: string;

  // optional callback handler for errors (can be called inside of the component, to pass errors up to the parent)
  onError?: (error: unknown) => void;
}

export type RenderResult<T = RenderInput> = T extends Array<RenderNodeInput>
  ? Array<RenderResultNode>
  : RenderResultNode;

export type AllHTMLElements = HTMLElement &
  HTMLAnchorElement &
  HTMLAreaElement &
  HTMLAudioElement &
  HTMLBaseElement &
  HTMLBodyElement &
  HTMLBRElement &
  HTMLButtonElement &
  HTMLCanvasElement &
  HTMLDataElement &
  HTMLDataListElement &
  HTMLDetailsElement &
  HTMLDialogElement &
  HTMLDivElement &
  HTMLDListElement &
  HTMLEmbedElement &
  HTMLFieldSetElement &
  HTMLFormElement &
  HTMLHeadingElement &
  HTMLHeadElement &
  HTMLHtmlElement &
  HTMLHRElement &
  HTMLIFrameElement &
  HTMLImageElement &
  HTMLInputElement &
  HTMLLabelElement &
  HTMLLegendElement &
  HTMLLIElement &
  HTMLLinkElement &
  HTMLMapElement &
  HTMLMenuElement &
  HTMLMetaElement &
  HTMLMeterElement &
  HTMLModElement &
  HTMLOListElement &
  HTMLObjectElement &
  HTMLOptGroupElement &
  HTMLOptionElement &
  HTMLOutputElement &
  HTMLParagraphElement &
  HTMLPictureElement &
  HTMLPreElement &
  HTMLProgressElement &
  HTMLQuoteElement &
  HTMLScriptElement &
  HTMLSelectElement &
  HTMLSlotElement &
  HTMLSourceElement &
  HTMLSpanElement &
  HTMLStyleElement &
  HTMLTableCaptionElement &
  HTMLTableCellElement &
  HTMLTableColElement &
  HTMLTableElement &
  HTMLTableRowElement &
  HTMLTableSectionElement &
  HTMLTemplateElement &
  HTMLTextAreaElement &
  HTMLTimeElement &
  HTMLTitleElement &
  HTMLTrackElement &
  HTMLUListElement &
  HTMLUnknownElement &
  HTMLVideoElement &
  // deprecated / legacy:
  HTMLParamElement &
  HTMLFontElement &
  HTMLMarqueeElement &
  HTMLTableDataCellElement &
  HTMLTableHeaderCellElement;

```

./src/store/index.ts:
```
export * from "./store.js";

```

./src/store/store.ts:
```
import { getByPath, setByPath } from "defuss-runtime";
import {
  webstorage,
  type PersistenceProviderImpl,
  type PersistenceProviderType,
} from "../webstorage/index.js";

export type Listener<T> = (
  newValue: T,
  oldValue?: T,
  changedKey?: string,
) => void;

export interface Store<T> {
  value: T;
  get: <D = T>(path?: string) => D;
  set: <D = T>(pathOrValue: string | D, value?: D) => void;
  subscribe: (listener: Listener<T>) => () => void;
  persist: (key: string, provider?: PersistenceProviderType) => void;
  restore: (key: string, provider?: PersistenceProviderType) => void;
}

export const createStore = <T>(initialValue: T): Store<T> => {
  let value: T = initialValue; // internal state
  const listeners: Array<Listener<T>> = [];

  const notify = (oldValue: T, changedKey?: string) => {
    listeners.forEach((listener) => listener(value, oldValue, changedKey));
  };

  let storage: PersistenceProviderImpl<T> | null = null;
  let storageKey: string | null = null;
  let storageProvider: PersistenceProviderType | undefined;

  const initStorage = (provider?: PersistenceProviderType) => {
    if (!storage || storageProvider !== provider) {
      storage = webstorage<T>(provider);
      storageProvider = provider;
    }
    return storage;
  };

  const persistToStorage = () => {
    if (storage && storageKey) {
      storage.set(storageKey, value);
    }
  };

  return {
    // allow reading value but prevent external mutation
    get value() {
      return value;
    },
    persist(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      persistToStorage();
    },
    restore(key: string, provider: PersistenceProviderType = "local") {
      storage = initStorage(provider);
      storageKey = key;
      const storedValue = storage.get(key, value);

      // Deep equality comparison would be better here, but for now use JSON comparison
      const valueAsString = JSON.stringify(value);
      const storedValueAsString = JSON.stringify(storedValue);

      if (valueAsString !== storedValueAsString) {
        value = storedValue;
        notify(value);
      }
    },
    get(path?: string) {
      return path ? getByPath(value, path) : value;
    },
    set(pathOrValue: string | any, newValue?: any) {
      const oldValue = value;

      if (newValue === undefined) {
        // replace entire store value
        const valueAsString = JSON.stringify(value);
        const newValueAsString = JSON.stringify(pathOrValue);

        if (valueAsString !== newValueAsString) {
          value = pathOrValue;
          notify(oldValue);
          persistToStorage();
        }
      } else {
        // update a specific path
        const updatedValue = setByPath(value, pathOrValue, newValue);
        const updatedValueAsString = JSON.stringify(updatedValue);
        const oldValueAsString = JSON.stringify(oldValue);

        if (oldValueAsString !== updatedValueAsString) {
          value = updatedValue;
          notify(oldValue, pathOrValue);
          persistToStorage();
        }
      }
    },

    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    },
  };
};

```

./src/webstorage/client/index.ts:
```
import { WebStorageProvider } from "../isomporphic/memory.js";
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "../types.js";

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  provider: PersistenceProviderType,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  switch (provider) {
    case "session":
      return new WebStorageProvider<T>(window.sessionStorage);
    case "local":
      return new WebStorageProvider<T>(window.localStorage);
  }
  return new WebStorageProvider<T>(); // memory
};

```

./src/webstorage/index.ts:
```
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "./types.js";
import { getPersistenceProvider as getPersistenceProviderClient } from "./client/index.js";
import { getPersistenceProvider as getPersistenceProviderServer } from "./server/index.js";
import { isServer } from "./runtime.js";

export type {
  PersistenceProviderType,
  PersistenceProviderOptions,
} from "./types.js";

/** returns the persistence provider (isomorphic) */
export const webstorage = <T>(
  provider: PersistenceProviderType = "local",
  options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  if (isServer()) {
    return getPersistenceProviderServer(provider, options);
  } else {
    return getPersistenceProviderClient(provider, options);
  }
};

export * from "./types.js";

```

./src/webstorage/isomporphic/generic.ts:
```
/** The web storage API with a generic twist */
export interface GenericLocalStorage<T> {
  /**
   * Removes all key/value pairs, if there are any.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  clear(): void;

  /** Returns the current value associated with the given key, or null if the given key does not exist. */
  getItem(key: string): T | null;

  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  removeItem(key: string): void;

  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair if none existed for key previously.
   *
   * Throws a "QuotaExceededError" DOMException exception if the new value couldn't be set. (Setting could fail if, e.g., the user has disabled storage for the site, or if the quota has been exceeded.)
   *
   * Dispatches a storage event on Window objects holding an equivalent Storage object.
   */
  setItem(key: string, value: T): void;
}

```

./src/webstorage/isomporphic/index.ts:
```
export * from "./memory.js";
export * from "./generic.js";

```

./src/webstorage/isomporphic/memory.ts:
```
import type { PersistenceProviderImpl } from "../types.js";
import type { GenericLocalStorage } from "./generic.js";
import type { MiddlewareFn } from "../types.js";

export type MemoryProviderOptions = {};

export const newInMemoryGenericStorageBackend = <
  T = string,
>(): GenericLocalStorage<T> => {
  const cache = new Map<string, T>();
  return {
    clear: (): void => {
      cache.clear();
    },

    getItem: (key: string): T | null => {
      return cache.get(String(key)) ?? null;
    },

    removeItem: (key: string): void => {
      cache.delete(String(key));
    },

    setItem: (key: string, value: T): void => {
      cache.set(String(key), value);
    },
  };
};

/** global in-memory storage backend */
export const memory = newInMemoryGenericStorageBackend();

/** a simple, serverless and high-performance key/value storage engine  */
export class WebStorageProvider<T> implements PersistenceProviderImpl<T> {
  protected storage: GenericLocalStorage<string>;

  constructor(storage?: GenericLocalStorage<string>) {
    this.storage = storage || memory;
  }

  get(key: string, defaultValue: T, middlewareFn?: MiddlewareFn<T>): T {
    const rawValue = this.storage.getItem(key);

    if (rawValue === null) return defaultValue;

    let value: T = JSON.parse(rawValue);

    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    return value;
  }

  set(key: string, value: T, middlewareFn?: MiddlewareFn<T>): void {
    if (middlewareFn) {
      value = middlewareFn(key, value);
    }
    this.storage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    this.storage.removeItem(key);
  }

  removeAll(): void {
    this.storage.clear();
  }

  get backendApi(): GenericLocalStorage<string> {
    return this.storage;
  }
}

export interface MemoryStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Omit<Omit<Storage, "key">, "length">;
}

export interface WebStorage<T> extends PersistenceProviderImpl<T> {
  backendApi: Storage;
}

```

./src/webstorage/runtime.ts:
```
//export const isBrowser = (): boolean => typeof window !== "undefined" && typeof window.document !== "undefined";

export const isServer = (): boolean =>
  typeof window === "undefined" || typeof window.document === "undefined";

//export const isWebWorker = (): boolean => typeof self === "object" && self.constructor?.name === "DedicatedWorkerGlobalScope";

```

./src/webstorage/server/index.ts:
```
import { WebStorageProvider } from "../isomporphic/memory.js";
import type {
  PersistenceProviderType,
  PersistenceProviderImpl,
  PersistenceProviderOptions,
} from "../types.js";

/** returns the default persistence provider for each runtime environment */
export const getPersistenceProvider = <T>(
  _provider: PersistenceProviderType,
  _options?: PersistenceProviderOptions,
): PersistenceProviderImpl<T> => {
  return new WebStorageProvider<T>();
};

```

./src/webstorage/types.ts:
```
import type { MemoryProviderOptions } from "./isomporphic/memory.js";

export type MiddlewareFn<T> = (key: string, value: T) => T;

/** a simple key/value persistence interface */
export interface PersistenceProviderImpl<T> {
  get: (key: string, defaultValue: T, middlewareFn?: MiddlewareFn<T>) => T;
  set: (key: string, value: T, middlewareFn?: MiddlewareFn<T>) => void;
  remove: (key: string) => void;
  removeAll: () => void;
  backendApi: any;
}

export type PersistenceProviderType = "session" | "local" | "memory";

export type PersistenceProviderOptions = MemoryProviderOptions;

export type { MemoryStorage, WebStorage } from "./isomporphic/memory.js";

```

./tsconfig.json:
```
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["vitest/globals"],
    "jsx": "react-jsx",
    "jsxImportSource": "defuss",
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

```

./vitest.config.ts:
```
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    environment: "happy-dom",
    testTimeout: 290000, // 290 seconds per test
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    clearMocks: true,
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*"],
      ignoreEmptyLines: true,
    },
  },
});

```


</full-context-dump>

ANALYSIS:

# **Architectural Analysis and Optimization of Implicit DOM Morphing Frameworks**

## **Executive Summary**

The contemporary web development landscape is characterized by a dichotomy between heavy, state-driven frameworks that abstract the Document Object Model (DOM) behind Virtual DOM (VDOM) layers, and lightweight, imperative libraries that manipulate the browser directly. The framework analysis requested concerns a system attempting to bridge this divide: a "Neo-Classic" synthesis aiming for the intuitive, chainable API of jQuery combined with the stability and performance of modern rendering techniques. The current implementation, however, suffers from critical architectural failures, specifically the dissociation of JavaScript references from the active DOM, the proliferation of orphan event listeners, and the destructive loss of ephemeral user state during updates.

This report provides an exhaustive, 15,000-word analysis of these pathologies. We establish that the reported .update() failures are not merely bugs but symptoms of a fundamental misalignment between the framework's update strategy (likely destructive innerHTML replacement) and the browser’s object identity model. The "Zombie View" phenomenon—where updates apply to detached memory references rather than visible elements—is deconstructed through the lens of browser engine mechanics (V8/SpiderMonkey). Similarly, the event listener instability is identified as a structural flaw in lifecycle management, necessitating a paradigm shift from local binding to **Global Event Delegation**.

The proposed remediation outlines a comprehensive architectural overhaul. We introduce **FluxDOM** (a nomenclature for the proposed solution), a system that retains the desired implicit, jQuery-like API ($(ref).update()) but replaces the underlying rendering engine with a **State-Preserving Morphing Algorithm**. By leveraging heuristic strategies from morphdom, idiomorph, and nanomorph, combined with a lightweight VNode structure for diffing, the system can achieve implicit updates that preserve focus, selection, and scroll state. This report details the algorithmic complexity, memory management strategies, and API design required to construct this stable, high-performance tool, ensuring technical soundness while adhering to the "small framework" ethos.

## ---

**1\. The Pathology of Destructive Rendering**

To engineer a robust solution, we must first perform a rigorous forensic analysis of the current framework's failure modes. The user reports three distinct but interconnected symptoms: the failure of the .update() method to reflect changes on screen (despite executing without error), the loss of DOM state (focus, selection), and the accumulation of memory leaks and errors related to event listeners. These are the classic signatures of **Destructive Rendering**.

### **1.1 The Identity Discontinuity Problem**

The most severe issue reported is that calling .update() on a stored reference (e.g., $(ref).update()) fails to update the visible application or results in a complete re-creation of the element. This behavior indicates that the framework is likely using a naive "replace" strategy, such as setting innerHTML or using replaceWith on the root node of a component during an update cycle.

In the context of the JavaScript runtime and the browser's C++ DOM bindings, a variable in JavaScript holding a DOM node is a pointer to a specific memory address. When a script executes:

JavaScript

const myDiv \= document.createElement('div');  
document.body.appendChild(myDiv);

The variable myDiv holds a reference to that specific HTMLDivElement instance. If the framework's update logic functions by generating a new HTML string and injecting it into the parent:

JavaScript

// A typical destructive update pattern  
parent.innerHTML \= newRenderedString;

The browser parses the new string and constructs an entirely *new* HTMLDivElement at the same position in the document tree. Crucially, the old HTMLDivElement (referenced by myDiv) is detached from the document. It effectively becomes a "ghost" or "zombie" node. It still exists in memory because the myDiv variable holds a reference to it, preventing garbage collection, but it is no longer part of the render tree.

When the developer subsequently calls $(myDiv).update(), the framework operates on the node held in the reference—the ghost node. It might successfully change the class or attributes of this ghost node, but since the node is detached, the user sees no change on the screen. The visible node is a different object entirely, one that the developer's variable does not point to. This **Identity Discontinuity** is the root cause of the "ref does not work correctly" complaint. It forces the developer to constantly re-query the DOM (e.g., $('\#id')) to get a handle on the current element, defeating the purpose of holding references.1

### **1.2 The Mechanics of State Loss**

Beyond the reference issue, the re-creation strategy is devastating for user experience because it destroys **Ephemeral DOM State**. The DOM is not merely a visual tree; it is a stateful interface. Elements contain internal state that is not reflected in HTML attributes and thus is lost during a destroy-and-recreate cycle:

| State Type | Description of Loss |
| :---- | :---- |
| **Input Focus** | If the active element is replaced, focus reverts to the body. On mobile devices, this closes the virtual keyboard, making typing impossible.3 |
| **Selection Range** | The user's text cursor position (caret) or highlighted text is reset. A user typing in a text field will have their cursor jump to the start or end, or disappear entirely. |
| **Scroll Position** | scrollTop and scrollLeft values on containers are reset to 0\. A user scrolling a list who triggers an update will be snapped back to the top. |
| **CSS Transitions** | Animations relying on state changes (e.g., adding a class) will not trigger or will jump to the end state instantly because the browser sees a new element appearing, not an old element changing.3 |
| **Form Dirty State** | Uncontrolled input values (those not explicitly bound to the model) are reset to their default values. |

Modern users expect "app-like" fluidity. The "flash of unstyled content" or the resetting of scroll positions breaks the illusion of a cohesive application. The framework's current behavior, akin to a full page reload happening inside a div, is unacceptable for modern interactive requirements.4

### **1.3 The Event Listener Memory Hole**

The reported issues with "orphan event listeners" and errors during updates suggest a naive approach to event binding. In many imperative frameworks, listeners are attached directly to nodes:

JavaScript

element.addEventListener('click', (e) \=\> handleEvent(e, context));

When element is removed from the DOM (during the destructive update described above), the browser *should* garbage collect the listener if the element itself is collected. However, two complications arise that cause the reported leaks:

1. **Circular References:** If the closure (e) \=\>... closes over a variable that references the element (or a parent structure holding the element), a circular reference is created. While modern Mark-and-Sweep garbage collectors can handle simple cycles, complex chains involving global registries, timers, or external framework stores can leave these "islands" of memory uncollected.6  
2. **The "Zombie" Trigger:** If the developer holds a reference to the detached node (as established in 1.1) and somehow triggers an event on it (or if a bubbling event was in flight during the update), the handler executes. This handler likely assumes the node is in the document. It might try to access parentNode or query siblings. Since the node is detached, these operations return null or empty lists, causing the "throws errors" symptom described.

Furthermore, if the framework re-renders a list of 10,000 items, destroying the old 10,000 and creating new ones, but fails to explicitly remove the old listeners (or if the engine is slow to reclaim them), the memory footprint spikes. This "Memory Bloat" leads to sluggish performance and eventual browser crashes.8

### **1.4 The "Implicit Update" Paradox**

The user desires "implicit updates." In the current broken implementation, this likely implies that the framework attempts to detect changes and auto-update. However, without a stable reference to the *live* DOM, the framework is shouting into the void. "Implicit" implies that the system manages the complexity of *when* and *how* to update. The current failure forces the developer to manage it explicitly (by re-querying refs), breaking the core promise of the API.

To fix this, we must invert the architecture. Instead of the update being a destructive event that invalidates references, it must be a **Morphing Event** that preserves them. The update must flow *through* the existing nodes, not *over* them.

## ---

**2\. Theoretical Foundations of DOM Reconciliation**

To propose a technically sound solution that satisfies the "classic and modern synthesis" requirement, we must examine the algorithmic landscape of DOM updates. The goal is to achieve the efficiency of a Virtual DOM without the overhead of a heavy runtime, utilizing the "Implicit Update" model requested.

### **2.1 The Spectrum of Update Strategies**

Web frameworks historically employ one of four strategies to update the UI:

1. **Coarse-Grained Replacement (innerHTML):** Fast to write, slow to render, destroys state. This is the current failing model.5  
2. **Dirty Checking (AngularJS):** Polls data for changes and updates specific DOM bindings. Efficient for granular updates but suffers from performance cliffs with large datasets.10  
3. **Virtual DOM (React/Vue):** Maintains a lightweight JavaScript copy of the DOM. Diffs two VDOM trees to generate a patch set for the Real DOM. High throughput, but high memory usage (double tree).4  
4. **Real DOM Morphing (Morphdom/Idiomorph):** Diffs the *actual* DOM against a new structure (string or VNode) and applies patches in-place. Low memory overhead, preserves identity.5

For the requested framework—small, intuitive, jQuery-like—**Real DOM Morphing** is the superior architectural choice. It allows the user to treat the DOM as the source of truth, minimizing the "black box" nature of the framework. It aligns with the "classic" jQuery philosophy (the DOM *is* the app) while using "modern" diffing to ensure performance.

### **2.2 The Evolution of Morphing Algorithms**

To select the right algorithm, we must understand why early morphing libraries (like morphdom) are insufficient for the specific "stability" requirements requested (focus, selection preservation).

#### **2.2.1 Morphdom: The Greedy Mutation**

morphdom (used by Phoenix LiveView initially) popularized the concept of diffing the Real DOM. It traverses the new tree and the old tree in lockstep.

* **The Algorithm:** It compares OldNode and NewNode.  
  * If they match (same tag), it updates attributes and recurses into children.  
  * If they differ, it destroys OldNode and replaces it with NewNode.  
* **The Flaw:** morphdom is "greedy" and "top-down." It assumes that the order of elements is relatively stable. If a list becomes, morphdom compares A to Z. They differ, so it mutates A into Z. It then compares B to A, mutating B into A.  
* **Consequence:** The physical node A (which held the user's focus) is turned into Z. The physical node B becomes A. The user's focus is lost or shifted incorrectly. While efficient, this destroys the implicit state of the nodes.12

#### **2.2.2 Nanomorph: The Heuristic Simplification**

nanomorph (used in Choo) simplifies this by using isSameNode checks. It prioritizes raw speed, assuming that if a node looks different, it should be replaced. This exacerbates the state loss issues in complex applications.14

#### **2.2.3 Idiomorph: The ID Set Revolution**

idiomorph (created for HTMX) introduces a breakthrough relevant to our stability goals. It implements a "Bottom-Up" or "Look-Ahead" strategy.

* **The Innovation:** Before replacing a node, idiomorph scans the current DOM siblings to see if the desired node exists elsewhere. It calculates "ID Sets" to track element identity.  
* **The Result:** In the \`\` transformation, idiomorph sees that A is needed at position 2\. Instead of mutating A into Z, it *inserts* Z at position 1 and leaves A alone (merely shifting it down).  
* **Why this matters:** By preserving the *instance* of A rather than recycling it, idiomorph preserves focus, selection, and scroll position. It trades a small amount of CPU cycles (for the look-ahead) for a massive gain in user experience stability.12

### **2.3 The "Neo-Classic" Synthesis Recommendation**

The report recommends a hybrid approach: **"FluxDOM."**

* **From Classic (jQuery):** The API surface. $(selector) returns a wrapper. update() is an imperative command that triggers an implicit internal process.  
* **From Modern (React):** The use of JSX and Virtual Nodes (VNodes) to describe the *desired* state.  
* **From Post-Modern (Idiomorph):** The use of a "Soft-Morph" algorithm that prioritizes node stability over raw replacement speed, ensuring that ref pointers held by the developer remain valid across updates.

This synthesis addresses the core "Reference Dissociation" bug: if the algorithm guarantees that $(ref)'s underlying node is mutated in-place rather than replaced, ref remains valid forever.

## ---

**3\. Architecture of the Neo-Classic Framework (FluxDOM)**

We now define the architecture of **FluxDOM**. This system is designed to meet the constraints: small size, JSX support, implicit updates, and technical stability.

### **3.1 The JSX Pragma and Lightweight VNodes**

To support JSX, FluxDOM must implement a createElement function (standardly aliased as h). React’s VDOM nodes are heavy objects containing fiber contexts. For FluxDOM, VNodes should be ephemeral descriptors—existing only for the split second of the render comparison.

JavaScript

// The Virtual Node Structure  
type VNode \= {  
  tag: string | Function,       // 'div' or Component class  
  props: Record\<string, any\>,   // Attributes and props  
  children: (VNode | string), // Nested structure  
  key?: string | number,        // Vital for list stability  
  dom?: HTMLElement             // Reference to real DOM (assigned during morph)  
};

// The Pragma  
function h(tag, props,...children) {  
  return {   
    tag,   
    props: props |

| {},   
    children: children.flat().filter(c \=\> c\!= null),   
    key: props?.key   
  };  
}

This structure is minimalist. It incurs minimal memory overhead because the tree is discarded immediately after the Morphing engine consumes it.16

### **3.2 The Implicit Update Contract**

The user requested "implicit updates." In a non-reactive system (no Signals/Observables), "implicit" means the framework handles the *how*, but the user triggers the *when*. The $ factory serves as the bridge.

The Component Registry:  
To link DOM nodes to their update logic without polluting the global scope, we use a WeakMap.

JavaScript

const componentRegistry \= new WeakMap();   
// Key: DOM Node \-\> Value: { renderFn, props, prevVNode }

The $ Factory:  
The $ function is not just a selector; it is a Context Lifter.

JavaScript

function $(elementOrSelector) {  
  const elements \= resolveDOM(elementOrSelector); // Helper to get NodeList  
    
  return {  
    elements,  
      
    // The Implicit Update Method  
    update: (newProps) \=\> {  
      elements.forEach(el \=\> {  
        const instance \= componentRegistry.get(el);  
        if (instance) {  
          // Merge props and re-render  
          Object.assign(instance.props, newProps);  
          const newVNode \= instance.renderFn(instance.props);  
            
          // The Morph Engine updates 'el' in-place  
          morph(el, newVNode);  
            
          // Update the registry with the new VNode structure for next time  
          instance.prevVNode \= newVNode;  
        }  
      });  
      return this; // Chaining  
    },  
      
    // jQuery-like event binding (delegated)  
    on: (event, handler) \=\> { /\*... \*/ }  
  };  
}

This API design satisfies the requirement for "intuitive code." The developer writes $('\#app').update({ count: 5 }). The system implicitly handles the diffing, patching, and state preservation.

### **3.3 Solving Reference Stability**

The framework guarantees that $(ref) works because the morph function (detailed in Section 5\) is contractually bound to **never replace the root node** of a component unless the tag name changes (e.g., div becomes span). If the tag matches, it *must* modify attributes and children in-place. This ensures that the el reference inside the $ wrapper remains the live document node.18

## ---

**4\. Solving the Event Listener Crisis: Global Delegation**

The second major pillar of stability is the Event System. The "orphan listener" problem is a structural flaw of local binding. We solve this by abandoning element.addEventListener entirely for user interactions.

### **4.1 The Theory of Global Delegation**

Event Delegation leverages **Event Bubbling**. Most user events (click, input, change) bubble up from the target element to the window. Instead of attaching 1,000 listeners to 1,000 buttons, we attach **one** listener to the document (or the application root).

**Mechanism:**

1. **The Registry:** A central storage (WeakMap or Object) maps unique IDs to handler functions.  
2. **The ID:** Elements in the DOM carry a data-evt attribute containing the ID.  
3. **The Listener:** A single global handler intercepts events, checks the target for the ID, and executes the mapped function.

### **4.2 Why This Fixes the Leaks**

This architecture eliminates the circular reference pathology described in Section 1.3.

* **Decoupling:** The DOM node holds only a string (data-evt-click="h\_123"). It does not hold a reference to the function closure.  
* **Automatic Hygiene:** When a DOM node is removed (via Morph or removal), the data-evt attribute vanishes with it. The browser's garbage collector reclaims the node effortlessly.  
* **Registry Cleanup:** The handler functions live in the componentRegistry. When the Component Instance is destroyed (or the DOM node it attaches to is collected), the WeakMap automatically releases the handlers. **Zero manual cleanup is required.**  
* **Performance:** Adding 10,000 rows to a table requires 0 addEventListener calls. This significantly reduces the "Layout Thrashing" and setup costs of large renders.20

### **4.3 Handling Non-Bubbling Events**

Certain events like focus, blur, and scroll (on non-document nodes) do not bubble. However, they *do* capture. The global delegate can attach listeners with { capture: true } to the document root to intercept these events as they descend the tree, extending the delegation model to cover all interaction types.22

## ---

**5\. Detailed Algorithm Design: The Safe Morph**

This section details the custom algorithm required to meet the "stability" and "performance" goals. We will synthesize idiomorph's stability with a lightweight VNode-to-DOM comparison.

### **5.1 The morph(dom, vnode) Function**

Unlike morphdom (DOM-to-DOM) or React (VDOM-to-VDOM), FluxDOM compares the **Real DOM** (current truth) against a **VNode** (future truth). This is efficient because we avoid creating the "New DOM" nodes until we are sure we need them.

**Phase 1: Root Identity Check**

JavaScript

function morph(dom, vnode) {  
  // 1\. Tag Mismatch Check (The only case for replacement)  
  if (dom.nodeName.toLowerCase()\!== vnode.tag.toLowerCase()) {  
    const newDom \= createDOM(vnode);  
    dom.replaceWith(newDom);  
    return newDom;  
  }  
    
  // 2\. Attribute Patching  
  patchAttributes(dom, vnode.props);  
    
  // 3\. Child Reconciliation (The Core Complexity)  
  reconcileChildren(dom, vnode.children);  
    
  return dom;  
}

### **5.2 The Child Reconciliation Algorithm**

This is where the "greedy" flaw of morphdom is fixed. We employ a **Keyed Map** strategy with a **Head/Tail Heuristic** (inspired by Snabbdom/Preact).24

**Algorithm Steps:**

1. **Map Current DOM:** The algorithm scans the dom.childNodes. It builds a map:  
   * Key Map: If a child has a key attribute (from JSX key={...}), it is stored in Map\<Key, Node\>.  
   * Unkeyed List: Nodes without keys are stored in a list.  
2. **Iterate VNode Children:** The algorithm loops through the vnode.children.  
   * **Step A: Match Attempt.** It checks if the current VNode has a key.  
     * If **Keyed**: It looks up the key in the Key Map.  
     * If **Unkeyed**: It takes the first available node from the Unkeyed List.  
   * **Step B: Action.**  
     * **Match Found:** It checks the position. If the matched DOM node is not at the current index, it moves it using dom.insertBefore(matchedNode, dom.childNodes\[i\]). *Crucially, insertBefore moves the live node, preserving its focus and state.* Then, it calls morph(matchedNode, vChild) to update the content.  
     * **No Match:** It calls createDOM(vChild) and inserts the new node.  
3. **Cleanup:** After the loop, any nodes remaining in the Key Map or Unkeyed List are extraneous. They are removed via node.remove().

The Stability Guarantee:  
By prioritizing the re-use of keyed nodes, this algorithm ensures that if an element moves from position 1 to position 10, the same instance moves. The user's cursor remains inside the input, and the text selection is preserved. This directly satisfies the requirement to "make sure partial updates work well" and fixes the "orphan" errors (since we aren't creating orphans unnecessarily).

### **5.3 Handling Text Nodes**

Text nodes (nodeType \=== 3\) require special handling. A div containing "Hello World" might be one text node or multiple depending on browser parsing. The algorithm must normalize adjacent text nodes or treat strings in the VNode children array as atomic units that perform dom.textContent \= string updates, which are extremely fast.13

## ---

**6\. Implementation Strategy: The API Layer**

We now synthesize the algorithm into the developer-facing API.

### **6.1 The Factory Function $**

The $ function is the entry point. It creates the Context.

JavaScript

import { render } from './core';

const $ \= (selectorOrRef) \=\> {  
  const refs \= resolve(selectorOrRef); // Returns array of DOM nodes  
    
  return {  
    // Implicit Update: Rerender based on associated component logic  
    update: (props) \=\> {  
      refs.forEach(node \=\> {  
        const component \= node.\_fluxComponent; // Access hidden instance  
        if (component) {  
          component.setProps(props);  
          const newVNode \= component.render();  
          morph(node, newVNode);  
        } else {  
           // Fallback for non-component nodes: explicit HTML update?  
           // Or log warning that this node is not a managed root.  
        }  
      });  
      return this; // Chainable  
    },

    // jQuery-like CSS  
    css: (styles) \=\> {   
        refs.forEach(el \=\> Object.assign(el.style, styles));  
        return this;  
    },  
      
    // Explicit render of a new view into these nodes  
    render: (jsxElement) \=\> {  
      refs.forEach(node \=\> {  
         mount(node, jsxElement);  
      });  
      return this;  
    }  
  };  
};

### **6.2 The Component Model**

To make update() work implicitly, the DOM node must store the logic required to generate its next state. We attach the VNode and the Render Function to the DOM node itself (using a Symbol or \_fluxComponent property). This "DOM as State Container" pattern is what enables the jQuery-like simplicity.

JavaScript

function mount(container, vnode) {  
  // Create initial DOM  
  const dom \= createDOM(vnode);  
    
  // Attach metadata for future updates  
  dom.\_fluxComponent \= {  
    render: () \=\> vnode.tag(vnode.props), // Logic to regenerate VNode  
    setProps: (p) \=\> Object.assign(vnode.props, p),  
    props: vnode.props  
  };  
    
  container.appendChild(dom);  
}

Now, $(ref).update({ count: 2 }) works by looking up ref.\_fluxComponent, updating the props, generating the new VNode tree, and morphing ref in-place. Because ref is morphed, the variable holding ref stays valid.

## ---

**7\. Server-Side Rendering (SSR) and Hydration**

The request specifies SSR support. This is critical for performance and SEO. The challenge is "Hydration"—making the static HTML interactive without destroying it.

### **7.1 The "Double Render" Problem**

In standard React hydration, the client downloads the JS, builds the *entire* VDOM tree, and compares it to the existing HTML. If they match, it attaches listeners. This is CPU intensive.

### **7.2 FluxDOM's Resumable Strategy**

FluxDOM can employ a lighter strategy: **Lazy Hydration**.

1. **Server Output:** The server renders the HTML string. It also serializes the initial props into a script tag or a data-props attribute on the root element.  
   HTML  
   \<div id\="app" data-flux-component\="MyComponent" data-props\='{"count":0}'\>  
    ... content...  
   \</div\>

2. **Client Wake-up:** When the JS loads, it does *not* immediately re-render everything. It sets up the Global Event Delegate.  
3. **Interaction:** When the user clicks a button, the Global Delegate traps the event. It sees the event happened inside a component.  
   * It checks: "Has this component been hydrated?"  
   * If **No**: It reads data-props, parses them, instantiates the Component logic, and performs the first render() to build the VNode tree for future diffing. Then it executes the handler.  
   * If **Yes**: It proceeds as normal.

This "Resumability" (similar to Qwik) means the Time-To-Interactive (TTI) is nearly instantaneous. The framework only pays the cost of VNode generation when an interaction actually occurs.27

### **7.3 Handling ID Mismatches**

A common SSR issue is ID generation (e.g., id="uuid-1" generated on server vs id="uuid-5" on client). FluxDOM should use a deterministic ID generator based on tree depth or explicit IDs provided by the developer to ensuring the morph algorithm matches nodes correctly during the first update.5

## ---

**8\. Performance Considerations and Benchmarks**

The proposed solution balances the "Zero-Overhead" goal of direct manipulation with the "correctness" of VDOM.

### **8.1 Complexity Analysis**

* **Memory Footprint:** FluxDOM has **O(1)** memory overhead per component at rest (just the props and render function reference). The VNode tree exists only during the .update() execution stack and is then GC'd. Compare this to React's **O(N)** persistent Fiber tree.  
* **Update Complexity:** morph(dom, vnode) is **O(N)** where N is the number of nodes in the component.  
* **Diffing Speed:** By checking dom.nodeName vs vnode.tag, we exit early. The heuristic matching (Key Map) ensures that even with reordering, the complexity remains **O(N)** rather than **O(N^2)** or **O(N^3)** (which effectively happens with Levenshtein distance calculations on trees).13

### **8.2 The Cost of Real DOM Reads**

One critique of morphing is that reading dom.childNodes causes "Reflow" or "Layout Thrashing." However, simply accessing childNodes or nodeName does *not* trigger a reflow. Only reading computed geometry (offsetWidth, getComputedStyle) does. Since FluxDOM's morpher only checks structural properties (nodeName, id, key), it is "Layout Safe" and extremely fast.17

## ---

**9\. Comprehensive Technical Details: The "FluxDOM" Implementation Reference**

This section provides the rigorous technical detailing necessary to build the engine described above. It moves beyond high-level architecture into the specifics of the implementation code and edge-case handling.

### **9.1 The "FluxDOM" Kernel**

The kernel must be small, tree-shakeable, and self-contained.

JavaScript

// core.js \- The Micro-Kernel

// 1\. GLOBAL DELEGATE REGISTRY  
const eventRegistry \= new WeakMap(); // Component Instance \-\> { eventName \-\> handler }  
const globalHandlers \= new Set();    // Track which event types we are listening to globally

function ensureGlobalListener(eventType) {  
    if (globalHandlers.has(eventType)) return;  
      
    // We bind to document to catch everything  
    document.addEventListener(eventType, (e) \=\> {  
        let target \= e.target;  
        // Bubble up to find a component boundary  
        while (target && target\!== document) {  
            // Check if this node belongs to a Flux Instance  
            if (target.\_fluxInstance) {  
                const instance \= target.\_fluxInstance;  
                // Look for the data-attribute that maps this specific node's event  
                const handlerId \= target.getAttribute(\`data-on-${eventType}\`);  
                  
                if (handlerId && instance.handlers\[handlerId\]) {  
                    // Execute the handler with the instance as context  
                    instance.handlers\[handlerId\](e);  
                    if (e.cancelBubble) return;   
                }  
            }  
            target \= target.parentNode;  
        }  
    }, { capture: \['focus', 'blur', 'scroll'\].includes(eventType) });   
      
    globalHandlers.add(eventType);  
}

// 2\. THE COMPONENT INSTANCE WRAPPER  
class Component {  
    constructor(dom, renderFn, props) {  
        this.dom \= dom;  
        this.renderFn \= renderFn;  
        this.props \= props;  
        this.handlers \= {}; // Stores the actual closures  
          
        // Link DOM to Instance for Event Delegation & Updates  
        dom.\_fluxInstance \= this;  
    }

    update(newProps) {  
        if (newProps) Object.assign(this.props, newProps);  
        const newVNode \= this.renderFn(this.props);  
          
        // THE CRITICAL FIX: Morph instead of Replace  
        morph(this.dom, newVNode);  
    }  
}

### **9.2 The Robust Morph Algorithm (Code-Level Logic)**

The morph function is the heart of the stability. It must handle the ref preservation logic.

JavaScript

// morph.js

export function morph(domNode, vNode) {  
    // Case 1: Text Nodes  
    if (typeof vNode \=== 'string' |

| typeof vNode \=== 'number') {  
        // If the current DOM is a text node, update it.  
        if (domNode.nodeType \=== 3) {  
            if (domNode.nodeValue\!== String(vNode)) {  
                domNode.nodeValue \= vNode;  
            }  
        } else {  
            // If it's an element, we must replace it (rare text-to-element switch)  
            const newText \= document.createTextNode(vNode);  
            domNode.replaceWith(newText);  
            return newText;  
        }  
        return domNode;  
    }

    // Case 2: Element Nodes \- Tag Mismatch  
    const vTag \= vNode.tag.toUpperCase();  
    if (domNode.nodeName\!== vTag) {  
        // FATAL: Cannot morph \<div\> into \<span\>.   
        // We must destroy and recreate. State is lost here, but unavoidable.  
        const newDom \= document.createElement(vTag);  
        domNode.replaceWith(newDom);  
        // Hydrate the new node recursively  
        vNode.children.forEach(c \=\> mount(newDom, c));  
        return newDom;  
    }

    // Case 3: Element Nodes \- Attribute Sync  
    syncAttributes(domNode, vNode.props);

    // Case 4: Children Reconciliation (The Idiomorph-Lite approach)  
    const domChildren \= Array.from(domNode.childNodes);  
    const vChildren \= vNode.children;

    // Keyed Matching Strategy  
    let domIndex \= 0;  
      
    for (let i \= 0; i \< vChildren.length; i++) {  
        const vChild \= vChildren\[i\];  
        let match \= null;

        // A. Look ahead in existing DOM for a match (Key/ID)  
        // This solves the reordering/insertion problem without destroying nodes  
        if (vChild.key |

| vChild.props?.id) {  
            match \= findMatchInRemaining(domChildren, domIndex, vChild);  
        }

        if (match) {  
            // MOVE the matched node to the current position  
            if (match\!== domChildren\[domIndex\]) {  
                domNode.insertBefore(match, domChildren\[domIndex\]);  
            }  
            // Update the matched node (Recursion)  
            morph(match, vChild);  
            domIndex++;  
        } else {  
            // CREATE new node (Insertion)  
            const newNode \= createNode(vChild);   
            if (domIndex \< domChildren.length) {  
                domNode.insertBefore(newNode, domChildren\[domIndex\]);  
            } else {  
                domNode.appendChild(newNode);  
            }  
            domIndex++;  
        }  
    }

    // Cleanup: Remove any remaining DOM nodes that weren't matched  
    while (domChildren.length \> domIndex) {  
        const deadNode \= domChildren\[domIndex\];  
        deadNode.remove();   
        // GC implicitly handles the object.   
        // Event listeners are global, so no cleanup needed on the node itself\!  
        domChildren.splice(domIndex, 1);  
    }  
      
    return domNode;  
}

// Helper: Find a node further down the list that matches  
function findMatchInRemaining(nodes, startIndex, vNode) {  
    for (let i \= startIndex; i \< nodes.length; i++) {  
        const node \= nodes\[i\];  
        // Match by Key (internal prop) or ID  
        // Note: We need to store 'key' on the DOM node for this to work  
        if (vNode.key && node.\_fluxKey \=== vNode.key) {  
            return node;  
        }  
        if (vNode.props && vNode.props.id && node.id \=== vNode.props.id) {  
            return node;  
        }  
    }  
    return null;  
}

### **9.3 The JSX Pragma & Event Extraction**

To make the delegation work, the JSX Pragma must strip event handlers from the props and register them.

JavaScript

// jsx.js  
export function h(tag, props,...children) {  
    const finalProps \= {};  
    const handlers \= {};  
      
    if (props) {  
        for (let key in props) {  
            // Detect Event Handlers (e.g., onClick)  
            if (key.startsWith('on') && typeof props\[key\] \=== 'function') {  
                const eventName \= key.toLowerCase().substring(2);  
                const handlerId \= \`h\_${Math.random().toString(36).substr(2, 9)}\`;  
                  
                // 1\. Add data-attribute for the Global Delegate to find  
                finalProps\[\`data-on-${eventName}\`\] \= handlerId;  
                  
                // 2\. Store the actual function to return to the Component  
                handlers\[handlerId\] \= props\[key\];  
                  
                // 3\. Ensure the global listener is active  
                ensureGlobalListener(eventName);  
            } else {  
                finalProps\[key\] \= props\[key\];  
            }  
        }  
    }  
      
    return {  
        tag,  
        props: finalProps,  
        children: children.flat(),  
        handlers // Passed along to be stored in Component Instance  
    };  
}

### **9.4 Memory Leak Analysis**

Let's verify the memory safety of this architecture:

1. **Orphan Listeners:** We do not call addEventListener on elements. We call it N times on the document (where N is the number of event types). This is constant space O(1).  
2. **Handler Storage:** Handlers are stored in this.handlers inside the Component class instance.  
3. **Component Lifecycle:** The Component instance is linked to the DOM node via dom.\_fluxInstance.  
   * **Scenario:** We remove a \<div\> from the DOM using deadNode.remove().  
   * **Chain:** The DOM node is unreachable. The \_fluxInstance property is on the DOM node, so it becomes unreachable. The handlers object is on the Instance, so it becomes unreachable.  
   * **GC Result:** The Browser Garbage Collector sweeps the Node, the Instance, and the Closures. **Zero Leaks.**

This proves that the "Global Delegation \+ Component Instance" model creates a closed memory loop that the GC can handle trivially, unlike the "Anonymous function attached to DOM" model which creates obscure retention paths.

### **9.5 Edge Cases: CSS and Internal Refs**

CSS Styling:  
For a "Classic" synthesis, we should avoid CSS-in-JS complexity. The style prop should accept an object or string. The syncAttributes function in the morpher must handle this smartly to avoid thrashing.

JavaScript

function syncAttributes(dom, props) {  
    for (let key in props) {  
        if (key \=== 'style' && typeof props\[key\] \=== 'object') {  
            // Diff style object to minimize writes  
            const style \= props\[key\];  
            for (let s in style) {  
                if (dom.style\[s\]\!== style\[s\]) dom.style\[s\] \= style\[s\];  
            }  
        } else if (key\!== 'key' &&\!key.startsWith('data-on-')) {  
            // Standard attribute  
            if (dom.getAttribute(key)\!== String(props\[key\])) {  
                dom.setAttribute(key, props\[key\]);  
            }  
        }  
    }  
}

This ensures that $(ref).update({ style: { color: 'red' } }) transitions the color smoothly without unmounting the element, which allows CSS transitions to play out (unlike innerHTML which would snap the element to the new state immediately).3

## ---

**10\. Conclusion and Future Outlook**

The user's original framework suffered from a "Crisis of Identity." By relying on destructive rendering techniques while attempting to maintain persistent JavaScript references, it created a broken contract where the "Ref" diverged from the "View." This pathology was exacerbated by a leaky event binding strategy that filled the browser's heap with orphan closures.

The **FluxDOM** architecture proposed here solves these issues not by patching the old code, but by fundamentally re-engineering the DOM relationship.

1. **Identity Preservation:** Through a **Safe Morphing Algorithm** (inspired by idiomorph), we guarantee that $(ref) always points to the live node, because the live node is mutated in-place rather than replaced.  
2. **Memory Safety:** Through **Global Event Delegation**, we decouple event lifecycle from DOM lifecycle, eliminating the possibility of orphan listeners and circular reference leaks.  
3. **Implicit Simplicity:** By encapsulating the VNode generation logic *within* the DOM node's metadata, we enable the intuitive $(ref).update() API that the user requested, bridging the gap between the ease of jQuery and the robustness of React.

This report confirms that it is indeed possible to safely improve the algorithm for stability and performance. The result is a "Neo-Classic" framework that is technically sound, performant, and joyfully simple to use.

---

References:  
.1

#### **Referenzen**

1. How to store a reference DOM element for later use \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/59231802/how-to-store-a-reference-dom-element-for-later-use](https://stackoverflow.com/questions/59231802/how-to-store-a-reference-dom-element-for-later-use)  
2. So you think you know everything about React refs, Zugriff am Januar 17, 2026, [https://thoughtspile.github.io/2021/05/17/everything-about-react-refs/](https://thoughtspile.github.io/2021/05/17/everything-about-react-refs/)  
3. Better DOM Morphing with Morphlex \- Joel Drapper, Zugriff am Januar 17, 2026, [https://joel.drapper.me/p/morphlex/](https://joel.drapper.me/p/morphlex/)  
4. The 'Diffing' Algorithm Explained | by Tito Adeoye \- Medium, Zugriff am Januar 17, 2026, [https://medium.com/@titoadeoye/the-diffing-algorithm-explained-81d5b11ad9a1](https://medium.com/@titoadeoye/the-diffing-algorithm-explained-81d5b11ad9a1)  
5. patrick-steele-idem/morphdom: Fast and lightweight DOM diffing/patching (no virtual DOM needed) \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/patrick-steele-idem/morphdom](https://github.com/patrick-steele-idem/morphdom)  
6. How to Avoid Memory Leaks in JavaScript Event Listeners \- DEV Community, Zugriff am Januar 17, 2026, [https://dev.to/alex\_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna](https://dev.to/alex_aslam/how-to-avoid-memory-leaks-in-javascript-event-listeners-4hna)  
7. Crush JS Memory Leaks: Mastering Event Listeners | Kite Metric, Zugriff am Januar 17, 2026, [https://kitemetric.com/blogs/how-to-avoid-javascript-event-listener-memory-leaks](https://kitemetric.com/blogs/how-to-avoid-javascript-event-listener-memory-leaks)  
8. Memory Leaks From Orphaned Event Listeners · Issue \#7081 · videojs/video.js \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/videojs/video.js/issues/7081](https://github.com/videojs/video.js/issues/7081)  
9. addEventListener memory leak due to frames \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/13677589/addeventlistener-memory-leak-due-to-frames](https://stackoverflow.com/questions/13677589/addeventlistener-memory-leak-due-to-frames)  
10. Why is React's concept of Virtual DOM said to be more performant than dirty model checking? \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/21109361/why-is-reacts-concept-of-virtual-dom-said-to-be-more-performant-than-dirty-mode](https://stackoverflow.com/questions/21109361/why-is-reacts-concept-of-virtual-dom-said-to-be-more-performant-than-dirty-mode)  
11. Rendering Mechanism \- Vue.js, Zugriff am Januar 17, 2026, [https://vuejs.org/guide/extras/rendering-mechanism](https://vuejs.org/guide/extras/rendering-mechanism)  
12. bigskysoftware/idiomorph: A DOM-merging algorithm \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/bigskysoftware/idiomorph](https://github.com/bigskysoftware/idiomorph)  
13. Morphdom.md · GitHub, Zugriff am Januar 17, 2026, [https://gist.github.com/leafac/57e61d8e1ce6a6b67298adacd52c2668](https://gist.github.com/leafac/57e61d8e1ce6a6b67298adacd52c2668)  
14. nanocomponent \- NPM, Zugriff am Januar 17, 2026, [https://www.npmjs.com/package/nanocomponent](https://www.npmjs.com/package/nanocomponent)  
15. choojs/nanomorph: \- Hyper fast diffing algorithm for real DOM nodes \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/choojs/nanomorph](https://github.com/choojs/nanomorph)  
16. Cample.js: Reactivity without virtual DOM \- Hacker News, Zugriff am Januar 17, 2026, [https://news.ycombinator.com/item?id=34738792](https://news.ycombinator.com/item?id=34738792)  
17. If we use a virtual DOM because it's faster, why don't we just fix the DOM? Isn't a virtual DOM just a workaround for an underlying issue: the DOM is slow and inefficient? : r/AskProgramming \- Reddit, Zugriff am Januar 17, 2026, [https://www.reddit.com/r/AskProgramming/comments/b6t039/if\_we\_use\_a\_virtual\_dom\_because\_its\_faster\_why/](https://www.reddit.com/r/AskProgramming/comments/b6t039/if_we_use_a_virtual_dom_because_its_faster_why/)  
18. Swap two html elements and preserve event listeners on them \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/10716986/swap-two-html-elements-and-preserve-event-listeners-on-them](https://stackoverflow.com/questions/10716986/swap-two-html-elements-and-preserve-event-listeners-on-them)  
19. Manipulating the DOM with Refs \- React, Zugriff am Januar 17, 2026, [https://react.dev/learn/manipulating-the-dom-with-refs](https://react.dev/learn/manipulating-the-dom-with-refs)  
20. DOM event delegation or not, which is best resourcewise? \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/69615300/dom-event-delegation-or-not-which-is-best-resourcewise](https://stackoverflow.com/questions/69615300/dom-event-delegation-or-not-which-is-best-resourcewise)  
21. Explain event delegation in JavaScript | Quiz Interview Questions with Solutions, Zugriff am Januar 17, 2026, [https://www.greatfrontend.com/questions/quiz/explain-event-delegation](https://www.greatfrontend.com/questions/quiz/explain-event-delegation)  
22. DOM events \- Web APIs \- MDN Web Docs \- Mozilla, Zugriff am Januar 17, 2026, [https://developer.mozilla.org/en-US/docs/Web/API/Document\_Object\_Model/Events](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Events)  
23. Event Delegation Pattern \- DEV Community, Zugriff am Januar 17, 2026, [https://dev.to/thesanjeevsharma/event-delegation-pattern-42m9](https://dev.to/thesanjeevsharma/event-delegation-pattern-42m9)  
24. What is the difference between React and Preact diff algorithm in depth \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/46756256/what-is-the-difference-between-react-and-preact-diff-algorithm-in-depth](https://stackoverflow.com/questions/46756256/what-is-the-difference-between-react-and-preact-diff-algorithm-in-depth)  
25. React is \*very\* far from the fastest vdom. It notably suffers from needing to wo... | Hacker News, Zugriff am Januar 17, 2026, [https://news.ycombinator.com/item?id=20706596](https://news.ycombinator.com/item?id=20706596)  
26. Optimizing mounting to a serverside rendered HTML tree (DOM hydration) · Issue \#1838 · MithrilJS/mithril.js \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/MithrilJS/mithril.js/issues/1838](https://github.com/MithrilJS/mithril.js/issues/1838)  
27. React Virtual DOM vs Incremental DOM vs Ember's Glimmer: Fight \- Auth0, Zugriff am Januar 17, 2026, [https://auth0.com/blog/face-off-virtual-dom-vs-incremental-dom-vs-glimmer/](https://auth0.com/blog/face-off-virtual-dom-vs-incremental-dom-vs-glimmer/)  
28. Have you thought about using virtual DOM diffing? \#184 \- GitHub, Zugriff am Januar 17, 2026, [https://github.com/turbolinks/turbolinks/issues/184](https://github.com/turbolinks/turbolinks/issues/184)  
29. Mithril.js style updates not working \- virtual DOM diffing skipped \- Stack Overflow, Zugriff am Januar 17, 2026, [https://stackoverflow.com/questions/79771446/mithril-js-style-updates-not-working-virtual-dom-diffing-skipped](https://stackoverflow.com/questions/79771446/mithril-js-style-updates-not-working-virtual-dom-diffing-skipped)  
30. Long Live the Virtual DOM : r/javascript \- Reddit, Zugriff am Januar 17, 2026, [https://www.reddit.com/r/javascript/comments/ckpdxk/long\_live\_the\_virtual\_dom/](https://www.reddit.com/r/javascript/comments/ckpdxk/long_live_the_virtual_dom/)  
31. I made a better DOM morphing algorithm \- Hacker News, Zugriff am Januar 17, 2026, [https://news.ycombinator.com/item?id=45845582](https://news.ycombinator.com/item?id=45845582)  
32. Event delegation \- The Modern JavaScript Tutorial, Zugriff am Januar 17, 2026, [https://javascript.info/event-delegation](https://javascript.info/event-delegation)  
33. How Virtual-DOM and diffing works in React | by Gethyl George Kurian \- Medium, Zugriff am Januar 17, 2026, [https://medium.com/@gethylgeorge/how-virtual-dom-and-diffing-works-in-react-6fc805f9f84e](https://medium.com/@gethylgeorge/how-virtual-dom-and-diffing-works-in-react-6fc805f9f84e)  
34. Turbo 8 morphing deep dive \- how idiomorph works? (with an interactive playground), Zugriff am Januar 17, 2026, [https://radanskoric.com/articles/turbo-morphing-deep-dive-idiomorph](https://radanskoric.com/articles/turbo-morphing-deep-dive-idiomorph)