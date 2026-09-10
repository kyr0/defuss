import type {
  DomAbstractionImpl,
  RenderInput,
  VNode,
  VNodeAttributes,
  VNodeChildren,
} from "./types.js";
import { queueCallback } from "./queue.js";
import {
  parseEventPropName,
  registerDelegatedEvent,
} from "./delegated-events.js";

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
      let newEl: Element | undefined;

      try {
        // if a synchronous function is still a function, VDOM has obviously not resolved, probably an
        // Error occurred while generating the VDOM (in JSX runtime)
        if (
          typeof virtualNode === "function" &&
          virtualNode.constructor.name === "AsyncFunction"
        ) {
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
            (typeof vNode.type === "string" &&
              vNode.type.toUpperCase() === "SVG") ||
            (parentDomElement &&
              renderer.hasSvgNamespace(
                parentDomElement,
                typeof vNode.type === "string" ? vNode.type.toUpperCase() : "",
              ))
          ) {
            // SVG support
            newEl = document.createElementNS(nsMap.svg, vNode.type as string);
          } else {
            newEl = document.createElement(vNode.type as string);
          }

          if (vNode.attributes) {
            renderer.setAttributes(vNode, newEl as Element);

            // apply dangerouslySetInnerHTML if provided
            if (vNode.attributes.dangerouslySetInnerHTML) {
              (newEl as HTMLElement).innerHTML =
                vNode.attributes.dangerouslySetInnerHTML.__html;
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
          if (
            typeof virtualNode === "string" ||
            typeof virtualNode === "number"
          ) {
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

    setAttribute: (name: string, value: any, domElement: Element) => {
      // attributes not set (undefined) are ignored; use null value to reset an attributes state
      if (typeof value === "undefined") return;

      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return;

      // internal list key: store on element, do not serialize into DOM
      if (name === "key") {
        (domElement as HTMLElement & { _defussKey?: string })._defussKey =
          String(value);
        return;
      }

      // save ref as { current: DOMElement } in ref object
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        const ref = value as { current?: unknown; orphan?: boolean };
        ref.current = domElement;
        (domElement as any)._defussRef = value;

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
            const existingUnmount = (domElement as any)
              .$onUnmount as () => void;
            (domElement as any).$onUnmount = () => {
              existingUnmount();
              (value as () => void)();
            };
          } else {
            (domElement as any).$onUnmount = queueCallback(value as () => void);
          }
          return;
        }

        registerDelegatedEvent(
          domElement as HTMLElement,
          eventType,
          value as EventListener,
          { capture },
        );
        return;
      }

      // transforms className="..." -> class="..."
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }

      // transforms class={['a', 'b']} into class="a b"
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.filter((val) => !!val).join(" ");
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
          (domElement as HTMLElement).style[prop as any] = String(
            styleObj[prop],
          );
        }
      } else if (typeof value === "boolean") {
        (domElement as any)[name] = value;
        // Also set/remove the attribute so SSG serialization includes it
        if (value) {
          domElement.setAttribute(name, "");
        } else {
          domElement.removeAttribute(name);
        }
      } else if (
        // Controlled input props: use property assignment for live value,
        // AND setAttribute so SSG serialization (w3c-xmlserializer) includes it
        (name === "value" || name === "checked" || name === "selectedIndex") &&
        (domElement.nodeName === "INPUT" ||
          domElement.nodeName === "TEXTAREA" ||
          domElement.nodeName === "SELECT")
      ) {
        (domElement as any)[name] = value;
        if (name === "checked") {
          if (value) {
            domElement.setAttribute("checked", "");
          } else {
            domElement.removeAttribute("checked");
          }
        } else if (name === "value") {
          domElement.setAttribute("value", String(value));
        }
        // selectedIndex has no HTML attribute equivalent - skip setAttribute
      } else {
        domElement.setAttribute(name, String(value));
      }
    },

    setAttributes: (
      virtualNode: VNode<VNodeAttributes>,
      domElement: Element,
    ) => {
      // attributes are optional on hand-written VNodes — guard instead of the
      // `!` assertion, which crashed patching an element with an
      // attributes-less vnode (Object.keys(undefined) throws)
      const attrNames = Object.keys(virtualNode.attributes ?? {});
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(
          attrNames[i],
          virtualNode.attributes![attrNames[i]],
          domElement,
        );
      }
    },
  };
  return renderer;
};
