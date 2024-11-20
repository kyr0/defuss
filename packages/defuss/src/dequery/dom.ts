import { renderIsomorphic, type Globals } from "../render/index.js";
import type { RenderInput } from "../render/types.js";
import type { Dequery } from "./types.js";

export const attr = (el: Element, impl: Dequery) => (name: string, value?: any) => {
  if (typeof value === 'undefined') return el.getAttribute(name);
  el.setAttribute(name, value);
  return impl;
};

export const val = (el: Element, impl: Dequery) => (value?: any) => {
  const isCheckbox = (el as any).type === 'checkbox';
  if (typeof value === 'undefined') {
    return isCheckbox ? (el as any).checked : (el as any).value;
  }
  if (isCheckbox) {
    (el as any).checked = value;
  } else {
    (el as any).value = value;
  }
  return impl;
};

export const empty = (el: Element, impl: Dequery) => () => {
  el.innerHTML = '';
  return impl;
};

export const html = (el: Element, impl: Dequery) => (vdomOrHTML: RenderInput|string) => {

  if (typeof vdomOrHTML === 'string') {
    el.innerHTML = vdomOrHTML;
  } else {
    // remove all children
    empty(el, impl)();
    el.appendChild(renderIsomorphic(vdomOrHTML, el, globalThis as Globals) as Node);
  }
  return impl;
};

export const text = (el: Element, impl: Dequery) => (text: string) => {
  el.textContent = text;
  return impl;
};

export const remove = (el: Element, impl: Dequery) => () => {
  if (el.parentNode) el.parentNode.removeChild(el);
  return impl;
};

export const replaceWith = (el: Element) => (vdomOrNode: RenderInput|Node) => {

  // assume it's a Node
  let newEl: Node = vdomOrNode as Node;

  // but if it's not, lets construct one from VDOM
  if (!(vdomOrNode instanceof Node)) {
    newEl = renderIsomorphic(vdomOrNode, el, globalThis as Globals) as Node;
  }

  // replace the old element with the new one
  if (el.parentNode) {
    el.parentNode.replaceChild(newEl, el);
  }
  return newEl;
};

export const off = (target: Element | Window, impl: Dequery) => (eventName: string, handler: EventListener) => {
  target.removeEventListener(eventName, handler);
  return impl;
};

export const on = (target: Element | Window, impl: Dequery) => (eventName: string, handler: EventListener) => {
  target.addEventListener(eventName, handler);
  return impl;
};