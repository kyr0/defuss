import { describe, expect, it, vi } from "vitest";
import {
  type Globals,
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

describe("morph(el, html) — browser e2e", () => {
  it("preserves a native event listener when morphing node text", () => {
    // the exact scenario: node created, text changed, listener still attached
    const el = container(`<button id="b">old</button>`);
    const btn = el.querySelector("#b") as HTMLButtonElement;

    const onClick = vi.fn();
    btn.addEventListener("click", onClick);

    morph(el, `<button id="b" class="hot">new</button>`);

    const after = el.querySelector("#b") as HTMLButtonElement;
    expect(after).toBe(btn); // same DOM node — patched, not replaced
    expect(after.textContent).toBe("new");
    expect(after.getAttribute("class")).toBe("hot");

    after.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1); // listener still attached
  });

  it("preserves delegated event handlers across repeated morphs (no double-fire)", () => {
    const el = container(`<button id="d">v1</button>`);
    const btn = el.querySelector("#d") as HTMLButtonElement;

    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    morph(el, `<button id="d">v2</button>`);
    morph(el, `<button id="d" class="x">v3</button>`);

    const after = el.querySelector("#d") as HTMLButtonElement;
    expect(after).toBe(btn);

    after.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("keeps listeners on keyed nodes when they move", () => {
    const el = container(
      `<ul><li key="a"><button id="ba">A</button></li><li key="b"><button id="bb">B</button></li></ul>`,
    );
    const liA = el.querySelector(`li[key="a"]`) as HTMLElement;
    const btnA = el.querySelector("#ba") as HTMLButtonElement;
    const onA = vi.fn();
    btnA.addEventListener("click", onA);

    morph(
      el,
      `<ul><li key="b"><button id="bb">B</button></li><li key="a"><button id="ba">A!</button></li></ul>`,
    );

    const items = el.querySelectorAll("li");
    expect(items[0]).not.toBe(liA);
    expect(items[1]).toBe(liA); // moved, identity kept
    expect(el.querySelector("#ba")).toBe(btnA);
    expect(btnA.textContent).toBe("A!");

    btnA.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onA).toHaveBeenCalledTimes(1);
  });

  it("preserves focus when the focused element is patched in place", () => {
    const el = container(
      `<label>Name <input id="i" type="text" value="x"></label>`,
    );
    const input = el.querySelector("#i") as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    morph(el, `<label>Renamed <input id="i" type="text" value="x"></label>`);

    expect(el.querySelector("#i")).toBe(input);
    expect(document.activeElement).toBe(input); // still focused
    expect(el.querySelector("label")!.textContent).toContain("Renamed");
  });

  it("morphs shadow roots of plain elements and light DOM of custom elements", () => {
    class MyCard extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
      }
    }
    if (!customElements.get("my-card")) {
      customElements.define("my-card", MyCard);
    }

    const host = document.createElement("my-card");
    document.body.appendChild(host);
    morph(host, `<span slot="x">light</span>`);

    expect(host.children.length).toBe(1); // light DOM
    expect(host.shadowRoot!.childNodes.length).toBe(0); // shadow untouched

    const plain = container();
    plain.attachShadow({ mode: "open" });
    morph(plain, `<b>shadow</b>`);
    expect(plain.childNodes.length).toBe(0);
    expect(plain.shadowRoot!.querySelector("b")!.textContent).toBe("shadow");
  });

  it("applies a fade transition around the morph (async)", async () => {
    const el = container(`<p>before</p>`);
    const result = morph(el, `<p>after</p>`, {
      transition: { type: "fade", duration: 30, target: "self" },
    });

    expect(result).toBeInstanceOf(Promise);
    await result;

    expect(el.querySelector("p")!.textContent).toBe("after");
    // styles restored after transition
    expect((el as HTMLElement).style.cssText).toBe("");
  });

  it("morphs synchronously when no transition is given", () => {
    const el = container(`<p>sync</p>`);
    const result = morph(el, `<p>done</p>`);
    expect(result).toBeUndefined();
    expect(el.querySelector("p")!.textContent).toBe("done");
  });

  it("clears delegated handlers of removed elements in a real browser", () => {
    const el = container(`<button id="rm">x</button>`);
    const btn = el.querySelector("#rm") as HTMLButtonElement;
    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);

    morph(el, `<span>gone</span>`);

    expect(getRegisteredEventKeys(btn).size).toBe(0);
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1); // no further calls
  });

  it("morphs plain text as a text node in a real browser", () => {
    const el = container(`<b>x</b>`);
    morph(el, "just text");
    expect(el.childNodes.length).toBe(1);
    expect(el.childNodes[0].nodeType).toBe(3);
    expect(el.textContent).toBe("just text");
  });

  it("supports vnode-driven morphing with onMount lifecycle in browser", () => {
    const el = container();
    const onMount = vi.fn();

    updateDomWithVdom(
      el,
      {
        type: "div",
        attributes: { id: "lc", onMount },
        children: ["alive"],
      },
      globals,
    );

    expect(el.querySelector("#lc")!.textContent).toBe("alive");
    // onMount is queueMicrotask-wrapped by the renderer
    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        expect(onMount).toHaveBeenCalledTimes(1);
        resolve();
      });
    });
  });
});
