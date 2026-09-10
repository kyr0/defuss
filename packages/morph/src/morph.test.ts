import { describe, expect, it, vi } from "vitest";
import {
  type Globals,
  type VNode,
  morph,
  updateDomWithVdom,
  registerDelegatedEvent,
  getRegisteredEventKeys,
} from "./index.js";

const globals = globalThis as unknown as Globals;

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

describe("morph(el, html)", () => {
  it("morphs children from an HTML string end-to-end", () => {
    const el = container("<p>old</p>");
    morph(el, `<p class="a">new</p><span>s</span>`);

    expect(el.children.length).toBe(2);
    expect(el.children[0].tagName).toBe("P");
    expect(el.children[0].getAttribute("class")).toBe("a");
    expect(el.children[0].textContent).toBe("new");
    expect(el.children[1].tagName).toBe("SPAN");
    expect(el.children[1].textContent).toBe("s");
  });

  it("morphs VNode/JSX input end-to-end (same API)", () => {
    const el = container("<p>old</p>");
    morph(el, [
      {
        type: "ul",
        attributes: {},
        children: [
          { type: "li", attributes: { key: "a" }, children: ["A"] },
          { type: "li", attributes: { key: "b" }, children: ["B"] },
        ],
      } as VNode,
    ]);

    const items = el.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe("A");
    expect(items[1].textContent).toBe("B");
  });

  it("VNode input preserves node identity and moves keyed nodes", () => {
    const el = container();
    const list = (keys: string[]): VNode[] => [
      {
        type: "ul",
        attributes: {},
        children: keys.map((k) => ({
          type: "li",
          attributes: { key: k },
          children: [k],
        })),
      } as VNode,
    ];

    morph(el, list(["a", "b"]));
    const liA = el.querySelector("li");

    morph(el, list(["b", "a"]));
    expect(el.querySelector("li:nth-child(2)")).toBe(liA); // moved, not recreated
  });

  it("VNode input can express explicit unchecked state (HTML string cannot)", () => {
    const el = container(`<input type="checkbox" id="c" checked>`);

    // HTML string: absent attribute = uncontrolled, stays checked
    morph(el, `<input type="checkbox" id="c">`);
    expect((el.querySelector("input") as HTMLInputElement).checked).toBe(true);

    // VNode: explicit false wins over the live state
    morph(el, [
      {
        type: "input",
        attributes: { type: "checkbox", id: "c", checked: false },
        children: [],
      } as VNode,
    ]);
    expect((el.querySelector("input") as HTMLInputElement).checked).toBe(false);
  });

  it("morphs plain text input as a text node", () => {
    const el = container("<p>old</p>");
    morph(el, "hello");
    expect(el.textContent).toBe("hello");
  });

  it("supports transitions with VNode input", async () => {
    const el = container("<div><p>old</p></div>");
    await morph(
      el.children[0] as Element,
      [{ type: "p", attributes: {}, children: ["new"] } as VNode],
      { transition: { type: "fade", duration: 10, target: "self" } },
    );
    expect((el.children[0] as HTMLElement).textContent).toBe("new");
  });

  it("patches same-tag elements in place (identity preserved)", () => {
    const el = container(`<p class="old">text</p>`);
    const p = el.children[0];

    morph(el, `<p class="new" data-x="1">text</p>`);

    expect(el.children[0]).toBe(p); // same DOM node
    expect(p.getAttribute("class")).toBe("new");
    expect(p.getAttribute("data-x")).toBe("1");
  });

  it("updates text nodes in place (identity preserved)", () => {
    const el = container(`<p>hello</p>`);
    const textNode = el.children[0].childNodes[0] as Text;

    morph(el, `<p>world</p>`);

    expect(el.children[0].childNodes[0]).toBe(textNode);
    expect(textNode.nodeValue).toBe("world");
  });

  it("moves keyed nodes instead of replacing them", () => {
    const el = container();
    morph(el, `<ul><li key="a">A</li><li key="b">B</li><li key="c">C</li></ul>`);

    const liA = el.querySelector("li:nth-child(1)");
    const liB = el.querySelector("li:nth-child(2)");
    const liC = el.querySelector("li:nth-child(3)");

    morph(el, `<ul><li key="c">C2</li><li key="a">A2</li><li key="b">B2</li></ul>`);

    const items = el.querySelectorAll("li");
    expect(items[0]).toBe(liC); // moved, not recreated
    expect(items[1]).toBe(liA);
    expect(items[2]).toBe(liB);
    expect(items[0].textContent).toBe("C2");
    expect(items[1].textContent).toBe("A2");
    expect(items[2].textContent).toBe("B2");
  });

  it("matches keyed nodes against pre-existing DOM with literal key attributes", () => {
    // e.g. server-rendered HTML carrying key="..." attributes
    const el = container(`<ul><li key="x">X</li><li key="y">Y</li></ul>`);
    const liX = el.querySelector("li");

    morph(el, `<ul><li key="y">Y</li><li key="x">X!</li></ul>`);

    const items = el.querySelectorAll("li");
    expect(items[1]).toBe(liX);
    expect(items[1].textContent).toBe("X!");
  });

  it("matches and moves by id", () => {
    const el = container(`<div id="one">1</div><div id="two">2</div>`);
    const two = el.querySelector("#two");

    morph(el, `<div id="two">2!</div><div id="one">1</div>`);

    expect(el.children[0]).toBe(two);
    expect(el.children[0].textContent).toBe("2!");
  });

  it("preserves uncontrolled input state, applies controlled state", () => {
    const el = container(`<input type="text" />`);
    const input = el.querySelector("input") as HTMLInputElement;
    input.value = "typed by user";

    // new HTML does not control "value" -> live value survives
    morph(el, `<input type="text" class="active" />`);
    expect(el.querySelector("input")).toBe(input);
    expect(input.value).toBe("typed by user");
    expect(input.getAttribute("class")).toBe("active");

    // new HTML explicitly controls "value" -> applied (property-level)
    morph(el, `<input type="text" class="active" value="forced" />`);
    expect(input.value).toBe("forced");
    expect(input.getAttribute("value")).toBe("forced");
  });

  it("round-trips boolean attributes and checked state", () => {
    const el = container(`<input type="checkbox" />`);
    const input = el.querySelector("input") as HTMLInputElement;
    input.checked = true; // uncontrolled live state

    // no "checked" in new HTML -> live state survives
    morph(el, `<input type="checkbox" class="x" />`);
    expect(input.checked).toBe(true);

    // explicit checked attribute -> applied to property and attribute
    morph(el, `<input type="checkbox" checked />`);
    expect(input.checked).toBe(true);
    expect(input.hasAttribute("checked")).toBe(true);

    // disabled round-trip
    morph(el, `<input type="checkbox" disabled />`);
    expect(input.disabled).toBe(true);
    expect(input.hasAttribute("disabled")).toBe(true);
  });

  it("preserves delegated handlers on elements patched by an HTML morph", () => {
    const el = container(`<button id="keep">v1</button>`);
    const btn = el.querySelector("#keep") as HTMLElement;

    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    // HTML cannot declare handlers -> existing ones are preserved on patch
    morph(el, `<button id="keep" class="x">v2</button>`);

    expect(el.querySelector("#keep")).toBe(btn);
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("clears delegated event handlers of removed elements", () => {
    const el = container(`<button id="btn">x</button>`);
    const btn = el.querySelector("#btn") as HTMLElement;

    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);

    // morph the button away
    morph(el, `<span>no button here</span>`);
    expect(el.querySelector("#btn")).toBeNull();

    // handler registry for the removed element is cleared
    expect(getRegisteredEventKeys(btn).size).toBe(0);
  });

  it("does not double-fire handlers across repeated morphs", () => {
    const el = container();
    const onClick = vi.fn();

    const vnode = (label: string): VNode => ({
      type: "button",
      attributes: { id: "b", onClick },
      children: [label],
    });

    updateDomWithVdom(el, vnode("one"), globals);
    updateDomWithVdom(el, vnode("two"), globals);
    updateDomWithVdom(el, vnode("three"), globals);

    const btn = el.querySelector("#b") as HTMLElement;
    expect(btn.textContent).toBe("three");

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("removes stale phase-specific handlers on patch (bubble vs capture)", () => {
    const el = container();
    const onBubble = vi.fn();
    const onCapture = vi.fn();

    updateDomWithVdom(
      el,
      {
        type: "button",
        attributes: { id: "p", onClick: onBubble, onClickCapture: onCapture },
        children: [],
      },
      globals,
    );

    // drop the bubble handler, keep capture
    updateDomWithVdom(
      el,
      {
        type: "button",
        attributes: { id: "p", onClickCapture: onCapture },
        children: [],
      },
      globals,
    );

    const btn = el.querySelector("#p") as HTMLElement;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onCapture).toHaveBeenCalledTimes(1);
    expect(onBubble).not.toHaveBeenCalled();
  });

  it("queues re-entrant morphs on the same element (latest-wins)", () => {
    const el = container(`<section><i>initial</i></section>`);
    const section = el.querySelector("section") as HTMLElement;

    // a synchronous $onMount hook fires mid-morph (patchElementInPlace lifecycle)
    (section as any).$onMount = () => {
      // re-entrant morph on the ancestor container while it is rendering
      updateDomWithVdom(
        el,
        {
          type: "section",
          attributes: { class: "inner-wins" },
          children: ["re-entrant"],
        },
        globals,
      );
    };

    updateDomWithVdom(
      el,
      { type: "section", attributes: { class: "outer" }, children: ["outer"] },
      globals,
    );

    const result = el.querySelector("section") as HTMLElement;
    expect(result).toBe(section); // still the same node
    // the re-entrant morph was queued and flushed after the outer morph:
    // latest-wins, so its attributes and children fully replaced the outer's
    expect(result.getAttribute("class")).toBe("inner-wins");
    expect(result.textContent).toBe("re-entrant");
  });

  it("morphs light DOM of custom elements, shadow root of plain elements", () => {
    // custom element with a shadow root: morph must target light DOM
    class MyEl extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
      }
    }
    if (!customElements.get("my-el")) {
      customElements.define("my-el", MyEl);
    }

    const host = document.createElement("my-el");
    document.body.appendChild(host);
    morph(host, `<span slot="x">light</span>`);

    expect(host.children.length).toBe(1);
    expect(host.children[0].tagName).toBe("SPAN");
    expect(host.shadowRoot!.childNodes.length).toBe(0);

    // plain element with a shadow root: morph must target the shadow root
    const plain = document.createElement("div");
    document.body.appendChild(plain);
    plain.attachShadow({ mode: "open" });
    morph(plain, `<b>shadow</b>`);

    expect(plain.childNodes.length).toBe(0);
    expect(plain.shadowRoot!.querySelector("b")!.textContent).toBe("shadow");
  });

  it("morphs SVG content with correct namespaces", () => {
    const el = container();
    morph(el, `<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"></circle></svg>`);

    const svg = el.querySelector("svg")!;
    expect(svg.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(svg.getAttribute("viewBox")).toBe("0 0 10 10");

    const circle = svg.querySelector("circle")!;
    expect(circle.namespaceURI).toBe("http://www.w3.org/2000/svg");

    // patch in place on repeated morph
    morph(el, `<svg viewBox="0 0 20 20"><circle cx="1" cy="1" r="1"></circle></svg>`);
    expect(el.querySelector("svg")).toBe(svg);
    expect(svg.getAttribute("viewBox")).toBe("0 0 20 20");
  });

  it("morphs plain text input as a text node", () => {
    const el = container(`<b>x</b>`);
    morph(el, "just text");
    expect(el.childNodes.length).toBe(1);
    expect(el.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
    expect(el.textContent).toBe("just text");
  });

  it("updateDomWithVdom derives globals from the element when omitted", () => {
    const el = container();
    // no third argument — globals derived from el.ownerDocument.defaultView
    updateDomWithVdom(el, [
      { type: "p", attributes: { class: "x" }, children: ["hi"] },
    ]);
    expect(el.querySelector("p")!.textContent).toBe("hi");

    const p = el.querySelector("p");
    updateDomWithVdom(el, [
      { type: "p", attributes: { class: "y" }, children: ["yo"] },
    ]);
    expect(el.querySelector("p")).toBe(p); // patched in place
    expect(el.querySelector("p")!.getAttribute("class")).toBe("y");
    expect(el.querySelector("p")!.textContent).toBe("yo");
  });
});
