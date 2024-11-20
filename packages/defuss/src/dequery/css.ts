import type { Dequery } from "./types.js";

export const addSingleClass = (el: Element, className: string) => {
  if (!el.classList.contains(className)) {
    el.classList.add(className);
  }
};

export const addClass = (el: Element, impl: Dequery) => (className: Array<string> | string) => {
  if (Array.isArray(className)) {
    for (let i = 0; i < className.length; i++) {
      addSingleClass(el, className[i]);
    }
  } else {
    addSingleClass(el, className);
  }
  return impl;
};

export const removeSingleClass = (el: Element, className: string) => {
  if (el.classList.contains(className)) {
    el.classList.remove(className);
  }
};

export const removeClass = (el: Element, impl: Dequery) => (className: Array<string> | string) => {
  if (Array.isArray(className)) {
    for (let i = 0; i < className.length; i++) {
      removeSingleClass(el, className[i]);
    }
  } else {
    removeSingleClass(el, className);
  }
  return impl;
};

export const toggleClass = (el: Element, impl: Dequery) => (className: string) => {
  el.classList.toggle(className);
  return impl;
};

export const hasClass = (el: Element) => (className: string) => el.classList.contains(className);