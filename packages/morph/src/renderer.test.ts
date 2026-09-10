import { describe, expect, it, vi } from "vitest";
import {
  type VNode,
  getRenderer,
  handleLifecycleEventsForOnMount,
  observeUnmount,
  queueCallback,
} from "./index.js";

const flushMicrotasks = () => new Promise<void>((r) => setTimeout(r, 0));

describe("getRenderer", () => {
  const renderer = () => getRenderer(document);

  it("creates an element with children and appends to the parent", () => {
    const parent = document.createElement("div");
    const el = renderer().createElement(
      {
        type: "section",
        attributes: { class: "box" },
        children: ["hello"],
      },
      parent,
    ) as HTMLElement;

    expect(el.tagName).toBe("SECTION");
    expect(el.getAttribute("class")).toBe("box");
    expect(el.textContent).toBe("hello");
    expect(parent.children[0]).toBe(el);
  });

  it("createElementOrElements handles arrays, undefined and single vnodes", () => {
    const parent = document.createElement("div");
    const r = renderer();

    const many = r.createElementOrElements(
      [
        { type: "i", attributes: {}, children: ["a"] },
        { type: "b", attributes: {}, children: ["b"] },
      ],
      parent,
    ) as Array<Element | Text | undefined>;
    expect(many.length).toBe(2);
    expect(parent.querySelector("i")!.textContent).toBe("a");
    expect(parent.querySelector("b")!.textContent).toBe("b");

    // undefined renders as an empty text node
    const parent2 = document.createElement("div");
    const undef = r.createElementOrElements(undefined, parent2) as Text;
    expect(undef.nodeType).toBe(3);
    expect(parent2.childNodes.length).toBe(1);
  });

  it("createTextNode appends only when a parent is given", () => {
    const free = renderer().createTextNode("free");
    expect(free.textContent).toBe("free");
    expect(free.parentNode).toBeNull();

    const parent = document.createElement("div");
    renderer().createTextNode("in", parent);
    expect(parent.textContent).toBe("in");
  });

  it("createChildElements skips booleans and stringifies null/undefined", () => {
    const parent = document.createElement("div");
    renderer().createChildElements(
      [true, false, null, undefined, 0, "x"] as any,
      parent,
    );
    // booleans skipped; null/undefined -> empty text; 0 -> "0"; "x" -> "x"
    expect(parent.textContent).toBe("0x");
  });

  it("creates an empty div for unresolved AsyncFunction vnodes", () => {
    const el = renderer().createElement((async () => {}) as any) as HTMLElement;
    expect(el.tagName).toBe("DIV");
  });

  it("renders a FATAL ERROR div for function-typed vnodes", () => {
    const el = renderer().createElement({
      type: function Broken() {},
      attributes: {},
      children: [],
    }) as unknown as HTMLElement;
    expect(el.tagName).toBe("DIV");
    expect(el.innerText).toContain("FATAL ERROR");
  });

  it("creates SVG elements in the SVG namespace, including nested children", () => {
    const el = renderer().createElement({
      type: "svg",
      attributes: { viewBox: "0 0 1 1" },
      children: [{ type: "circle", attributes: { cx: 1 } }],
    }) as Element;
    expect(el.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(el.children[0].namespaceURI).toBe("http://www.w3.org/2000/svg");
  });

  it("does not treat STYLE/SCRIPT inside SVG as SVG-namespaced", () => {
    const r = renderer();
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    expect(r.hasSvgNamespace(svg, "STYLE")).toBe(false);
    expect(r.hasSvgNamespace(svg, "SCRIPT")).toBe(false);
    expect(r.hasSvgNamespace(svg, "CIRCLE")).toBe(true);
  });

  it("applies dangerouslySetInnerHTML and skips children", () => {
    const el = renderer().createElement({
      type: "div",
      attributes: { dangerouslySetInnerHTML: { __html: "<b>raw</b>" } },
      children: [{ type: "i", attributes: {}, children: ["ignored"] }],
    }) as HTMLElement;
    expect(el.innerHTML).toBe("<b>raw</b>");
    expect(el.querySelector("i")).toBeNull();
  });

  describe("setAttribute", () => {
    const setup = () => {
      const el = document.createElement("div");
      return { el, r: renderer() };
    };

    it("ignores undefined values", () => {
      const { el, r } = setup();
      r.setAttribute("title", undefined, el);
      expect(el.hasAttribute("title")).toBe(false);
    });

    it("ignores the dangerouslySetInnerHTML pseudo-attribute", () => {
      const { el, r } = setup();
      r.setAttribute("dangerouslySetInnerHTML", { __html: "x" }, el);
      expect(el.hasAttribute("dangerouslySetInnerHTML")).toBe(false);
    });

    it("stores key internally without serializing it", () => {
      const { el, r } = setup();
      r.setAttribute("key", "k1", el);
      expect(el.hasAttribute("key")).toBe(false);
      expect((el as any)._defussKey).toBe("k1");
    });

    it("maps className to class and joins class arrays", () => {
      const { el, r } = setup();
      r.setAttribute("className", "a", el);
      expect(el.getAttribute("class")).toBe("a");
      r.setAttribute("class", ["x", false, "y"], el);
      expect(el.getAttribute("class")).toBe("x y");
    });

    it("applies style objects as individual style properties", () => {
      const { el, r } = setup();
      r.setAttribute("style", { color: "red", paddingLeft: "3px" }, el);
      expect(el.style.color).toBe("red");
      expect(el.style.paddingLeft).toBe("3px");
    });

    it("sets boolean attributes as property + attribute, removes on false", () => {
      const { el, r } = setup();
      r.setAttribute("hidden", true, el);
      expect((el as any).hidden).toBe(true);
      expect(el.hasAttribute("hidden")).toBe(true);
      r.setAttribute("hidden", false, el);
      expect((el as any).hidden).toBe(false);
      expect(el.hasAttribute("hidden")).toBe(false);
    });

    it("syncs value/checked as live properties on form elements", () => {
      const r = renderer();
      const input = document.createElement("input");
      r.setAttribute("value", "v1", input);
      expect(input.value).toBe("v1");
      expect(input.getAttribute("value")).toBe("v1");

      r.setAttribute("checked", true, input);
      expect(input.checked).toBe(true);
      expect(input.hasAttribute("checked")).toBe(true);
      r.setAttribute("checked", false, input);
      expect(input.checked).toBe(false);
      expect(input.hasAttribute("checked")).toBe(false);

      const select = document.createElement("select");
      const optA = document.createElement("option");
      const optB = document.createElement("option");
      select.append(optA, optB);
      r.setAttribute("selectedIndex", 1, select);
      expect(select.selectedIndex).toBe(1);
      expect(select.hasAttribute("selectedIndex")).toBe(false);
    });

    it("sets plain string values as attributes on non-form elements", () => {
      const { el, r } = setup();
      r.setAttribute("value", "plain", el);
      expect(el.getAttribute("value")).toBe("plain");
    });

    it("assigns refs: current, _defussRef and unmount wiring", async () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);
      const el = document.createElement("div");
      parent.appendChild(el);

      const ref = { current: null as unknown };
      renderer().setAttribute("ref", ref, el);

      expect(ref.current).toBe(el);
      expect((el as any)._defussRef).toBe(ref);
      expect(typeof (el as any).$onUnmount).toBe("function");
    });

    it("wires onMount via $onMount (microtask-deferred) and onUnmount", async () => {
      const parent = document.createElement("div");
      document.body.appendChild(parent);
      const el = document.createElement("div");
      parent.appendChild(el);

      const onMount = vi.fn();
      const onUnmount = vi.fn();
      const r = renderer();
      r.setAttribute("onMount", onMount, el);
      r.setAttribute("onUnmount", onUnmount, el);

      expect(typeof (el as any).$onMount).toBe("function");
      expect(onMount).not.toHaveBeenCalled(); // deferred

      handleLifecycleEventsForOnMount(el);
      expect((el as any).$onMount).toBeNull(); // consumed
      await flushMicrotasks();
      expect(onMount).toHaveBeenCalledTimes(1);
      expect(onMount.mock.calls[0][0]).toBe(el);
    });

    it("chains multiple onUnmount registrations", async () => {
      const el = document.createElement("div");
      const a = vi.fn();
      const b = vi.fn();
      const r = renderer();
      r.setAttribute("onUnmount", a, el);
      r.setAttribute("onUnmount", b, el);

      (el as any).$onUnmount();
      await flushMicrotasks(); // the first registration is microtask-wrapped
      expect(a).toHaveBeenCalledTimes(1);
      expect(b).toHaveBeenCalledTimes(1);
    });

    it("sets namespaced attributes (xlink) on SVG elements", () => {
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
      renderer().setAttribute("xlinkHref", "#icon", use);
      expect(
        use.getAttributeNS("http://www.w3.org/1999/xlink", "href"),
      ).toBe("#icon");
    });
  });

  it("setAttributes applies every attribute of a vnode", () => {
    const el = document.createElement("div");
    renderer().setAttributes(
      { type: "div", attributes: { class: "c", title: "t" } } as VNode,
      el,
    );
    expect(el.getAttribute("class")).toBe("c");
    expect(el.getAttribute("title")).toBe("t");
  });

  it("rethrows fatal render errors after logging", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderer().createElement({
        type: "div",
        attributes: {
          // an attribute getter that throws while setAttributes reads it
          get bad() {
            throw new Error("attr boom");
          },
        },
        children: [],
      }),
    ).toThrow("attr boom");
    expect(errSpy).toHaveBeenCalled();
  });
});

