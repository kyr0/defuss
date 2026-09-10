const queueCallback = (cb) => (...args) => queueMicrotask(() => cb(...args));

const CAPTURE_ONLY_EVENTS = /* @__PURE__ */ new Set([
  "focus",
  "blur",
  "scroll",
  "mouseenter",
  "mouseleave"
  // Note: focusin/focusout DO bubble, so they're not included here
]);
const elementHandlerMap = /* @__PURE__ */ new WeakMap();
const bubbleDispatched = /* @__PURE__ */ new WeakMap();
const captureDispatched = /* @__PURE__ */ new WeakMap();
const activeDispatches = /* @__PURE__ */ new WeakMap();
const parseEventPropName = (propName) => {
  if (!propName.startsWith("on")) return null;
  const raw = propName.slice(2);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const isCapture = lower.endsWith("capture");
  const eventType = isCapture ? lower.slice(0, -"capture".length) : lower;
  if (!eventType) return null;
  return { eventType, capture: isCapture };
};
const getOrCreateElementHandlers = (el) => {
  const existing = elementHandlerMap.get(el);
  if (existing) return existing;
  const created = /* @__PURE__ */ new Map();
  elementHandlerMap.set(el, created);
  return created;
};
const getEventPath = (event) => {
  const composedPath = event.composedPath?.();
  if (composedPath && composedPath.length > 0) return composedPath;
  const path = [];
  let node = event.target;
  while (node) {
    path.push(node);
    const maybeNode = node;
    if (typeof maybeNode === "object" && maybeNode && "parentNode" in maybeNode) {
      node = maybeNode.parentNode;
      continue;
    }
    break;
  }
  const doc = event.target?.ownerDocument;
  if (doc && path[path.length - 1] !== doc) path.push(doc);
  const win = doc?.defaultView;
  if (win && path[path.length - 1] !== win) path.push(win);
  return path;
};
const createPhaseHandler = (eventType, phase) => {
  const dispatched = phase === "capture" ? captureDispatched : bubbleDispatched;
  return (event) => {
    const path = getEventPath(event).filter(
      (t) => typeof t === "object" && t !== null && t.nodeType === 1
    );
    const ordered = phase === "capture" ? [...path].reverse() : path;
    for (const target of ordered) {
      const handlersByEvent = elementHandlerMap.get(target);
      if (!handlersByEvent) continue;
      const entry = handlersByEvent.get(eventType);
      if (!entry) continue;
      let targets = dispatched.get(event);
      if (targets?.has(target)) continue;
      if (!targets) {
        targets = /* @__PURE__ */ new WeakSet();
        dispatched.set(event, targets);
      }
      targets.add(target);
      const dispatchKey = `${eventType}:${phase}`;
      let activeSet = activeDispatches.get(target);
      if (activeSet?.has(dispatchKey)) continue;
      if (!activeSet) {
        activeSet = /* @__PURE__ */ new Set();
        activeDispatches.set(target, activeSet);
      }
      activeSet.add(dispatchKey);
      try {
        if (phase === "capture") {
          if (entry.capture) {
            entry.capture.call(target, event);
            if (event.cancelBubble)
              return;
          }
          if (entry.captureSet) {
            for (const handler of entry.captureSet) {
              handler.call(target, event);
              if (event.cancelBubble)
                return;
            }
          }
        } else {
          if (entry.bubble) {
            entry.bubble.call(target, event);
            if (event.cancelBubble)
              return;
          }
          if (entry.bubbleSet) {
            for (const handler of entry.bubbleSet) {
              handler.call(target, event);
              if (event.cancelBubble)
                return;
            }
          }
        }
      } finally {
        activeSet.delete(dispatchKey);
      }
    }
  };
};
const installedRootListeners = /* @__PURE__ */ new WeakMap();
const ensureRootListener = (root, eventType) => {
  const installed = installedRootListeners.get(root) ?? /* @__PURE__ */ new Set();
  installedRootListeners.set(root, installed);
  const captureKey = `${eventType}:capture`;
  if (!installed.has(captureKey)) {
    root.addEventListener(
      eventType,
      createPhaseHandler(eventType, "capture"),
      true
    );
    installed.add(captureKey);
  }
  const bubbleKey = `${eventType}:bubble`;
  if (!installed.has(bubbleKey)) {
    root.addEventListener(
      eventType,
      createPhaseHandler(eventType, "bubble"),
      false
    );
    installed.add(bubbleKey);
  }
};
const getEventRoot = (element) => {
  const root = element.getRootNode();
  if (root && root.nodeType === 9) {
    return root;
  }
  if (root && root.nodeType === 11 && "host" in root) {
    return root;
  }
  return null;
};
const registerDelegatedEvent = (element, eventType, handler, options = {}) => {
  const root = getEventRoot(element);
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
  if (root) {
    ensureRootListener(root, eventType);
  } else if (element.ownerDocument) {
    ensureRootListener(element.ownerDocument, eventType);
  } else {
    element.addEventListener(eventType, handler, capture);
  }
  const byEvent = getOrCreateElementHandlers(element);
  const entry = byEvent.get(eventType) ?? {};
  byEvent.set(eventType, entry);
  if (options.multi) {
    if (capture) {
      if (!entry.captureSet) entry.captureSet = /* @__PURE__ */ new Set();
      entry.captureSet.add(handler);
    } else {
      if (!entry.bubbleSet) entry.bubbleSet = /* @__PURE__ */ new Set();
      entry.bubbleSet.add(handler);
    }
  } else {
    if (capture) {
      entry.capture = handler;
    } else {
      entry.bubble = handler;
    }
  }
};
const removeDelegatedEvent = (target, eventType, handler, _options = {}) => {
  const byEvent = elementHandlerMap.get(target);
  if (!byEvent) return;
  const entry = byEvent.get(eventType);
  if (!entry) return;
  if (handler) {
    if (entry.captureSet) {
      entry.captureSet.delete(handler);
    }
    if (entry.bubbleSet) {
      entry.bubbleSet.delete(handler);
    }
    if (entry.capture === handler) {
      entry.capture = void 0;
    }
    if (entry.bubble === handler) {
      entry.bubble = void 0;
    }
    target.removeEventListener(eventType, handler, true);
    target.removeEventListener(eventType, handler, false);
  } else {
    entry.capture = void 0;
    entry.bubble = void 0;
    entry.captureSet = void 0;
    entry.bubbleSet = void 0;
  }
  const isEmpty = !entry.capture && !entry.bubble && (!entry.captureSet || entry.captureSet.size === 0) && (!entry.bubbleSet || entry.bubbleSet.size === 0);
  if (isEmpty) {
    byEvent.delete(eventType);
  }
};
const clearDelegatedEvents = (target) => {
  const byEvent = elementHandlerMap.get(target);
  if (!byEvent) return;
  byEvent.clear();
};
const clearDelegatedEventsDeep = (root) => {
  clearDelegatedEvents(root);
  const doc = root.ownerDocument;
  if (!doc) return;
  const walker = doc.createTreeWalker(
    root,
    1
    /* NodeFilter.SHOW_ELEMENT */
  );
  let node = walker.nextNode();
  while (node) {
    clearDelegatedEvents(node);
    node = walker.nextNode();
  }
};
const getRegisteredEventTypes = (element) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return /* @__PURE__ */ new Set();
  return new Set(byEvent.keys());
};
const getRegisteredEventKeys = (element) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return /* @__PURE__ */ new Set();
  const keys = /* @__PURE__ */ new Set();
  for (const [eventType, entry] of byEvent) {
    if (entry.bubble || entry.bubbleSet?.size) keys.add(`${eventType}:bubble`);
    if (entry.capture || entry.captureSet?.size)
      keys.add(`${eventType}:capture`);
  }
  return keys;
};
const removeDelegatedEventByKey = (element, eventType, phase) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return;
  const entry = byEvent.get(eventType);
  if (!entry) return;
  if (phase === "capture") {
    entry.capture = void 0;
    entry.captureSet = void 0;
  } else {
    entry.bubble = void 0;
    entry.bubbleSet = void 0;
  }
  const isEmpty = !entry.capture && !entry.bubble && (!entry.captureSet || entry.captureSet.size === 0) && (!entry.bubbleSet || entry.bubbleSet.size === 0);
  if (isEmpty) byEvent.delete(eventType);
};

