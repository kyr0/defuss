import { describe, expect, it } from "vitest";
import {
  areDomNodesEqual,
  COMMENT_TYPE,
  getRenderer,
  morph,
  replaceDomWithVdom,
} from "./index.js";

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

describe("morph: HTML comments", () => {
  it("round-trips: morph(x) then innerHTML returns x, comments around keyed elements included", () => {
    const html =
      `<!-- lead --><ul><!-- list --><li id="a">A</li><!-- between --><li id="b">B</li></ul>` +
      `<svg viewBox="0 0 1 1"><!-- licence --><circle r="1"></circle></svg><!-- tail -->`;
    const el = container();

    morph(el, html);
    expect(el.innerHTML).toBe(html);

    // writing the read value back must not change a single node
    const before = Array.from(el.querySelectorAll("*"));
    const comments = Array.from(el.childNodes);
    morph(el, el.innerHTML);
    expect(el.innerHTML).toBe(html);
    expect(Array.from(el.querySelectorAll("*"))).toEqual(before);
    expect(Array.from(el.childNodes)).toEqual(comments);
  });

  it("updates comment data in place (node identity kept)", () => {
    const el = container("<p>x</p><!-- old -->");
    const comment = el.childNodes[1];

    morph(el, "<p>x</p><!-- new -->");

    expect(el.childNodes[1]).toBe(comment);
    expect(comment.nodeValue).toBe(" new ");
  });

  it("inserts and removes comments without disturbing keyed siblings", () => {
    const el = container(`<li key="a">A</li><li key="b">B</li>`);
    const [a, b] = Array.from(el.children);

    morph(el, `<!--1--><li key="a">A</li><!--2--><li key="b">B</li><!--3-->`);
    expect(el.innerHTML).toBe(`<!--1--><li key="a">A</li><!--2--><li key="b">B</li><!--3-->`);
    expect(el.children[0]).toBe(a);
    expect(el.children[1]).toBe(b);

    morph(el, `<li key="b">B</li><li key="a">A</li>`);
    expect(el.innerHTML).toBe(`<li key="b">B</li><li key="a">A</li>`);
    expect(el.children[0]).toBe(b);
    expect(el.children[1]).toBe(a);
  });

  it("never reuses a text node for a comment (or vice versa)", () => {
    const el = container("text<!--c-->");
    const text = el.childNodes[0];
    const comment = el.childNodes[1];

    morph(el, "<!--c-->text");

    expect(el.innerHTML).toBe("<!--c-->text");
    expect(el.childNodes[0]).toBe(comment);
    expect(el.childNodes[1]).toBe(text);
  });

  it("morphs comments nested inside elements", () => {
    const el = container("<div>a<!--x-->b</div>");
    const div = el.firstChild;

    morph(el, "<div>a<!--y-->b<!--z--></div>");

    expect(el.firstChild).toBe(div);
    expect(el.innerHTML).toBe("<div>a<!--y-->b<!--z--></div>");
  });

  it("accepts comment VNodes directly", () => {
    const el = container("<p>x</p>");

    morph(el, [
      { type: COMMENT_TYPE, value: "vnode" },
      { type: "p", attributes: {}, children: ["x"] },
    ]);

    expect(el.innerHTML).toBe("<!--vnode--><p>x</p>");
  });

  it("renderer and replaceDomWithVdom create comment nodes", () => {
    const comment = getRenderer(document).createElement({
      type: COMMENT_TYPE,
      value: "r",
    }) as unknown as Comment;
    expect(comment.nodeType).toBe(8);
    expect(comment.nodeValue).toBe("r");

    const el = container("<p>old</p>");
    replaceDomWithVdom(el, [{ type: COMMENT_TYPE, value: "c" }, "t"]);
    expect(el.innerHTML).toBe("<!--c-->t");
  });

  it("diff mode skips top-level comments but morphs comments inside items", () => {
    const el = container(`<li key="a">A</li><li key="b">B</li>`);

    morph(el, `<!-- patch --><li key="b">B<!--n--></li>`, { diff: true });
    morph(el, `<!-- patch --><li key="b">B<!--n--></li>`, { diff: true });

    expect(el.innerHTML).toBe(`<li key="a">A</li><li key="b">B<!--n--></li>`);
  });

  it("areDomNodesEqual compares comment data", () => {
    expect(areDomNodesEqual(document.createComment("a"), document.createComment("a"))).toBe(true);
    expect(areDomNodesEqual(document.createComment("a"), document.createComment("b"))).toBe(false);
  });
});
