import { describe, expect, it } from "vitest";
import {
  type Globals,
  areDomNodesEqual,
  morph,
  replaceDomWithVdom,
  updateDomWithVdom,
} from "./index.js";

const globals = globalThis as unknown as Globals;

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

describe("areDomNodesEqual", () => {
  it("is true for identical references", () => {
    const el = document.createElement("div");
    expect(areDomNodesEqual(el, el)).toBe(true);
  });

  it("is false for different node types", () => {
    const el = document.createElement("div");
    const text = document.createTextNode("x");
    expect(areDomNodesEqual(el, text)).toBe(false);
  });

  it("compares elements by tag name and attributes", () => {
    const a = document.createElement("div");
    a.setAttribute("class", "x");
    const b = document.createElement("div");
    b.setAttribute("class", "x");
    expect(areDomNodesEqual(a, b)).toBe(true);

    b.setAttribute("id", "extra");
    expect(areDomNodesEqual(a, b)).toBe(false); // attribute count differs

    const c = document.createElement("div");
    c.setAttribute("class", "other");
    expect(areDomNodesEqual(a, c)).toBe(false); // value differs

    expect(areDomNodesEqual(a, document.createElement("span"))).toBe(false); // tag differs
  });

  it("compares text nodes by content", () => {
    expect(
      areDomNodesEqual(document.createTextNode("a"), document.createTextNode("a")),
    ).toBe(true);
    expect(
      areDomNodesEqual(document.createTextNode("a"), document.createTextNode("b")),
    ).toBe(false);
  });
});

describe("replaceDomWithVdom", () => {
  it("replaces all children unconditionally", () => {
    const el = container(`<p>old</p><p>older</p>`);
    const before = el.querySelector("p");

    replaceDomWithVdom(
      el,
      [{ type: "span", attributes: {}, children: ["new"] }],
      globals,
    );

    expect(el.children.length).toBe(1);
    expect(el.querySelector("span")!.textContent).toBe("new");
    expect(el.querySelector("p")).toBeNull();
    expect(el.childNodes[0]).not.toBe(before); // never reused
  });

  it("handles single-node and empty input", () => {
    const el = container(`<p>x</p>`);
    replaceDomWithVdom(
      el,
      { type: "b", attributes: {}, children: ["one"] },
      globals,
    );
    expect(el.innerHTML).toBe("<b>one</b>");

    replaceDomWithVdom(el, [] as any, globals);
    expect(el.childNodes.length).toBe(0);
  });

  it("derives globals from the element when omitted", () => {
    const el = container(`<p>x</p>`);
    replaceDomWithVdom(el, { type: "b", attributes: {}, children: ["no-globals"] });
    expect(el.innerHTML).toBe("<b>no-globals</b>");
  });
});

