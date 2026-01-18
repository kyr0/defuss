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
  document.documentElement.appendChild(htmlElement);
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