describe("observeUnmount", () => {
  it("throws on invalid arguments", () => {
    expect(() => observeUnmount(null as any, () => {})).toThrow();
    expect(() => observeUnmount(document.createElement("div"), null as any)).toThrow();
  });

  it("throws when the node has no parentNode", () => {
    expect(() => observeUnmount(document.createElement("div"), () => {})).toThrow(
      "parentNode",
    );
  });

  it("fires when the node is removed from the DOM", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const child = document.createElement("span");
    parent.appendChild(child);

    const onUnmount = vi.fn();
    observeUnmount(child, onUnmount);

    parent.removeChild(child);
    await flushMicrotasks();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the node is moved (re-arms on the new parent)", async () => {
    const parentA = document.createElement("div");
    const parentB = document.createElement("div");
    document.body.append(parentA, parentB);
    const child = document.createElement("span");
    parentA.appendChild(child);

    const onUnmount = vi.fn();
    observeUnmount(child, onUnmount);

    parentB.appendChild(child); // move, not unmount
    await flushMicrotasks();
    expect(onUnmount).not.toHaveBeenCalled();

    // re-armed on parentB: real removal still fires
    parentB.removeChild(child);
    await flushMicrotasks();
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });
});

describe("queueCallback", () => {
  it("defers the callback to a microtask and forwards args", async () => {
    const cb = vi.fn();
    const queued = queueCallback(cb);

    queued("a", 1);
    expect(cb).not.toHaveBeenCalled();

    await flushMicrotasks();
    expect(cb).toHaveBeenCalledWith("a", 1);
  });
});

