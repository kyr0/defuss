import { describe, expect, it, vi } from "vitest";
import { type VNode, morph, registerDelegatedEvent, updateDomWithVdom } from "./index.js";

/**
 * Diff mode: partial change-sets addressed by key/id — matched nodes are
 * patched with attributes merged, new keyed items are appended, everything
 * unmentioned keeps identity, order and state. Never removes, never moves.
 *
 * Note: diff items address the *direct children* of the morph target, so the
 * keyed/idded elements sit at the top level of the container here.
 */

const container = (html = ""): HTMLElement => {
  const el = document.createElement("div");
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
};

describe("morph diff mode", () => {
  it("patches a keyed item: attributes merge, unmentioned attrs survive", () => {
    const el = container(`<li key="a" class="old" data-x="1">A</li>`);

    morph(el, `<li key="a" class="new">A updated</li>`, { diff: true });

    const li = el.querySelector("li")!;
    expect(li.getAttribute("class")).toBe("new"); // declared: applied
    expect(li.getAttribute("data-x")).toBe("1"); // undeclared: kept
    expect(li.textContent).toBe("A updated"); // declared children replace
  });

  it("leaves unmentioned siblings untouched (identity, order, state)", () => {
    const el = container(
      `<li key="a">A</li><li key="b">B</li><li key="c">C</li>`,
    );
    const liA = el.children[0];
    const liC = el.children[2];

    morph(el, `<li key="b">B2</li>`, { diff: true });

    expect(el.children.length).toBe(3); // never removes
    expect(el.children[0]).toBe(liA); // never moves
    expect(el.children[2]).toBe(liC);
    expect(el.children[1].textContent).toBe("B2");
  });

  it("patches in place: the addressed node keeps its DOM identity", () => {
    const el = container(`<div id="x" class="a">old</div>`);
    const div = el.children[0];

    morph(el, `<div id="x" class="b">new</div>`, { diff: true });

    expect(el.children[0]).toBe(div); // patched, not recreated
  });

  it("appends new keyed items after the existing children", () => {
    const el = container(`<li key="a">A</li>`);
    const liA = el.children[0];

    morph(el, `<li key="b">B</li><li key="c">C</li>`, { diff: true });

    expect(el.children.length).toBe(3); // append, not replace
    expect(el.children[0]).toBe(liA); // existing kept first
    expect(el.children[1].textContent).toBe("B");
    expect(el.children[2].textContent).toBe("C");
  });

  it("matches by id when no key is given", () => {
    const el = container(`<p id="target" data-keep="1">old</p><p>other</p>`);

    morph(el, `<p id="target">new</p>`, { diff: true });

    expect(el.querySelector("#target")!.textContent).toBe("new");
    expect(el.querySelector("#target")!.getAttribute("data-keep")).toBe("1");
    expect(el.querySelectorAll("p").length).toBe(2); // other untouched
  });

  it("applies tag changes on an addressed node as replacement", () => {
    const el = container(`<li key="a">A</li>`);

    morph(el, `<span key="a">A as span</span>`, { diff: true });

    expect(el.querySelector("li")).toBeNull();
    expect(el.querySelector("span")!.textContent).toBe("A as span");

    // re-addressable afterwards via the same key (internal key survives)
    morph(el, `<span key="a">updated</span>`, { diff: true });
    expect(el.querySelector("span")!.textContent).toBe("updated");
  });

  it("VNode patch items set only the new value (undeclared attrs survive)", () => {
    const el = container(`<input key="cb" type="checkbox" checked>`);

    // minimal patch item: address (key) + new value — not even a tag needed,
    // a matched item borrows the addressed node's tag
    morph(el, [{ attributes: { key: "cb", checked: false } }], { diff: true });

    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(false); // explicit false wins over live state
    expect(input.getAttribute("type")).toBe("checkbox"); // undeclared: kept
    expect(input.tagName).toBe("INPUT"); // borrowed tag -> patched, not replaced
  });

  it("tag-less patch items must match an existing node (nothing to create from)", () => {
    const el = container(`<p>x</p>`);

    expect(() =>
      morph(el, [{ attributes: { key: "ghost", class: "x" } }], { diff: true }),
    ).toThrow(/must declare a tag/);
    expect(el.querySelector("p")!.textContent).toBe("x");
  });

  it("preserves undeclared delegated handlers of a patched node", () => {
    const el = container(`<button key="b">clicks: 0</button>`);
    const btn = el.querySelector("button")!;
    const onClick = vi.fn();
    registerDelegatedEvent(btn, "click", onClick);

    // patch item declares no handlers: existing delegated handler survives
    morph(el, `<button key="b">clicked</button>`, { diff: true });

    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("patches children only when the item declares them", () => {
    const el = container(`<section key="s"><p>keep me</p></section>`);

    // attributes-only patch: no children declared -> children untouched
    updateDomWithVdom(
      el,
      [{ type: "section", attributes: { key: "s", class: "done" } } as VNode],
      undefined,
      "diff",
    );

    const section = el.querySelector("section")!;
    expect(section.getAttribute("class")).toBe("done");
    expect(section.querySelector("p")!.textContent).toBe("keep me");
  });

  it("an explicit empty children array clears children (VNode input)", () => {
    const el = container(`<section key="s"><p>remove me</p></section>`);

    updateDomWithVdom(
      el,
      [{ type: "section", attributes: { key: "s" }, children: [] } as VNode],
      undefined,
      "diff",
    );

    expect(el.querySelector("section")!.children.length).toBe(0);
  });

  it("throws on key-less items and plain text (unaddressable)", () => {
    const el = container(`<p>x</p>`);

    expect(() => morph(el, `<li>no key</li>`, { diff: true })).toThrow(
      /key or id/,
    );
    expect(() => morph(el, "just text", { diff: true })).toThrow(/key or id/);
    // non-object vnodes without key: same contract via VNode input
    expect(() =>
      morph(
        el,
        [{ type: "div", attributes: {}, children: [] }] as VNode[],
        { diff: true },
      ),
    ).toThrow(/key or id/);
    expect(el.querySelector("p")!.textContent).toBe("x"); // nothing applied
  });

  it("tolerates formatting whitespace between change-set items", () => {
    const el = container(`<li key="a">A</li><li key="b">B</li>`);

    // multi-line template literals parse to whitespace text nodes between
    // the items — meaningless in a change-set, must not throw
    morph(
      el,
      `
  <li key="b">B updated</li>
  <li key="c">C</li>
`,
      { diff: true },
    );

    expect(el.children[0].textContent).toBe("A");
    expect(el.children[1].textContent).toBe("B updated");
    expect(el.children[2].textContent).toBe("C");
  });

  it("empty diff is a no-op", () => {
    const el = container(`<p>keep</p>`);
    morph(el, "", { diff: true });
    expect(el.innerHTML).toBe("<p>keep</p>");
  });

  it("first-wins on duplicate keys: only the first match is patched", () => {
    const el = container(`<li key="a">first</li><li key="a">second</li>`);

    morph(el, `<li key="a">patched</li>`, { diff: true });

    expect(el.children.length).toBe(2); // never removes
    expect(el.children[0].textContent).toBe("patched");
    expect(el.children[1].textContent).toBe("second");
  });

  it("throws for component-typed items with a clear message", () => {
    const el = container(`<p>x</p>`);
    expect(() =>
      morph(el, [{ type: () => {} }] as VNode[], { diff: true }),
    ).toThrow(/must be elements with a key or id/);
  });

  it("works with a transition (async) and keeps diff semantics", async () => {
    const el = container(`<p key="p" class="old">a</p><p>keep</p>`);

    await morph(el, `<p key="p" class="new">b</p>`, {
      transition: { type: "fade", duration: 10, target: "self" },
      diff: true,
    });

    expect(el.children[0].getAttribute("class")).toBe("new");
    expect(el.children.length).toBe(2); // sibling survived
  });

  it("queues re-entrant diff morphs and replays them in diff mode", () => {
    const el = container(
      `<div id="outer"><p id="inner"><span id="target" data-x="1">old</span></p></div>`,
    );
    const inner = el.querySelector("#inner") as HTMLElement;
    const outer = el.querySelector("#outer") as HTMLElement;

    // raw synchronous lifecycle hook — fires mid-morph during patching
    (outer as any).$onMount = () => {
      // diff morph on a descendant while the ancestor morph is active:
      // patches #target (a child of #inner) — must be queued, not applied now
      updateDomWithVdom(
        inner,
        [
          {
            type: "span",
            attributes: { id: "target", class: "queued" },
          } as VNode,
        ],
        undefined,
        "diff",
      );
    };

    updateDomWithVdom(
      el,
      [{ type: "div", attributes: { id: "outer", class: "done" } } as VNode],
      undefined,
      "diff",
    );

    expect(outer.getAttribute("class")).toBe("done");
    // queued diff was flushed after the active morph, still in diff mode:
    // attributes merged (data-x kept), text children untouched (not declared)
    const target = el.querySelector("#target")!;
    expect(target.getAttribute("class")).toBe("queued");
    expect(target.getAttribute("data-x")).toBe("1");
    expect(target.textContent).toBe("old");
  });
});
