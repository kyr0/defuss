import { describe, expect, it } from "vitest";
import {
  COMMENT_TYPE,
  domNodeToVNode,
  getMimeType,
  htmlStringToVNodes,
  isHTML,
  isMarkup,
  isSVG,
  parseDOM,
  renderMarkup,
} from "./index.js";

const Parser = globalThis.DOMParser;

describe("parseDOM", () => {
  it("parses HTML and SVG documents", () => {
    const html = parseDOM("<p>x</p>", "text/html", Parser);
    expect(html.querySelector("p")!.textContent).toBe("x");

    const svg = parseDOM(`<svg><circle r="1"/></svg>`, "image/svg+xml", Parser);
    expect(svg.documentElement.nodeName).toBe("svg");
  });
});

describe("isHTML / isSVG / isMarkup / getMimeType", () => {
  it("detects HTML markup", () => {
    expect(isHTML("<div><span>x</span></div>", Parser)).toBe(true);
    expect(isHTML("just text", Parser)).toBe(false);
  });

  it("detects SVG documents", () => {
    expect(isSVG(`<svg viewBox="0 0 1 1"></svg>`, Parser)).toBe(true);
    expect(isSVG("<p>x</p>", Parser)).toBe(false);
    expect(isSVG("plain", Parser)).toBe(false);
  });

  it("isSVG is false when the parser yields no document element", () => {
    // stub parser (must be constructible: DOMParser is used via `new`):
    // some DOM implementations return a documentless parse result
    class EmptyParser {
      parseFromString(): Document {
        return {} as Document;
      }
    }
    expect(isSVG("<svg>", EmptyParser as unknown as typeof DOMParser)).toBe(false);
  });

  it("isMarkup requires angle brackets and a parseable document", () => {
    expect(isMarkup("<b>x</b>", Parser)).toBe(true);
    expect(isMarkup("<svg></svg>", Parser)).toBe(true);
    expect(isMarkup("hello", Parser)).toBe(false);
    expect(isMarkup("< broken", Parser)).toBe(false);
    expect(isMarkup("no open >", Parser)).toBe(false);
  });

  it("isMarkup falls through to SVG detection when HTML detection fails", () => {
    // stub parser (constructible): text/html parse looks non-HTML (few
    // elements), while the SVG parse yields a real <svg> root — a combination
    // real parsers only produce for exotic documents
    class StubParser {
      parseFromString(_input: string, type: string): Document {
        return type === "image/svg+xml"
          ? ({ documentElement: { nodeName: "svg" } } as unknown as Document)
          : ({
              documentElement: { querySelectorAll: () => [] },
            } as unknown as Document);
      }
    }

    expect(isMarkup("<svg></svg>", StubParser as unknown as typeof DOMParser)).toBe(true);
  });

  it("getMimeType picks the SVG mime only for real SVG documents", () => {
    expect(getMimeType("<svg></svg>", Parser)).toBe("image/svg+xml");
    expect(getMimeType("<p>x</p>", Parser)).toBe("text/html");
  });
});

describe("renderMarkup", () => {
  it("returns the parsed body child nodes", () => {
    const nodes = renderMarkup("<p>a</p><p>b</p>", Parser);
    expect(nodes.length).toBe(2);
    expect((nodes[0] as HTMLElement).tagName).toBe("P");
    expect((nodes[1] as HTMLElement).tagName).toBe("P");
  });

  it("parses SVG markup with the SVG mime type", () => {
    // XML documents have no body — the documentElement is the renderable root
    const nodes = renderMarkup(`<svg><circle r="1"/></svg>`, Parser);
    expect(nodes.length).toBe(1);
    expect((nodes[0] as Element).nodeName).toBe("svg");
    expect((nodes[0] as Element).querySelector("circle")).not.toBeNull();
  });

  it("can render into a provided (pre-parsed) document", () => {
    const doc = parseDOM("<i>in-doc</i>", "text/html", Parser);
    const nodes = renderMarkup("", Parser, doc);
    expect((nodes[0] as HTMLElement).tagName).toBe("I");
    expect(nodes[0].textContent).toBe("in-doc");
  });

  it("returns an empty list for a document without body or documentElement", () => {
    // stub document: neither HTML (no body) nor XML (no documentElement) shape
    expect(renderMarkup("", Parser, {} as Document)).toEqual([]);
  });
});

