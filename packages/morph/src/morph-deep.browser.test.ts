import { describe, expect, it, vi } from "vitest";
import {
  type Globals,
  morph,
  registerDelegatedEvent,
  updateDomWithVdom,
} from "./index.js";

const globals = globalThis as unknown as Globals;

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

describe("deep e2e — large keyed lists", () => {
  it("shuffles a 50-item keyed list, preserving identities and listeners", () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const el = container(
      `<ul>${items.map((i) => `<li key="k${i}"><button data-i="${i}">${i}</button></li>`).join("")}</ul>`,
    );

    // identity map + listeners before the shuffle
    const beforeLi = new Map<number, HTMLElement>();
    const clicks = new Map<number, number>();
    for (const i of items) {
      const li = el.querySelector(`li[key="k${i}"]`) as HTMLElement;
      beforeLi.set(i, li);
      clicks.set(i, 0);
      const btn = li.querySelector("button")!;
      btn.addEventListener("click", () => clicks.set(i, (clicks.get(i) ?? 0) + 1));
    }

    // shuffle (deterministic odd/even split + reverse), remove k7, add k50
    const shuffled = [
      50,
      ...items.filter((i) => i % 2 === 1 && i !== 7).reverse(),
      ...items.filter((i) => i % 2 === 0),
    ];
    morph(
      el,
      `<ul>${shuffled.map((i) => `<li key="k${i}"><button data-i="${i}">${i}!</button></li>`).join("")}</ul>`,
    );

    const after = el.querySelectorAll("li");
    expect(after.length).toBe(50); // 50 - 1 removed + 1 added

    shuffled.forEach((i, pos) => {
      expect(after[pos].textContent).toBe(`${i}!`);
      if (i !== 50) {
        expect(after[pos]).toBe(beforeLi.get(i)); // moved, identity preserved
        const btn = after[pos].querySelector("button")!;
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        expect(clicks.get(i)).toBe(1); // listener survived the move
      }
    });
    expect(el.querySelector(`li[key="k7"]`)).toBeNull(); // removed
  });

  it("reorders table rows by key (parser normalization sanity)", () => {
    const el = container(
      `<table><tbody><tr key="1"><td>one</td></tr><tr key="2"><td>two</td></tr><tr key="3"><td>three</td></tr></tbody></table>`,
    );
    const row2 = el.querySelector(`tr[key="2"]`);

    morph(
      el,
      `<table><tbody><tr key="3"><td>three</td></tr><tr key="2"><td>two!</td></tr><tr key="1"><td>one</td></tr></tbody></table>`,
    );

    const rows = el.querySelectorAll("tr");
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toBe("three");
    expect(rows[1]).toBe(row2); // moved, not recreated
    expect(rows[1].textContent).toBe("two!");
    expect(rows[2].textContent).toBe("one");
  });
});

describe("deep e2e — interactive element state", () => {
  it("preserves input selection range across a patch", () => {
    const el = container(`<input id="i" value="abcdef">`);
    const input = el.querySelector("#i") as HTMLInputElement;
    input.focus();
    input.setSelectionRange(2, 4);

    morph(el, `<input id="i" class="x" value="abcdef">`);

    expect(el.querySelector("#i")).toBe(input);
    expect(input.selectionStart).toBe(2);
    expect(input.selectionEnd).toBe(4);
    expect(document.activeElement).toBe(input);
  });

  it("preserves scroll position of a patched scroll container", () => {
    const el = container(
      `<div id="scroll" style="height: 50px; overflow-y: auto;">` +
        Array.from({ length: 30 }, (_, i) => `<p>line ${i}</p>`).join("") +
        `</div>`,
    );
    const scroller = el.querySelector("#scroll") as HTMLElement;
    scroller.scrollTop = 100;

    morph(
      el,
      `<div id="scroll" style="height: 50px; overflow-y: auto;" class="patched">` +
        Array.from({ length: 30 }, (_, i) => `<p>line ${i}</p>`).join("") +
        `</div>`,
    );

    expect(el.querySelector("#scroll")).toBe(scroller);
    expect(scroller.classList.contains("patched")).toBe(true);
    expect(scroller.scrollTop).toBe(100);
  });

  it("applies selected option from HTML (controlled) and keeps uncontrolled selection", () => {
    const el = container(
      `<select><option value="a">A</option><option value="b">B</option></select>`,
    );
    const select = el.querySelector("select") as HTMLSelectElement;

    // controlled: new HTML declares selected -> applied
    morph(
      el,
      `<select><option value="a">A</option><option value="b" selected>B</option></select>`,
    );
    expect(select.value).toBe("b");

    // uncontrolled: user changes selection, new HTML omits selected -> kept
    select.value = "a";
    morph(
      el,
      `<select class="x"><option value="a">A</option><option value="b">B</option></select>`,
    );
    expect(select.value).toBe("a");
    expect(select.getAttribute("class")).toBe("x");
  });

  it("keeps a blurred textarea's typed value but refreshes its default content", () => {
    const el = container(`<textarea>initial</textarea>`);
    const ta = el.querySelector("textarea") as HTMLTextAreaElement;

    ta.focus();
    ta.value = "typed";
    morph(el, `<textarea class="a">initial</textarea>`);
    expect(ta.value).toBe("typed"); // focused: untouched

    ta.blur();
    morph(el, `<textarea class="a">server</textarea>`);
    expect(ta.textContent).toBe("server"); // children reconciled
    expect(ta.value).toBe("typed"); // dirty flag: live value preserved (HTML semantics)
  });
});

