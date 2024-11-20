import type { RenderInput } from "../render/types.js";

// return type of any call to $(...) 
export interface Dequery {
  // reference to the DOM element
  el?: Element | null;
  // methods
  attr(name: string, value?: string): string | null | Dequery;
  val(value?: string | boolean): string | boolean | Dequery;
  empty(): Dequery;
  html(vdomOrHTML: RenderInput|string): Dequery;
  text(text: string): Dequery;
  remove(): Dequery;
  replaceWith(vdomOrNode: RenderInput|Node): Node;
  addClass(className: Array<string> | string): Dequery;
  removeClass(className: Array<string> | string): Dequery;
  hasClass(className: string): boolean;
  toggleClass(className: string): Dequery;
  on(eventName: string, handler: EventListener): Dequery;
  off(eventName: string, handler: EventListener): Dequery;
}