describe("domNodeToVNode", () => {
  it("converts elements with attributes and children", () => {
    const doc = parseDOM(
      `<div id="a" class="x">hi<span>inner</span></div>`,
      "text/html",
      Parser,
    );
    const vnode = domNodeToVNode(doc.querySelector("div")!);

    expect(vnode).toMatchObject({
      type: "div",
      attributes: { id: "a", class: "x" },
    });
    expect((vnode as any).children[0]).toBe("hi");
    expect((vnode as any).children[1]).toMatchObject({ type: "span" });
  });

  it("maps HTML boolean attributes to true", () => {
    const doc = parseDOM(`<input type="checkbox" checked disabled>`, "text/html", Parser);
    const vnode = domNodeToVNode(doc.querySelector("input")!) as any;
    expect(vnode.attributes.checked).toBe(true);
    expect(vnode.attributes.disabled).toBe(true);
    expect(vnode.attributes.type).toBe("checkbox");
  });

  it("converts text nodes to strings and comment nodes to comment vnodes", () => {
    expect(domNodeToVNode(document.createTextNode("text"))).toBe("text");
    expect(domNodeToVNode(document.createComment("note"))).toEqual({
      type: COMMENT_TYPE,
      value: "note",
    });
  });

  it("keeps nested comments as element children", () => {
    const doc = parseDOM(`<div>a<!--n-->b</div>`, "text/html", Parser);
    expect((domNodeToVNode(doc.querySelector("div")!) as any).children).toEqual([
      "a",
      { type: "#comment", value: "n" },
      "b",
    ]);
  });

  it("maps an empty text node to an empty string", () => {
    // textContent is "" (falsy) — must not become null/undefined
    expect(domNodeToVNode(document.createTextNode(""))).toBe("");
  });
});

describe("htmlStringToVNodes", () => {
  it("converts multiple root nodes, keeping comments in place", () => {
    const vnodes = htmlStringToVNodes(
      `<p>a</p><!-- c --><p>b</p>`,
      Parser,
    );
    expect(vnodes.length).toBe(3);
    expect(vnodes[0]).toMatchObject({ type: "p" });
    expect(vnodes[1]).toEqual({ type: "#comment", value: " c " });
    expect(vnodes[2]).toMatchObject({ type: "p" });
  });

  it("keeps a leading comment (the spec parks it outside body without <body>)", () => {
    expect(htmlStringToVNodes("<!--lead--><b>x</b>", Parser)[0]).toEqual({
      type: "#comment",
      value: "lead",
    });
  });

  it("keeps leading whitespace of fragment input (innerHTML round-trip)", () => {
    expect(htmlStringToVNodes("\n  <b>x</b>", Parser)[0]).toBe("\n  ");
  });

  it("parses full documents unchanged: head content never leaks into body", () => {
    const vnodes = htmlStringToVNodes(
      "<!--pre--><!DOCTYPE html><html><head><title>t</title></head><body><p>c</p></body></html>",
      Parser,
    );
    expect(vnodes).toHaveLength(1);
    expect(vnodes[0]).toMatchObject({ type: "p" });
  });

  it("converts plain text into a single text vnode", () => {
    const vnodes = htmlStringToVNodes("hello", Parser);
    expect(vnodes).toEqual(["hello"]);
  });

  it("returns a single comment vnode for comment-only input", () => {
    expect(htmlStringToVNodes("<!-- nothing -->", Parser)).toEqual([
      { type: "#comment", value: " nothing " },
    ]);
  });

  it("keeps key and id attributes for morph matching", () => {
    const vnodes = htmlStringToVNodes(`<li key="k" id="i">x</li>`, Parser);
    expect(vnodes[0]).toMatchObject({
      type: "li",
      attributes: { key: "k", id: "i" },
    });
  });
});