describe("deep e2e — events under morphing", () => {
  it("fires onUnmount when a lifecycle element is morphed away", async () => {
    const el = container();
    const onUnmount = vi.fn();

    updateDomWithVdom(
      el,
      [{ type: "section", attributes: { id: "gone", onUnmount }, children: ["x"] }],
      globals,
    );
    expect(el.querySelector("#gone")).not.toBeNull();

    morph(el, `<p>replaced</p>`);
    expect(el.querySelector("#gone")).toBeNull();

    // MutationObserver + microtask defer
    await new Promise((r) => setTimeout(r, 0));
    expect(onUnmount).toHaveBeenCalledTimes(1);
  });

  it("suppresses re-entrant dispatch from within a running handler", () => {
    const el = container(`<button id="r">x</button>`);
    const btn = el.querySelector("#r") as HTMLButtonElement;

    let depth = 0;
    let calls = 0;
    registerDelegatedEvent(btn, "click", () => {
      calls++;
      if (depth++ === 0) {
        btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
      depth--;
    });

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(calls).toBe(1); // no infinite recursion, no double dispatch
  });

  it("delegates events inside shadow roots", () => {
    const host = container();
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `<button id="in-shadow">x</button>`;

    const btn = shadow.querySelector("#in-shadow") as HTMLButtonElement;
    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("deep e2e — custom elements and slots", () => {
  it("morphs slotted light-DOM content of a custom element (projection updates)", () => {
    class SlotCard extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `<h2><slot name="title"></slot></h2><slot></slot>`;
      }
    }
    if (!customElements.get("slot-card")) {
      customElements.define("slot-card", SlotCard);
    }

    const host = document.createElement("slot-card");
    host.innerHTML = `<span slot="title">Old title</span><p>Old body</p>`;
    document.body.appendChild(host);

    morph(host, `<span slot="title">New title</span><p>New body</p>`);

    expect(host.querySelector(`[slot="title"]`)!.textContent).toBe("New title");
    expect(host.querySelector("p")!.textContent).toBe("New body");
    // shadow structure untouched
    expect(host.shadowRoot!.querySelector("h2")).not.toBeNull();
  });
});

describe("deep e2e — transitions", () => {
  it("morphs content through a real slide transition in the browser", async () => {
    const el = container(`<p>before</p>`);
    await morph(el, `<p>after</p>`, {
      transition: { type: "slide-left", duration: 20, target: "self" },
    });
    expect(el.textContent).toBe("after");
    expect((el as HTMLElement).style.transition).toBe(""); // restored
  });

  // Overlapping morphs are latest-wins: a plain morph issued during a
  // transition's exit phase rewrites the transition's content slot, so the
  // deferred update re-applies the latest content instead of stale content.
  it("a plain morph during a transition's exit phase wins (latest-wins)", async () => {
    const el = container(`<p>A</p>`);

    const pending = morph(el, `<p>B-stale</p>`, {
      transition: { type: "slide-left", duration: 50, target: "self" },
    });
    morph(el, `<p>C-latest</p>`); // issued during the transition's exit phase

    await pending;
    expect(el.textContent).toBe("C-latest");
  });

  it("a plain morph during a transition's enter phase also wins", async () => {
    const el = container(`<p>A</p>`);

    const pending = morph(el, `<p>B</p>`, {
      transition: { type: "slide-left", duration: 30, target: "self" },
    });
    // wait until the transition reached its enter phase (exit ~30ms elapsed)
    await new Promise((r) => setTimeout(r, 45));
    morph(el, `<p>C</p>`);

    await pending;
    expect(el.textContent).toBe("C");
  });

  it("overlapping transitions resolve to the latest content", async () => {
    const el = container(`<p>A</p>`);

    const first = morph(el, `<p>B</p>`, {
      transition: { type: "slide-left", duration: 40, target: "self" },
    });
    const second = morph(el, `<p>C</p>`, {
      transition: { type: "slide-right", duration: 20, target: "self" },
    });

    await Promise.all([first, second]);
    expect(el.textContent).toBe("C");
  });

  // the documented contract: awaiting the transition serializes correctly —
  // the race only exists for fire-and-forget usage during the exit phase
  it("awaiting a transition serializes with later morphs (the correct pattern)", async () => {
    const el = container(`<p>A</p>`);

    await morph(el, `<p>B</p>`, {
      transition: { type: "slide-left", duration: 20, target: "self" },
    });
    morph(el, `<p>C</p>`); // issued after the transition completed

    expect(el.textContent).toBe("C");
  });

  it("a promise-chained morph queue plays rapid updates in order", async () => {
    const el = container(`<p>A</p>`);
    const t = { transition: { type: "slide-left" as const, duration: 10, target: "self" as const } };

    let chain = Promise.resolve() as Promise<void | undefined>;
    const queueMorph = (html: string) => (chain = chain.then(() => morph(el, html, t)));

    queueMorph(`<p>one</p>`);
    queueMorph(`<p>two</p>`);
    queueMorph(`<p>three</p>`);
    await chain;

    expect(el.textContent).toBe("three");
  });
});