const CLASS_ATTRIBUTE_NAME = "class";
const XLINK_ATTRIBUTE_NAME = "xlink";
const XMLNS_ATTRIBUTE_NAME = "xmlns";
const REF_ATTRIBUTE_NAME = "ref";
const DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";
const nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: "http://www.w3.org/2000/xmlns/",
  [XLINK_ATTRIBUTE_NAME]: "http://www.w3.org/1999/xlink",
  svg: "http://www.w3.org/2000/svg"
};
const observeUnmount = (domNode, onUnmount) => {
  if (!domNode || typeof onUnmount !== "function") {
    throw new Error(
      "Invalid arguments. Ensure domNode and onUnmount are valid."
    );
  }
  if (typeof MutationObserver === "undefined") {
    return;
  }
  let parentNode = domNode.parentNode;
  if (!parentNode) {
    throw new Error("The provided domNode does not have a parentNode.");
  }
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            queueMicrotask(() => {
              if (!domNode.isConnected) {
                onUnmount();
                observer.disconnect();
                return;
              }
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
  observer.observe(parentNode, { childList: true });
};
const handleLifecycleEventsForOnMount = (newEl) => {
  if (typeof newEl?.$onMount === "function") {
    newEl.$onMount(newEl);
    newEl.$onMount = null;
  }
  if (typeof newEl?.$onUnmount === "function") {
    observeUnmount(newEl, newEl.$onUnmount);
  }
};
const getRenderer = (document) => {
  const renderer = {
    hasElNamespace: (domElement) => domElement.namespaceURI === nsMap.svg,
    hasSvgNamespace: (parentElement, type) => renderer.hasElNamespace(parentElement) && type !== "STYLE" && type !== "SCRIPT",
    createElementOrElements: (virtualNode, parentDomElement) => {
      if (Array.isArray(virtualNode)) {
        return renderer.createChildElements(virtualNode, parentDomElement);
      }
      if (typeof virtualNode !== "undefined") {
        return renderer.createElement(virtualNode, parentDomElement);
      }
      return renderer.createTextNode("", parentDomElement);
    },
    createElement: (virtualNode, parentDomElement) => {
      let newEl;
      try {
        if (typeof virtualNode === "function" && virtualNode.constructor.name === "AsyncFunction") {
          newEl = document.createElement("div");
        } else if (typeof virtualNode === "object" && virtualNode !== null && "type" in virtualNode) {
          const vNode = virtualNode;
          if (typeof vNode.type === "function") {
            newEl = document.createElement("div");
            newEl.innerText = `FATAL ERROR: ${vNode.type._error}`;
          } else if (
            // SVG support
            typeof vNode.type === "string" && vNode.type.toUpperCase() === "SVG" || parentDomElement && renderer.hasSvgNamespace(
              parentDomElement,
              typeof vNode.type === "string" ? vNode.type.toUpperCase() : ""
            )
          ) {
            newEl = document.createElementNS(nsMap.svg, vNode.type);
          } else {
            newEl = document.createElement(vNode.type);
          }
          if (vNode.attributes) {
            renderer.setAttributes(vNode, newEl);
            if (vNode.attributes.dangerouslySetInnerHTML) {
              newEl.innerHTML = vNode.attributes.dangerouslySetInnerHTML.__html;
            }
          }
          if (vNode.children && !vNode.attributes?.dangerouslySetInnerHTML) {
            renderer.createChildElements(vNode.children, newEl);
          }
        } else {
          if (typeof virtualNode === "string" || typeof virtualNode === "number") {
            newEl = document.createElement(String(virtualNode));
          }
        }
        if (newEl && parentDomElement) {
          parentDomElement.appendChild(newEl);
          handleLifecycleEventsForOnMount(newEl);
        }
      } catch (e) {
        console.error(
          "Fatal error! Error happend while rendering the VDOM!",
          e,
          virtualNode
        );
        throw e;
      }
      return newEl;
    },
    createTextNode: (text, domElement) => {
      const node = document.createTextNode(text.toString());
      if (domElement) {
        domElement.appendChild(node);
      }
      return node;
    },
    createChildElements: (virtualChildren, domElement) => {
      const children = [];
      for (let i = 0; i < virtualChildren.length; i++) {
        const virtualChild = virtualChildren[i];
        if (typeof virtualChild === "boolean") {
          continue;
        }
        if (virtualChild === null || typeof virtualChild !== "object" && typeof virtualChild !== "function") {
          children.push(
            renderer.createTextNode(
              (typeof virtualChild === "undefined" || virtualChild === null ? "" : virtualChild).toString(),
              domElement
            )
          );
        } else {
          children.push(
            renderer.createElement(virtualChild, domElement)
          );
        }
      }
      return children;
    },
    setAttribute: (name, value, domElement) => {
      if (typeof value === "undefined") return;
      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE) return;
      if (name === "key") {
        domElement._defussKey = String(value);
        return;
      }
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        const ref = value;
        ref.current = domElement;
        domElement._defussRef = value;
        domElement.$onUnmount = queueCallback(() => {
        });
        if (domElement.parentNode) {
          observeUnmount(domElement, domElement.$onUnmount);
        } else {
          queueMicrotask(() => {
            if (domElement.parentNode) {
              observeUnmount(domElement, domElement.$onUnmount);
            }
          });
        }
        return;
      }
      const parsed = parseEventPropName(name);
      if (parsed && typeof value === "function") {
        const { eventType, capture } = parsed;
        if (eventType === "mount") {
          domElement.$onMount = queueCallback(value);
          return;
        }
        if (eventType === "unmount") {
          if (domElement.$onUnmount) {
            const existingUnmount = domElement.$onUnmount;
            domElement.$onUnmount = () => {
              existingUnmount();
              value();
            };
          } else {
            domElement.$onUnmount = queueCallback(value);
          }
          return;
        }
        registerDelegatedEvent(
          domElement,
          eventType,
          value,
          { capture }
        );
        return;
      }
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.filter((val) => !!val).join(" ");
      }
      const nsEndIndex = name.match(/[A-Z]/)?.index;
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase();
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
        const namespace = nsMap[ns] || null;
        domElement.setAttributeNS(
          namespace,
          ns === XLINK_ATTRIBUTE_NAME || ns === XMLNS_ATTRIBUTE_NAME ? `${ns}:${attrName}` : name,
          String(value)
        );
      } else if (name === "style" && typeof value !== "string") {
        const styleObj = value;
        for (const prop of Object.keys(styleObj)) {
          domElement.style[prop] = String(
            styleObj[prop]
          );
        }
      } else if (typeof value === "boolean") {
        domElement[name] = value;
        if (value) {
          domElement.setAttribute(name, "");
        } else {
          domElement.removeAttribute(name);
        }
      } else if (
        // Controlled input props: use property assignment for live value,
        // AND setAttribute so SSG serialization (w3c-xmlserializer) includes it
        (name === "value" || name === "checked" || name === "selectedIndex") && (domElement.nodeName === "INPUT" || domElement.nodeName === "TEXTAREA" || domElement.nodeName === "SELECT")
      ) {
        domElement[name] = value;
        if (name === "checked") {
          if (value) {
            domElement.setAttribute("checked", "");
          } else {
            domElement.removeAttribute("checked");
          }
        } else if (name === "value") {
          domElement.setAttribute("value", String(value));
        }
      } else {
        domElement.setAttribute(name, String(value));
      }
    },
    setAttributes: (virtualNode, domElement) => {
      const attrNames = Object.keys(virtualNode.attributes);
      for (let i = 0; i < attrNames.length; i++) {
        renderer.setAttribute(
          attrNames[i],
          virtualNode.attributes[attrNames[i]],
          domElement
        );
      }
    }
  };
  return renderer;
};