describe("ref wiring for detached elements", () => {
  it("arms unmount observation once the element is attached later", async () => {
    const ref = { current: undefined as unknown };
    const r = getRenderer(document);

    // created without a parent -> parentNode is null at setAttribute time,
    // so observation must be (re-)armed on the microtask after attaching
    const el = r.createElement({
      type: "span",
      attributes: { ref },
      children: [],
    }) as HTMLElement;

    expect(ref.current).toBe(el);
    expect(el.parentNode).toBeNull();

    const parent = document.createElement("div");
    document.body.appendChild(parent);
    parent.appendChild(el); // attach before the microtask runs
    await flushMicrotasks(); // queueMicrotask arm path

    // removing afterwards must not throw (observer was armed on the real parent)
    expect(() => parent.removeChild(el)).not.toThrow();
  });
});

describe("controlled props with non-boolean values", () => {
  const r = () => getRenderer(document);

  it("sets the checked attribute for truthy non-boolean values", () => {
    const input = document.createElement("input");
    r().setAttribute("checked", 1, input);
    // property is assigned raw; the attribute reflects truthiness
    expect((input as HTMLInputElement).checked).toBeTruthy();
    expect(input.getAttribute("checked")).toBe("");
  });

  it("removes the checked attribute for falsy non-boolean values", () => {
    const input = document.createElement("input");
    input.setAttribute("checked", "");
    r().setAttribute("checked", 0, input);
    expect((input as HTMLInputElement).checked).toBeFalsy();
    expect(input.hasAttribute("checked")).toBe(false);
  });
});
