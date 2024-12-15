import type { Ref } from "../render/types.js";
import { addClass, hasClass, removeClass, toggleClass } from "./css.js";
import { attr, val, empty, html, remove, replaceWith, on, off, text, append } from "./dom.js";
import type { Dequery } from "./types.js";

export const $ = (elOrRef: Element|Ref|string): Dequery => {

  let impl: Dequery = {} as Dequery;

  // unwrap the Ref's current value if it exists
  let el = ((elOrRef as Ref)?.current || elOrRef) as Element;

  // TODO: needs serious rework to support multiple elements

  // if it's a string, assume it's a selector
  if (typeof elOrRef === 'string') {
    el = document.querySelector(elOrRef) as Element;
  }

  // TODO: needs rework to support waiting for elements when selecting
  impl = {
    el,
    attr: attr(el, impl),
    val: val(el, impl),
    empty: empty(el, impl),
    html: html(el, impl),
    text: text(el, impl),
    remove: remove(el, impl),
    replaceWith: replaceWith(el),
    addClass: addClass(el, impl),
    removeClass: removeClass(el, impl),
    toggleClass: toggleClass(el, impl),
    hasClass: hasClass(el),
    on: on(el, impl),
    off: off(el, impl),
    append: append(el, impl),
  };
  return impl;
};