const FROM_DOM_MARKER = Symbol("defuss-morph.from-dom");
const HTML_BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
]);
const domAttributeToVNodeValue = (attr) => HTML_BOOLEAN_ATTRIBUTES.has(attr.name.toLowerCase()) ? true : attr.value;
function parseDOM(input, type, Parser) {
  return new Parser().parseFromString(input, type);
}
function isSVG(input, Parser) {
  const doc = parseDOM(input, "image/svg+xml", Parser);
  if (!doc.documentElement) return false;
  return doc.documentElement.nodeName.toLowerCase() === "svg";
}
function isHTML(input, Parser) {
  const doc = parseDOM(input, "text/html", Parser);
  return doc.documentElement.querySelectorAll("*").length > 2;
}
const isMarkup = (input, Parser) => input.indexOf("<") > -1 && input.indexOf(">") > -1 && (isHTML(input, Parser) || isSVG(input, Parser));
function renderMarkup(markup, Parser, doc) {
  const parsed = doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser);
  if (parsed.body) return Array.from(parsed.body.childNodes);
  return parsed.documentElement ? [parsed.documentElement] : [];
}
function getMimeType(input, Parser) {
  if (isSVG(input, Parser)) {
    return "image/svg+xml";
  }
  return "text/html";
}
function domNodeToVNode(node) {
  if (node.nodeType === 3) {
    return node.textContent || "";
  }
  if (node.nodeType === 1) {
    const element = node;
    const attributes = {};
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = domAttributeToVNodeValue(attr);
    }
    const children = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }
    return {
      type: element.tagName.toLowerCase(),
      attributes: { ...attributes, [FROM_DOM_MARKER]: true },
      children
    };
  }
  return "";
}
function htmlStringToVNodes(html, Parser) {
  const parser = new Parser();
  const doc = parser.parseFromString(html, "text/html");
  const vNodes = [];
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }
  return vNodes;
}

