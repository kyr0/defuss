import type { VNode, VNodeAttributes } from "./types.js";

/**
 * Marks VNodes derived from existing DOM (HTML strings / DOM nodes).
 * Such VNodes cannot declare event handlers, so the morph engine must
 * preserve delegated handlers already attached to surviving elements
 * (same rationale as uncontrolled form-state preservation).
 */
export const FROM_DOM_MARKER: unique symbol = Symbol("defuss-morph.from-dom");

/**
 * VNode type of an HTML comment: `{ type: "#comment", value }`.
 * Why "#comment": it is the DOM's own nodeName for comments and can never
 * collide with a tag name ("#" is invalid there). The data lives in `value`,
 * not `children`, so generic tree walkers never mistake it for content.
 */
export const COMMENT_TYPE = "#comment";

export type CommentVNode = VNode & { type: typeof COMMENT_TYPE };

export const isCommentVNode = (value: unknown): value is CommentVNode =>
  !!value &&
  typeof value === "object" &&
  (value as VNode).type === COMMENT_TYPE;

const HTML_BOOLEAN_ATTRIBUTES = new Set([
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
  "selected",
]);

const domAttributeToVNodeValue = (attr: Attr): string | boolean =>
  HTML_BOOLEAN_ATTRIBUTES.has(attr.name.toLowerCase()) ? true : attr.value;

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
  const parsed = doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser);
  // HTML documents expose body; XML documents (e.g. image/svg+xml) don't —
  // there the documentElement is the root node to render
  if (parsed.body) return Array.from(parsed.body.childNodes);
  return parsed.documentElement ? [parsed.documentElement] : [];
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
 * Converts a DOM node to a VNode structure for use with updateDomWithVdom.
 * This allows us to leverage the sophisticated partial update system even for Node inputs.
 */
export function domNodeToVNode(node: Node): VNode<VNodeAttributes> | string {
  if (node.nodeType === 3 /* Node.TEXT_NODE */) {
    return node.textContent || "";
  }

  if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
    const element = node as Element;
    const attributes: VNodeAttributes = {};

    // Convert DOM attributes to VNode attributes
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = domAttributeToVNodeValue(attr);
    }

    // Convert child nodes recursively
    const children: Array<VNode<VNodeAttributes> | string> = [];
    for (let i = 0; i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }

    return {
      type: element.tagName.toLowerCase(),
      attributes: { ...attributes, [FROM_DOM_MARKER]: true },
      children,
    };
  }

  if (node.nodeType === 8 /* Node.COMMENT_NODE */) {
    return { type: COMMENT_TYPE, value: node.nodeValue ?? "" };
  }

  // For other node types (processing instructions, etc.), convert to empty string
  return "";
}

/** Input starting (after optional comments) with doctype/html/head/body. */
const DOCUMENT_START = /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype|html|head|body)[\s>/]/i;

/**
 * Converts an HTML string to VNode structure for use with updateDomWithVdom.
 * This allows markup strings to benefit from the intelligent partial update system.
 */
export function htmlStringToVNodes(
  html: string,
  Parser: typeof DOMParser,
): Array<VNode<VNodeAttributes> | string> {
  const parser = new Parser();
  // Fragment input gets an explicit <body>. VERIFIED: in Chromium and
  // happy-dom, without it a leading comment is attached to the Document (outside body)
  // and lost. Prefixing every input instead would move a full document's
  // <head> content (e.g. <title>) into body, so documents parse unchanged.
  const doc = parser.parseFromString(
    DOCUMENT_START.test(html) ? html : `<body>${html}`,
    "text/html",
  );
  const vNodes: Array<VNode<VNodeAttributes> | string> = [];

  // Convert each child node in the body to a VNode
  for (let i = 0; i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }

  return vNodes;
}
