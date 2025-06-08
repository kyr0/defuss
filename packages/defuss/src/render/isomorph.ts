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
} from "./types.js";
import {
  domNodeToVNode,
  htmlStringToVNodes,
  isMarkup,
  updateDomWithVdom,
} from "../common/dom.js";
import { waitForRef } from "defuss-runtime";
import { queueCallback } from "../common/queue.js";

const CLASS_ATTRIBUTE_NAME = "class";
const XLINK_ATTRIBUTE_NAME = "xlink";
const XMLNS_ATTRIBUTE_NAME = "xmlns";
const REF_ATTRIBUTE_NAME = "ref";

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

export const jsx = (
  type: VNodeType | Function | any,
  attributes:
    | (JSX.HTMLAttributes & JSX.SVGAttributes & Record<string, any>)
    | null,
  key?: string,
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

      // TODO: use DANGROUSLY_SET_INNER_HTML_ATTRIBUTE here
      if (name === "dangerouslySetInnerHTML") return; // special case, handled elsewhere

      // save ref as { current: DOMElement } in ref object
      // allows for ref={someRef}
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        value.current = domElement; // update ref
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
          (domElement as any).$onUnmount = queueCallback(value); // DOM event lifecycle hook
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
  sourceInfo?: string,
  selfReference?: any,
): Array<VNode> | VNode => {
  let renderResult: Array<VNode> | VNode;
  try {
    renderResult = jsx(type, attributes, key);
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

/**
 * Core DOM update logic extracted from the update() method.
 * This function handles the actual DOM manipulation without the createCall wrapper,
 * allowing it to be used by both update() and replaceWith() without deadlock.
 */
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
  transitionConfig?: import("./transitions.js").TransitionConfig,
): Promise<readonly NodeType[]> {
  // Handle transitions if configuration is provided
  if (transitionConfig && transitionConfig.type !== "none") {
    const {
      getTransitionStyles,
      applyStyles,
      storeOriginalStyles,
      restoreOriginalStyles,
      waitForTransition,
      createContentSnapshot,
      insertContentSnapshot,
      removeContentSnapshot,
      DEFAULT_TRANSITION_CONFIG,
    } = await import("./transitions.js");

    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transitionConfig };
    const { duration = 300, easing = "ease-in-out", delay = 0 } = config;

    // Get transition styles - either custom or predefined
    const transitionStyles =
      config.styles ||
      getTransitionStyles(config.type || "fade", duration, easing);

    // Apply transitions to each target node
    const transitionPromises = nodes.map(async (node) => {
      if (!node || !(node as HTMLElement).parentElement) {
        // If no parent element, just do regular update without transition
        await performCoreDomUpdate(input, [node], timeout, Parser);
        return node;
      }

      const element = node as HTMLElement;
      const parentElement = element.parentElement!;

      // Create a snapshot of the current content for true crossfade
      let contentSnapshot: HTMLElement | null = null;
      const shouldUseSnapshot = config.type === "fade";

      if (shouldUseSnapshot) {
        try {
          contentSnapshot = createContentSnapshot(element);
          insertContentSnapshot(contentSnapshot, element);
        } catch (error) {
          console.warn(
            "Failed to create content snapshot, falling back to regular transition:",
            error,
          );
          contentSnapshot = null;
        }
      }

      // Store original styles that we'll modify
      const stylesToStore = [
        "opacity",
        "transform",
        "transition",
        "overflow",
        "position",
        "z-index",
      ];
      const originalStyles = storeOriginalStyles(parentElement, stylesToStore);

      try {
        // Apply delay if specified
        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        // Apply exit styles to start the transition out
        applyStyles(parentElement, transitionStyles.exit);

        // Force reflow
        parentElement.offsetHeight;

        // Apply exit-active styles to trigger the transition
        applyStyles(parentElement, transitionStyles.exitActive);

        // Wait for exit transition to reach midpoint (half duration)
        await waitForTransition(parentElement, duration / 2);

        // Now perform the actual DOM update at the crossfade midpoint
        await performCoreDomUpdate(input, [node], timeout, Parser);

        // Apply enter styles for the new content (starting from midpoint opacity)
        applyStyles(parentElement, transitionStyles.enter);

        // Force reflow
        parentElement.offsetHeight;

        // Apply enter-active styles to transition in
        applyStyles(parentElement, transitionStyles.enterActive);

        // Wait for enter transition to complete (remaining half duration)
        await waitForTransition(parentElement, duration / 2);

        // Clean up content snapshot
        if (contentSnapshot) {
          removeContentSnapshot(contentSnapshot);
        }

        // Restore original styles
        restoreOriginalStyles(parentElement, originalStyles);
      } catch (error) {
        // On error, clean up snapshot and restore original styles
        if (contentSnapshot) {
          removeContentSnapshot(contentSnapshot);
        }
        restoreOriginalStyles(parentElement, originalStyles);
        throw error;
      }

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