const areDomNodesEqual = (oldNode, newNode) => {
  if (oldNode === newNode) return true;
  if (oldNode.nodeType !== newNode.nodeType) return false;
  if (oldNode.nodeType === 1) {
    const oldElement = oldNode;
    const newElement = newNode;
    if (oldElement.tagName !== newElement.tagName) return false;
    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;
    if (oldAttrs.length !== newAttrs.length) return false;
    for (let i = 0; i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue) return false;
    }
  }
  if (oldNode.nodeType === 3) {
    if (oldNode.textContent !== newNode.textContent) return false;
  }
  return true;
};
function isTextLike(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isVNode(value) {
  return Boolean(
    value && typeof value === "object" && "type" in value
  );
}
function toValidChild(child) {
  if (child == null) return child;
  if (isTextLike(child)) return child;
  if (isVNode(child)) return child;
  return void 0;
}
function normalizeChildren(input) {
  const raw = [];
  const pushChild = (child) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild);
      return;
    }
    const valid = toValidChild(child);
    if (typeof valid === "undefined") return;
    if (isVNode(valid) && (valid.type === "fragment" || valid.type === "Fragment")) {
      const nested = Array.isArray(valid.children) ? valid.children : [];
      nested.forEach(pushChild);
      return;
    }
    if (valid === null || typeof valid === "undefined" || typeof valid === "boolean")
      return;
    raw.push(valid);
  };
  pushChild(input);
  const fused = [];
  let buffer = null;
  const flush = () => {
    if (buffer !== null && buffer.length > 0) fused.push(buffer);
    buffer = null;
  };
  for (const child of raw) {
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      buffer = (buffer ?? "") + String(child);
      continue;
    }
    flush();
    fused.push(child);
  }
  flush();
  return fused;
}
function getVNodeMatchKey(child) {
  if (!child || typeof child !== "object") return null;
  const key = child.attributes?.key;
  if (typeof key === "string" || typeof key === "number")
    return `k:${String(key)}`;
  const id = child.attributes?.id;
  if (typeof id === "string" && id.length > 0) return `id:${id}`;
  return null;
}
function getDomMatchKeys(node) {
  if (node.nodeType !== 1) return [];
  const el = node;
  const keys = [];
  const internalKey = el._defussKey;
  if (internalKey) keys.push(`k:${internalKey}`);
  const attrKey = el.getAttribute("key");
  if (attrKey) keys.push(`k:${attrKey}`);
  const id = el.id;
  if (id) keys.push(`id:${id}`);
  return keys;
}
function areNodeAndChildMatching(domNode, child) {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return domNode.nodeType === 3;
  }
  if (child && typeof child === "object") {
    if (domNode.nodeType !== 1) return false;
    const el = domNode;
    const oldTag = el.tagName.toLowerCase();
    const newTag = typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newTag || oldTag !== newTag) return false;
    return true;
  }
  return false;
}
function createDomFromChild(child, globals) {
  const renderer = getRenderer(globals.window.document);
  if (child == null) return void 0;
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return [globals.window.document.createTextNode(String(child))];
  }
  const created = renderer.createElementOrElements(child);
  if (!created) return void 0;
  const nodes = Array.isArray(created) ? created : [created];
  return nodes.filter(Boolean);
}
function shouldPreserveFormStateAttribute(el, attrName, vnode) {
  const tag = el.tagName.toLowerCase();
  const hasExplicit = Object.hasOwn(vnode.attributes ?? {}, attrName);
  if (hasExplicit) return false;
  if (tag === "input") return attrName === "value" || attrName === "checked";
  if (tag === "textarea") return attrName === "value";
  if (tag === "select") return attrName === "value";
  return false;
}
function patchElementInPlace(el, vnode, globals) {
  const renderer = getRenderer(globals.window.document);
  const existingAttrs = Array.from(el.attributes);
  const nextAttrs = vnode.attributes ?? {};
  for (const attr of existingAttrs) {
    const { name } = attr;
    if (name === "key") continue;
    if (name.startsWith("on")) continue;
    if (name === "class" && (Object.hasOwn(nextAttrs, "class") || Object.hasOwn(nextAttrs, "className"))) {
      continue;
    }
    if (!Object.hasOwn(nextAttrs, name)) {
      if (shouldPreserveFormStateAttribute(el, name, vnode)) continue;
      el.removeAttribute(name);
    }
  }
  const preserveDelegatedHandlers = Boolean(
    nextAttrs[FROM_DOM_MARKER]
  );
  if (!preserveDelegatedHandlers) {
    const registeredKeys = getRegisteredEventKeys(el);
    const nextEventKeys = /* @__PURE__ */ new Set();
    for (const propName of Object.keys(nextAttrs)) {
      const parsed = parseEventPropName(propName);
      if (parsed) {
        const phase = parsed.capture ? "capture" : "bubble";
        nextEventKeys.add(`${parsed.eventType}:${phase}`);
      }
    }
    for (const key of registeredKeys) {
      if (!nextEventKeys.has(key)) {
        const [eventType, phase] = key.split(":");
        removeDelegatedEventByKey(
          el,
          eventType,
          phase
        );
      }
    }
  }
  renderer.setAttributes(vnode, el);
  handleLifecycleEventsForOnMount(el);
  const d = vnode.attributes?.dangerouslySetInnerHTML;
  if (d && typeof d === "object" && typeof d.__html === "string") {
    el.innerHTML = d.__html;
    return;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") {
    const isControlled = Object.hasOwn(nextAttrs, "value");
    const isActive = el.ownerDocument?.activeElement === el;
    if (isActive && !isControlled) return;
  }
  morphDomDirect(el, vnode.children ?? [], globals);
}
function morphNode(domNode, child, globals) {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    const text = String(child);
    if (domNode.nodeType === 3) {
      if (domNode.nodeValue !== text) domNode.nodeValue = text;
      return domNode;
    }
    const next = globals.window.document.createTextNode(text);
    domNode.parentNode?.replaceChild(next, domNode);
    return next;
  }
  if (child && typeof child === "object") {
    const newType = typeof child.type === "string" ? child.type : null;
    if (!newType) return domNode;
    if (domNode.nodeType !== 1) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;
      domNode.parentNode?.replaceChild(first, domNode);
      handleLifecycleEventsForOnMount(first);
      return first;
    }
    const el = domNode;
    const oldTag = el.tagName.toLowerCase();
    const newTag = newType.toLowerCase();
    if (oldTag !== newTag) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first) return null;
      el.parentNode?.replaceChild(first, el);
      handleLifecycleEventsForOnMount(first);
      return first;
    }
    patchElementInPlace(el, child, globals);
    return el;
  }
  domNode.parentNode?.removeChild(domNode);
  return null;
}
const renderingNodes = /* @__PURE__ */ new WeakSet();
const pendingMorphs = /* @__PURE__ */ new Map();
const resolveGlobals = (el, globals) => {
  if (globals) return globals;
  const win = el?.ownerDocument?.defaultView ?? globalThis;
  return { window: win };
};
function isAncestorRendering(el) {
  let current = el.parentElement;
  while (current) {
    if (renderingNodes.has(current)) return true;
    current = current.parentElement;
  }
  return false;
}
function flushPendingMorphs() {
  if (pendingMorphs.size === 0) return;
  const snapshot = [...pendingMorphs.entries()];
  pendingMorphs.clear();
  for (const [el, { vdom, globals }] of snapshot) {
    if (!el.isConnected) continue;
    updateDomWithVdom(el, vdom, globals);
  }
}
function updateDomWithVdom(parentElement, newVDOM, globals) {
  const resolvedGlobals = resolveGlobals(parentElement, globals);
  if (renderingNodes.has(parentElement) || isAncestorRendering(parentElement)) {
    pendingMorphs.set(parentElement, { vdom: newVDOM, globals: resolvedGlobals });
    return;
  }
  renderingNodes.add(parentElement);
  try {
    morphDomDirect(parentElement, newVDOM, resolvedGlobals);
  } finally {
    renderingNodes.delete(parentElement);
  }
  flushPendingMorphs();
}
function morphDomDirect(parentElement, newVDOM, globals) {
  const el = parentElement;
  const isCustomElement = el.tagName.includes("-");
  const targetRoot = el.shadowRoot && !isCustomElement ? el.shadowRoot : parentElement;
  const nextChildren = normalizeChildren(newVDOM);
  const existing = Array.from(targetRoot.childNodes);
  const keyedPool = /* @__PURE__ */ new Map();
  const nodeKeys = /* @__PURE__ */ new WeakMap();
  const unkeyedPool = [];
  for (const node of existing) {
    const keys = getDomMatchKeys(node);
    if (keys.length > 0) {
      nodeKeys.set(node, keys);
      let addedToKeyedPool = false;
      for (const k of keys) {
        if (!keyedPool.has(k)) {
          keyedPool.set(k, node);
          addedToKeyedPool = true;
        }
      }
      if (!addedToKeyedPool) {
        unkeyedPool.push(node);
      }
    } else {
      unkeyedPool.push(node);
    }
  }
  const consumeKeyedNode = (node) => {
    const keys = nodeKeys.get(node) ?? [];
    for (const k of keys) keyedPool.delete(k);
  };
  const takeUnkeyedMatch = (child) => {
    for (let i = 0; i < unkeyedPool.length; i++) {
      const candidate = unkeyedPool[i];
      if (areNodeAndChildMatching(candidate, child)) {
        unkeyedPool.splice(i, 1);
        return candidate;
      }
    }
    return void 0;
  };
  let domIndex = 0;
  for (const child of nextChildren) {
    const key = getVNodeMatchKey(child);
    let match;
    if (key) {
      match = keyedPool.get(key);
      if (match) consumeKeyedNode(match);
    } else {
      match = takeUnkeyedMatch(child);
    }
    const anchor = targetRoot.childNodes[domIndex] ?? null;
    if (match) {
      if (match !== anchor) {
        targetRoot.insertBefore(match, anchor);
      }
      morphNode(match, child, globals);
      domIndex++;
      continue;
    }
    const created = createDomFromChild(child, globals);
    if (!created || Array.isArray(created) && created.length === 0) continue;
    const nodes = Array.isArray(created) ? created : [created];
    for (const node of nodes) {
      targetRoot.insertBefore(node, anchor);
      handleLifecycleEventsForOnMount(node);
      domIndex++;
    }
  }
  const remaining = /* @__PURE__ */ new Set();
  for (const node of unkeyedPool) remaining.add(node);
  for (const node of keyedPool.values()) remaining.add(node);
  for (const node of remaining) {
    if (node.parentNode === targetRoot) {
      if (node.nodeType === 1) {
        clearDelegatedEventsDeep(node);
      }
      targetRoot.removeChild(node);
    }
  }
}
function replaceDomWithVdom(parentElement, newVDOM, globals) {
  const resolvedGlobals = resolveGlobals(parentElement, globals);
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  const renderer = getRenderer(resolvedGlobals.window.document);
  const newDom = renderer.createElementOrElements(
    newVDOM
  );
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) {
        parentElement.appendChild(node);
        handleLifecycleEventsForOnMount(node);
      }
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
    handleLifecycleEventsForOnMount(newDom);
  }
}