describe("morphNode edge paths", () => {
  it("replaces an element with a text node", () => {
    const el = container(`<p>para</p>`);
    const p = el.querySelector("p");
    morph(el, "plain");
    expect(el.childNodes[0].nodeType).toBe(3);
    expect(el.childNodes[0]).not.toBe(p);
    expect(el.textContent).toBe("plain");
  });

  it("replaces a text node with an element", () => {
    const el = container("plain");
    const text = el.childNodes[0];
    morph(el, `<p>para</p>`);
    expect(el.childNodes[0].nodeType).toBe(1);
    expect(el.childNodes[0]).not.toBe(text);
  });

  it("replaces the node when the tag changes", () => {
    const el = container(`<p>content</p>`);
    const p = el.querySelector("p");
    morph(el, `<span>content</span>`);
    expect(el.querySelector("span")).not.toBeNull();
    expect(el.querySelector("p")).toBeNull();
    expect(el.children[0]).not.toBe(p);
  });

  it("removes children absent from the new HTML (keyed leftovers included)", () => {
    const el = container(`<ul><li key="a">A</li><li key="b">B</li></ul>`);
    morph(el, `<ul><li key="b">B</li></ul>`);
    expect(el.querySelectorAll("li").length).toBe(1);
    expect(el.querySelector("li")!.textContent).toBe("B");
  });

  it("matches numeric keys", () => {
    const el = container();
    updateDomWithVdom(
      el,
      [{ type: "p", attributes: { key: 5 }, children: ["five"] }],
      globals,
    );
    const p = el.querySelector("p");

    updateDomWithVdom(
      el,
      [{ type: "p", attributes: { key: 5 }, children: ["five!"] }],
      globals,
    );
    expect(el.querySelector("p")).toBe(p);
    expect(el.querySelector("p")!.textContent).toBe("five!");
  });

  it("handles duplicate keys deterministically (first wins, leftover removed)", () => {
    const el = container(`<ul><li key="a">A1</li><li key="a">A2</li></ul>`);
    const [first] = el.querySelectorAll("li");

    morph(el, `<ul><li key="a">A!</li></ul>`);

    const items = el.querySelectorAll("li");
    expect(items.length).toBe(1);
    expect(items[0]).toBe(first);
    expect(items[0].textContent).toBe("A!");
  });

  it("never steals keyed nodes from a different parent", () => {
    const one = container(`<div><li key="x">in-one</li></div>`);
    const two = container();
    const inOne = one.querySelector("li");

    morph(two, `<li key="x">in-two</li>`);

    expect(one.querySelector("li")).toBe(inOne); // untouched
    expect(one.querySelector("li")!.textContent).toBe("in-one");
    expect(two.querySelector("li")).not.toBe(inOne); // fresh node
    expect(two.querySelector("li")!.textContent).toBe("in-two");
  });

  it("patches mixed text/element/text sandwiches positionally", () => {
    const el = container(`<div>before<span>mid</span>after</div>`);
    const div = el.querySelector("div")!;
    const [t1, span, t2] = Array.from(div.childNodes);

    morph(el, `<div>BEFORE<span>mid</span>AFTER</div>`);

    expect(div.childNodes[0]).toBe(t1);
    expect(div.childNodes[1]).toBe(span);
    expect(div.childNodes[2]).toBe(t2);
    expect(div.textContent).toBe("BEFOREmidAFTER");
  });

  it("removes boolean attributes when absent from the new HTML", () => {
    const el = container(`<input disabled>`);
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.disabled).toBe(true);

    morph(el, `<input>`);
    expect(input.hasAttribute("disabled")).toBe(false);
    expect(input.disabled).toBe(false);
  });

  it("keeps checked state when the new HTML does not mention it (uncontrolled)", () => {
    const el = container(`<input type="checkbox">`);
    const input = el.querySelector("input") as HTMLInputElement;
    input.checked = true;

    morph(el, `<input type="checkbox" class="x">`);
    // HTML cannot express "explicitly unchecked" — absence means uncontrolled,
    // so live state survives (same rule as the input value)
    expect(input.checked).toBe(true);
  });

  it("patches and removes inline styles", () => {
    const el = container(`<p style="color: red;">x</p>`);
    const p = el.querySelector("p") as HTMLElement;

    morph(el, `<p style="color: blue;">x</p>`);
    expect(p.style.color).toBe("blue");

    morph(el, `<p>x</p>`);
    expect(p.hasAttribute("style")).toBe(false);
  });

  it("respects dangerouslySetInnerHTML (skips child reconciliation), then reconciles again", () => {
    const el = container();
    updateDomWithVdom(
      el,
      {
        type: "div",
        attributes: { dangerouslySetInnerHTML: { __html: "<b>raw</b>" } },
        children: [{ type: "i", attributes: {}, children: ["ignored"] }],
      },
      globals,
    );

    const div = el.querySelector("div")!;
    expect(div.innerHTML).toBe("<b>raw</b>");
    expect(div.querySelector("i")).toBeNull();

    // next morph without dangerouslySetInnerHTML reconciles children again
    updateDomWithVdom(
      el,
      { type: "div", attributes: {}, children: ["clean"] },
      globals,
    );
    expect(div.textContent).toBe("clean");
    expect(div.querySelector("b")).toBeNull();
  });

  it("morphs SVG subtrees in place with correct namespaces", () => {
    const el = container();
    morph(el, `<svg viewBox="0 0 1 1"><circle cx="1" cy="1" r="1"/></svg>`);
    const svg = el.querySelector("svg")!;
    const circle = svg.querySelector("circle")!;

    morph(el, `<svg viewBox="0 0 2 2"><circle cx="2" cy="2" r="2"/></svg>`);

    expect(el.querySelector("svg")).toBe(svg); // patched in place
    expect(svg.querySelector("circle")).toBe(circle);
    expect(circle.getAttribute("cx")).toBe("2");
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});

describe("morph guard — nested and queued morphs", () => {
  it("queues morphs targeting a descendant of an element being rendered", () => {
    const el = container(`<section id="outer"><p id="inner">old</p></section>`);
    const inner = el.querySelector("#inner") as HTMLElement;
    const outer = el.querySelector("#outer") as HTMLElement;

    // raw synchronous lifecycle hook — fires mid-morph during patching
    (outer as any).$onMount = () => {
      updateDomWithVdom(
        inner,
        [{ type: "p", attributes: { id: "inner" }, children: ["from-queued"] }],
        globals,
      );
    };

    updateDomWithVdom(
      el,
      [
        {
          type: "section",
          attributes: { id: "outer", class: "done" },
          children: [{ type: "p", attributes: { id: "inner" }, children: ["from-outer"] }],
        },
      ],
      globals,
    );

    // outer morph completed...
    expect(outer.getAttribute("class")).toBe("done");
    // ...and the queued descendant morph was flushed after it (latest-wins)
    expect(el.querySelector("#inner")!.textContent).toBe("from-queued");
  });

  it("skips queued morphs whose target was detached during the outer morph", () => {
    const el = container(
      `<section id="keep"><p>stay</p></section><section id="bye"><p>doomed</p></section>`,
    );
    const keep = el.querySelector("#keep") as HTMLElement;
    const bye = el.querySelector("#bye") as HTMLElement;

    (keep as any).$onMount = () => {
      // queue a morph on an element the outer morph is about to remove
      updateDomWithVdom(
        bye,
        [{ type: "section", attributes: { id: "bye" }, children: ["zombie"] }],
        globals,
      );
    };

    updateDomWithVdom(
      el,
      [{ type: "section", attributes: { id: "keep" }, children: ["staying"] }],
      globals,
    );

    expect(el.querySelector("#bye")).toBeNull(); // removed by the outer morph
    expect(bye.textContent).toBe("doomed"); // queued morph skipped, no zombie write
  });

  it("applies morphs on unrelated subtrees immediately (no blocking)", () => {
    const a = container(`<section id="a"><p>old-a</p></section>`);
    const b = container(`<p>old-b</p>`);

    const sectionA = a.querySelector("#a") as HTMLElement;
    (sectionA as any).$onMount = () => {
      // morph an unrelated subtree while `a` is rendering — must apply now
      updateDomWithVdom(
        b,
        [{ type: "p", attributes: {}, children: ["new-b"] }],
        globals,
      );
      expect(b.querySelector("p")!.textContent).toBe("new-b"); // applied synchronously
    };

    updateDomWithVdom(
      a,
      [
        {
          type: "section",
          attributes: { id: "a" },
          children: [{ type: "p", attributes: {}, children: ["new-a"] }],
        },
      ],
      globals,
    );

    expect(a.querySelector("p")!.textContent).toBe("new-a");
    expect(b.querySelector("p")!.textContent).toBe("new-b");
  });
});

describe("form state edge cases", () => {
  it("preserves a focused textarea's live text; blurred reconciles content, keeps dirty value", () => {
    const el = container(`<textarea>initial</textarea>`);
    const ta = el.querySelector("textarea") as HTMLTextAreaElement;

    ta.focus();
    ta.value = "user is typing";
    morph(el, `<textarea class="active">initial</textarea>`);
    expect(ta.value).toBe("user is typing"); // focused + uncontrolled: kept
    expect(ta.getAttribute("class")).toBe("active");

    ta.blur();
    morph(el, `<textarea class="active">server text</textarea>`);
    // blurred: child text is reconciled (new default content)...
    expect(ta.textContent).toBe("server text");
    // ...but the live value keeps the user's dirty state (HTML semantics:
    // once .value was set, the default no longer flows into .value)
    expect(ta.value).toBe("user is typing");
  });

  it("updates a select's selected option when the HTML controls it", () => {
    const el = container(
      `<select><option value="a">A</option><option value="b">B</option></select>`,
    );
    const select = el.querySelector("select") as HTMLSelectElement;

    morph(
      el,
      `<select><option value="a">A</option><option value="b" selected>B</option></select>`,
    );
    expect(select.value).toBe("b");
  });
});
