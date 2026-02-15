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
  SyncRenderInput,
  ParentElementInput,
  SyncRenderResult,
  ParentElementInputAsync,
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
import { parseEventPropName, registerDelegatedEvent } from "./delegated-events.js";

export const CLASS_ATTRIBUTE_NAME = "class";
export const XLINK_ATTRIBUTE_NAME = "xlink";
export const XMLNS_ATTRIBUTE_NAME = "xmlns";
export const REF_ATTRIBUTE_NAME = "ref";
export const DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";

export const nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: "http://www.w3.org/2000/xmlns/",
  [XLINK_ATTRIBUTE_NAME]: "http://www.w3.org/1999/xlink",
  svg: "http://www.w3.org/2000/svg",
};

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
  // Filter null/undefined/booleans to match update/hydrate behavior
  // (booleans render as nothing, not as "true"/"false" text)
  let children: Array<VNodeChild> = (
    attributes?.children ? ([] as VNodeChild[]).concat(attributes.children as VNodeChild | VNodeChild[]) : []
  ).filter((c) => c !== null && c !== undefined && typeof c !== "boolean");
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

  // Handle async function components with fallback prop
  // This enables: <AsyncComponent fallback={<div>Loading...</div>} />
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    // console.log("[defuss] Detected AsyncFunction component:", type.name);
    const fallback = attributes?.fallback;

    // Extract fallback from attributes so it's not passed to the async component
    const propsForAsyncFn = { ...attributes };
    delete propsForAsyncFn.fallback;

    // Create onMount handler that will:
    // 1. Execute the async function component
    // 2. Update the container with the resolved content
    const onMount = async (containerEl: HTMLElement) => {
      try {
        // Execute the async component function with props
        const resolvedVNode = await type({
          ...propsForAsyncFn,
          children,
        });

        // console.log("[defuss] Async component resolved:", type.name, resolvedVNode);

        // Import updateDomWithVdom dynamically to update the container
        // The container element will have its content replaced with the resolved VNode
        if (containerEl && resolvedVNode) {
          const globals: Globals = {
            window: containerEl.ownerDocument?.defaultView ?? (globalThis as unknown as Window),
          } as Globals;
          updateDomWithVdom(containerEl, resolvedVNode, globals);
        }
      } catch (error) {
        console.error("[defuss] Async component error:", error);
        if (containerEl) {
          containerEl.textContent = `Error: ${(error as Error)?.message || error}`;
        }
      }
    };

    // Return a wrapper div that shows fallback initially, then updates via onMount
    return {
      type: "div",
      attributes: {
        key,
        onMount
      },
      children: fallback ? [fallback] : [],
      sourceInfo,
    } as unknown as VNode;
  }


  // it's a component, divide and conquer children
  // in case of sync functions (not AsyncFunction)
  if (typeof type === "function" && type.constructor.name !== "AsyncFunction") {

    try {
      // Pass all attributes including key (defuss components like Trans use key as a prop)
      const rendered = type({
        children,
        ...attributes,
      });

      // Store the original component props (without children) on the returned VNode
      // so that SSG auto-hydration can serialize and pass them to the client-side component.
      // Only set if not already set by an inner component call (preserves innermost props).
      console.log(`[jsx componentProps] component="${type.name}", isObj=${rendered && typeof rendered === "object"}, isArr=${Array.isArray(rendered)}, hasSrcInfo=${!!sourceInfo}, attrs=`, JSON.stringify(attributes)?.slice(0, 200));
      if (rendered && typeof rendered === "object" && !Array.isArray(rendered) && sourceInfo) {
        if (!(rendered as VNode).componentProps) {
          (rendered as VNode).componentProps = { ...attributes };
          console.log(`[jsx componentProps] SET on component="${type.name}", renderedType="${(rendered as VNode).type}", renderedSrcInfo=`, (rendered as VNode).sourceInfo?.fileName);
        } else {
          console.log(`[jsx componentProps] SKIP (already set) on component="${type.name}"`);
        }
      }

      // Diff semantics: also apply key to the returned vnode root so morphing can find keyed nodes
      if (typeof key !== "undefined" && rendered && typeof rendered === "object") {
        // Single root vnode
        if ("attributes" in (rendered as any)) {
          (rendered as any).attributes = {
            ...(rendered as any).attributes,
            key,
          };
        }
        // Fragment array: only safe auto-key if it's a single root
        else if (Array.isArray(rendered) && rendered.length === 1) {
          const only = rendered[0];
          if (only && typeof only === "object" && "attributes" in (only as any)) {
            (only as any).attributes = {
              ...(only as any).attributes,
              key,
            };
          }
        }
      }

      return rendered;
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

  // Skip MutationObserver in SSR environments where it doesn't exist
  if (typeof MutationObserver === "undefined") {
    return;
  }

  let parentNode: Node | null = domNode.parentNode;
  if (!parentNode) {
    throw new Error("The provided domNode does not have a parentNode.");
  }

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            // Defer check: if node is re-inserted (move), it will be connected
            queueMicrotask(() => {
              if (!domNode.isConnected) {
                // Node was actually unmounted
                onUnmount();
                observer.disconnect();
                return;
              }

              // Node was moved, not unmounted: re-arm observer on new parent
              const newParent = domNode.parentNode;
              if (newParent && newParent !== parentNode) {
                parentNode = newParent;
                observer.disconnect();
                observer.observe(parentNode, { childList: true });
              }
            });
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
    (newEl as any).$onMount!(newEl); // remove the hook after it's been called
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
      virtualNode: RenderInput,
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
      virtualNode: RenderInput,
      parentDomElement?: Element | Document,
    ): Element | undefined => {
      let newEl: Element | undefined = undefined;

      try {
        // if a synchronous function is still a function, VDOM has obviously not resolved, probably an
        // Error occurred while generating the VDOM (in JSX runtime)
        if (typeof virtualNode === "function" && virtualNode.constructor.name === "AsyncFunction") {
          newEl = document.createElement("div");
        } else if (
          typeof virtualNode === "object" &&
          virtualNode !== null &&
          "type" in virtualNode
        ) {
          const vNode = virtualNode as VNode;

          if (typeof vNode.type === "function") {
            newEl = document.createElement("div");
            (newEl as HTMLElement).innerText =
              `FATAL ERROR: ${(vNode.type as { _error?: string })._error}`;
          } else if (
            // SVG support
            (typeof vNode.type === "string" && vNode.type.toUpperCase() === "SVG") ||
            (parentDomElement &&
              renderer.hasSvgNamespace(
                parentDomElement,
                typeof vNode.type === "string" ? vNode.type.toUpperCase() : "",
              ))
          ) {
            // SVG support
            newEl = document.createElementNS(
              nsMap.svg,
              vNode.type as string,
            );
          } else {
            newEl = document.createElement(vNode.type as string);
          }

          if (vNode.attributes) {
            renderer.setAttributes(vNode, newEl as Element);

            // apply dangerouslySetInnerHTML if provided
            if (vNode.attributes.dangerouslySetInnerHTML) {
              (newEl as HTMLElement).innerHTML = vNode.attributes.dangerouslySetInnerHTML.__html;
            }
          }

          // Skip child creation when dangerouslySetInnerHTML is used (matches React semantics)
          if (vNode.children && !vNode.attributes?.dangerouslySetInnerHTML) {
            renderer.createChildElements(vNode.children, newEl as Element);
          }
        } else {
          // Fallback for unexpected types (primitives should be handled by createTextNode, but just in case)
          // If virtualNode is a primitive at this point, original logic would try to use it as tag name or crash.
          // We'll create a text node wrapped in span or similar? 
          // Attempting to match original implementation which forced Cast.
          // If 'type' is missing, it's not a valid VNode. 
          // Original was: newEl = document.createElement(virtualNode.type as string);
          // If it's a string, type is undefined. document.createElement("undefined") -> <undefined> element.
          if (typeof virtualNode === "string" || typeof virtualNode === "number") {
            // Creating an element with the value as tag name seems wrong but that's what the old code did if it got here.
            // However, createElementOrElements dispatches strings to createTextNode.
            // So we might be safe here.
            newEl = document.createElement(String(virtualNode));
          }
        }

        if (newEl && parentDomElement) {
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

        // Skip booleans entirely - {true} and {false} render nothing (React/JSX semantics)
        if (typeof virtualChild === "boolean") {
          continue;
        }

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
      if (typeof value === "undefined") return;

      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return;

      // internal list key: store on element, do not serialize into DOM
      if (name === "key") {
        (domElement as HTMLElement & { _defussKey?: string })._defussKey = String(value);
        return;
      }

      // save ref as { current: DOMElement } in ref object
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        const ref = value as { current?: unknown; orphan?: boolean };
        ref.current = domElement;
        (domElement as HTMLElement)._defussRef = value as any;

        (domElement as any).$onUnmount = queueCallback(() => {
          // value.orphan = true;
        });

        if (domElement.parentNode) {
          observeUnmount(domElement, (domElement as any).$onUnmount);
        } else {
          queueMicrotask(() => {
            if (domElement.parentNode) {
              observeUnmount(domElement, (domElement as any).$onUnmount);
            }
          });
        }
        return;
      }

      // event props: delegate globally; still keep defuss lifecycle hooks
      const parsed = parseEventPropName(name);
      if (parsed && typeof value === "function") {
        const { eventType, capture } = parsed;

        if (eventType === "mount") {
          (domElement as any).$onMount = queueCallback(value as () => void);
          return;
        }

        if (eventType === "unmount") {
          if ((domElement as any).$onUnmount) {
            const existingUnmount = (domElement as any).$onUnmount as () => void;
            (domElement as any).$onUnmount = () => {
              existingUnmount();
              (value as () => void)();
            };
          } else {
            (domElement as any).$onUnmount = queueCallback(value as () => void);
          }
          return;
        }

        registerDelegatedEvent(domElement as HTMLElement, eventType, value as EventListener, { capture });
        return;
      }

      // transforms className="..." -> class="..."
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }

      // transforms class={['a', 'b']} into class="a b"
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.filter(val => !!val).join(" ");
      }

      // SVG support
      const nsEndIndex = name.match(/[A-Z]/)?.index;
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase();
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
        const namespace = nsMap[ns as keyof typeof nsMap] || null;
        domElement.setAttributeNS(
          namespace,
          ns === XLINK_ATTRIBUTE_NAME || ns === XMLNS_ATTRIBUTE_NAME
            ? `${ns}:${attrName}`
            : name,
          String(value),
        );
      } else if (name === "style" && typeof value !== "string") {
        const styleObj = value as Record<string, string | number>;
        for (const prop of Object.keys(styleObj)) {
          (domElement as HTMLElement).style[prop as any] = String(styleObj[prop]);
        }
      } else if (typeof value === "boolean") {
        (domElement as any)[name] = value;
      } else if (
        // Controlled input props: use property assignment, not setAttribute
        // setAttribute updates the default value, property updates the live value
        (name === "value" || name === "checked" || name === "selectedIndex") &&
        (domElement.nodeName === "INPUT" ||
          domElement.nodeName === "TEXTAREA" ||
          domElement.nodeName === "SELECT")
      ) {
        (domElement as any)[name] = value;
      } else {
        domElement.setAttribute(name, String(value));
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

/**
 * React-compatible render function.
 * Renders JSX content into a container element using defuss' DOM morphing engine.
 * 
 * @example
 * ```tsx
 * import { render, $ } from "defuss";
 * 
 * const App = () => <div>Hello World</div>;
 * 
 * // Using with $ selector
 * render(<App />, $("#app").current);
 * 
 * // Using with direct element
 * render(<App />, document.getElementById("app"));
 * ```
 */
export const render = (
  jsx: SyncRenderInput,
  container: Element | null | undefined,
): void => {
  if (!container) {
    console.warn("render: container is null or undefined");
    return;
  }

  const globals: Globals = {
    window: container.ownerDocument?.defaultView ?? (globalThis as unknown as Window),
  } as Globals;

  // Use updateDomWithVdom for intelligent DOM morphing (preserves state, event listeners, etc.)
  updateDomWithVdom(container as HTMLElement, jsx as RenderInput, globals);
};

/**
 * @deprecated Use render instead. Will be removed in v4.
 */
export const renderInto = render;

export const isJSX = (o: any): boolean => {
  if (o === null || typeof o !== "object") return false;
  // Arrays are valid JSX - fragments and child arrays
  // Each element can be a VNode, string, or number (text nodes)
  if (Array.isArray(o)) {
    return o.every((item) =>
      isJSX(item) || typeof item === "string" || typeof item === "number"
    );
  }
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

  // Helper to derive globals from an element (SSR/multi-window compatible)
  const getGlobalsFromElement = (el: NodeType): Globals => {
    const win = (el as Element).ownerDocument?.defaultView;
    return (win as unknown as Globals) ?? (globalThis as unknown as Globals);
  };

  if (typeof processedInput === "object" && processedInput !== null && "nodeType" in processedInput && typeof (processedInput as any).nodeType === "number") {
    // Convert DOM node to VNode and use the intelligent updateDomWithVdom
    // This preserves existing DOM structure and event listeners
    const vnode = domNodeToVNode(processedInput);
    nodes.forEach((el) => {
      if (el) {
        updateDomWithVdom(el as HTMLElement, vnode, getGlobalsFromElement(el));
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
          updateDomWithVdom(el as HTMLElement, vNodes, getGlobalsFromElement(el));
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
            getGlobalsFromElement(el),
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
          getGlobalsFromElement(el),
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