const injectShakeKeyframes = (doc) => {
  if (!doc) return;
  if (!doc.getElementById("defuss-shake")) {
    const style = doc.createElement("style");
    style.id = "defuss-shake";
    style.textContent = "@keyframes shake{0%,100%{transform:translate3d(0,0,0)}10%,30%,50%,70%,90%{transform:translate3d(-10px,0,0)}20%,40%,60%,80%{transform:translate3d(10px,0,0)}}";
    doc.head.appendChild(style);
  }
};
const getTransitionStyles = (type, duration, easing = "ease-in-out") => {
  const t = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
  const styles = {
    fade: {
      enter: { opacity: "0", transition: t, transform: "translate3d(0,0,0)" },
      enterActive: { opacity: "1" },
      exit: { opacity: "1", transition: t, transform: "translate3d(0,0,0)" },
      exitActive: { opacity: "0" }
    },
    "slide-left": {
      enter: {
        transform: "translate3d(100%,0,0)",
        opacity: "0.5",
        transition: t
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(-100%,0,0)", opacity: "0.5" }
    },
    "slide-right": {
      enter: {
        transform: "translate3d(-100%,0,0)",
        opacity: "0.5",
        transition: t
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(100%,0,0)", opacity: "0.5" }
    },
    shake: (() => {
      injectShakeKeyframes(
        typeof document !== "undefined" ? document : void 0
      );
      return {
        enter: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none"
        },
        enterActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`
        },
        exit: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none"
        },
        exitActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`
        }
      };
    })()
  };
  return styles[type] || { enter: {}, enterActive: {}, exit: {}, exitActive: {} };
};
const applyStyles = (el, styles) => Object.entries(styles).forEach(
  ([k, v]) => el.style.setProperty(k, String(v))
);
const DEFAULT_TRANSITION_CONFIG = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
  target: "parent"
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const performCrossfade = async (element, updateCallback, duration, easing) => {
  const originalStyle = element.style.cssText;
  const snapshot = element.cloneNode(true);
  const doc = element.ownerDocument;
  try {
    const rect = element.getBoundingClientRect();
    snapshot.style.cssText = `position:absolute;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:1;transition:opacity ${duration}ms ${easing};z-index:1000;`;
    element.style.opacity = "0";
    element.style.transition = `opacity ${duration}ms ${easing}`;
    doc.body.appendChild(snapshot);
    await updateCallback();
    void element.offsetHeight;
    snapshot.style.opacity = "0";
    element.style.opacity = "1";
    await wait(duration);
    doc.body.removeChild(snapshot);
  } catch (error) {
    if (snapshot.parentElement) doc.body.removeChild(snapshot);
    throw error;
  } finally {
    element.style.cssText = originalStyle;
  }
};
const performTransition = async (element, updateCallback, config = {}) => {
  const {
    type = "fade",
    duration = 300,
    easing = "ease-in-out",
    delay = 0
  } = { ...DEFAULT_TRANSITION_CONFIG, ...config };
  if (type === "none") {
    await updateCallback();
    return;
  }
  if (delay > 0) await wait(delay);
  if (type === "fade") {
    await performCrossfade(element, updateCallback, duration, easing);
    return;
  }
  const styles = config.styles || getTransitionStyles(type, duration, easing);
  const originalTransition = element.style.transition;
  const originalAnimation = element.style.animation;
  try {
    if (type === "shake") {
      element.style.animation = "none";
      void element.offsetHeight;
    }
    applyStyles(element, styles.exit);
    void element.offsetHeight;
    applyStyles(element, styles.exitActive);
    await wait(duration);
    await updateCallback();
    applyStyles(element, styles.enter);
    void element.offsetHeight;
    applyStyles(element, styles.enterActive);
    await wait(duration);
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
  } catch (error) {
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
    throw error;
  }
};

const inflightTransitions = /* @__PURE__ */ new WeakMap();
const morph = (el, newHTMLString, options = {}) => {
  const globals = resolveGlobals(el);
  const win = globals.window;
  const applyHtml = (html) => updateDomWithVdom(el, htmlStringToVNodes(html, win.DOMParser), globals);
  const transition = options.transition;
  if (transition && transition.type !== "none") {
    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transition };
    const transitionTarget = config.target === "self" ? el : el.parentElement;
    if (!transitionTarget) {
      applyHtml(newHTMLString);
      return;
    }
    const slot2 = { html: newHTMLString };
    inflightTransitions.set(el, slot2);
    return performTransition(
      transitionTarget,
      // apply the latest requested content — but only if this transition
      // still owns the slot; when a newer transition has taken it over (or
      // already completed and cleaned it up), this deferred update is stale
      // and must not clobber the newer content
      async () => {
        if (inflightTransitions.get(el) === slot2) applyHtml(slot2.html);
      },
      config
    ).finally(() => {
      if (inflightTransitions.get(el) === slot2) inflightTransitions.delete(el);
    });
  }
  const slot = inflightTransitions.get(el);
  if (slot) slot.html = newHTMLString;
  applyHtml(newHTMLString);
};

export { CAPTURE_ONLY_EVENTS, CLASS_ATTRIBUTE_NAME, DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE, DEFAULT_TRANSITION_CONFIG, FROM_DOM_MARKER, REF_ATTRIBUTE_NAME, XLINK_ATTRIBUTE_NAME, XMLNS_ATTRIBUTE_NAME, applyStyles, areDomNodesEqual, clearDelegatedEvents, clearDelegatedEventsDeep, domNodeToVNode, getMimeType, getRegisteredEventKeys, getRegisteredEventTypes, getRenderer, getTransitionStyles, handleLifecycleEventsForOnMount, htmlStringToVNodes, isHTML, isMarkup, isSVG, morph, nsMap, observeUnmount, parseDOM, parseEventPropName, performTransition, queueCallback, registerDelegatedEvent, removeDelegatedEvent, removeDelegatedEventByKey, renderMarkup, replaceDomWithVdom, resolveGlobals, updateDomWithVdom };
