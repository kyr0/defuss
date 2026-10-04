import { describe, expect, it } from "vitest";
import { morph, onClearDelegatedEvents, type VNode } from "./index.js";

const container = (): HTMLElement => {
  const el = document.createElement("div");
  document.body.appendChild(el);
  return el;
};

const tick = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

describe("delegated JSX handlers — non-bubbling events (real browser)", () => {
  it("onToggle fires on its <details>, but not on an ancestor's onToggle", async () => {
    const el = container();
    const log: string[] = [];
    morph(el, [
      {
        type: "section",
        attributes: { onToggle: () => log.push("section") },
        children: [
          {
            type: "details",
            attributes: { id: "d", onToggle: () => log.push("details") },
            children: [{ type: "summary", attributes: {}, children: ["s"] }],
          },
        ],
      } satisfies VNode,
    ]);

    (el.querySelector("#d") as HTMLDetailsElement).open = true;
    await tick();

    expect(log).toEqual(["details"]);
  });

  it("onLoad and onError fire on <img>", async () => {
    const el = container();
    const log: string[] = [];
    morph(el, [
      {
        type: "img",
        attributes: { id: "ok", onLoad: () => log.push("load") },
        children: [],
      },
      {
        type: "img",
        attributes: { id: "bad", onError: () => log.push("error") },
        children: [],
      },
    ]);

    (el.querySelector("#ok") as HTMLImageElement).src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    (el.querySelector("#bad") as HTMLImageElement).src =
      "data:image/png;base64,broken";
    await tick(100);

    expect(log.sort()).toEqual(["error", "load"]);
  });

  it("a non-bubbling event fires its target's handler exactly once", async () => {
    const el = container();
    let count = 0;
    morph(el, [
      {
        type: "details",
        attributes: { id: "d", onToggle: () => count++ },
        children: [{ type: "summary", attributes: {}, children: ["s"] }],
      },
    ]);

    (el.querySelector("#d") as HTMLDetailsElement).open = true;
    await tick();

    expect(count).toBe(1);
  });
});

describe("onClearDelegatedEvents", () => {
  it("runs for every element morph removes, and stops after unregister", () => {
    const el = container();
    morph(el, `<ul><li id="a">A</li></ul><p id="gone">x</p>`);
    const removed = [el.querySelector("#gone"), el.querySelector("ul")];
    const seen: EventTarget[] = [];
    const off = onClearDelegatedEvents((target) => seen.push(target));

    morph(el, `<span>y</span>`);
    expect(seen).toEqual(expect.arrayContaining(removed));

    off();
    seen.length = 0;
    morph(el, ``);
    expect(seen).toEqual([]);
  });
});

describe("JSX handlers follow native propagation", () => {
  const mount = (vnode: VNode) => {
    const el = container();
    morph(el, [vnode]);
    return el;
  };

  it("an ancestor's native capture stopPropagation() stops a descendant's onClickCapture", () => {
    let calls = 0;
    const el = mount({
      type: "div",
      attributes: { id: "p" },
      children: [
        { type: "button", attributes: { id: "c", onClickCapture: () => calls++ }, children: [] },
      ],
    });
    el.querySelector("#p")!.addEventListener("click", (e) => e.stopPropagation(), true);

    (el.querySelector("#c") as HTMLElement).click();

    expect(calls).toBe(0);
  });

  it("an ancestor's native capture stopPropagation() stops a non-bubbling onToggle", async () => {
    let calls = 0;
    const el = mount({
      type: "div",
      attributes: { id: "p" },
      children: [
        {
          type: "details",
          attributes: { id: "d", onToggle: () => calls++ },
          children: [{ type: "summary", attributes: {}, children: ["s"] }],
        },
      ],
    });
    el.querySelector("#p")!.addEventListener("toggle", (e) => e.stopPropagation(), true);

    (el.querySelector("#d") as HTMLDetailsElement).open = true;
    await tick();

    expect(calls).toBe(0);
  });

  it("currentTarget is the element, and capture order interleaves with native listeners", () => {
    const log: string[] = [];
    let current: EventTarget | null = null;
    const el = mount({
      type: "section",
      attributes: { onClickCapture: () => log.push("outer-jsx") },
      children: [
        {
          type: "div",
          attributes: { id: "mid" },
          children: [
            {
              type: "button",
              attributes: {
                id: "c",
                onClickCapture: (e: Event) => {
                  current = e.currentTarget;
                  log.push("inner-jsx");
                },
              },
              children: [],
            },
          ],
        },
      ],
    });
    el.querySelector("#mid")!.addEventListener("click", () => log.push("mid-native"), true);
    const button = el.querySelector("#c") as HTMLElement;

    button.click();

    expect(log).toEqual(["outer-jsx", "mid-native", "inner-jsx"]);
    expect(current).toBe(button);
  });

  it("a stopped event never fires the handler later", () => {
    let calls = 0;
    let stop = true;
    const el = mount({
      type: "div",
      attributes: { id: "p" },
      children: [
        { type: "button", attributes: { id: "c", onClickCapture: () => calls++ }, children: [] },
      ],
    });
    el.querySelector("#p")!.addEventListener(
      "click",
      (e) => {
        if (stop) e.stopPropagation();
      },
      true,
    );
    const button = el.querySelector("#c") as HTMLElement;

    button.click();
    button.click();
    button.click();
    stop = false;
    button.click();
    button.click();

    expect(calls).toBe(2);
  });

  it("a nested same-type dispatch does not drop the outer event's handlers", () => {
    const log: string[] = [];
    const el = mount({
      type: "div",
      attributes: {},
      children: [
        {
          type: "section",
          attributes: {
            onClickCapture: (e: Event) => {
              if ((e.target as Element).id === "c")
                (el.querySelector("#other") as HTMLElement).click();
            },
          },
          children: [
            { type: "button", attributes: { id: "c", onClickCapture: () => log.push("c") }, children: [] },
          ],
        },
        { type: "button", attributes: { id: "other", onClickCapture: () => log.push("other") }, children: [] },
      ],
    });

    (el.querySelector("#c") as HTMLElement).click();

    expect(log).toEqual(["other", "c"]);
  });

  it("fires once for an element inside an open shadow root", () => {
    const host = container();
    const shadow = host.attachShadow({ mode: "open" });
    let calls = 0;
    morph(host, [
      { type: "button", attributes: { id: "s", onClickCapture: () => calls++ }, children: [] },
    ]);

    (shadow.querySelector("#s") as HTMLElement).click();

    expect(calls).toBe(1);
  });

  it("onClick runs before an ancestor's native listener, which cannot silence it", () => {
    const log: string[] = [];
    const el = mount({
      type: "section",
      attributes: { onClick: () => log.push("outer-jsx") },
      children: [
        {
          type: "div",
          attributes: { id: "mid" },
          children: [
            { type: "button", attributes: { id: "c", onClick: () => log.push("inner-jsx") }, children: [] },
          ],
        },
      ],
    });
    el.querySelector("#mid")!.addEventListener("click", (e) => {
      log.push("mid-native");
      e.stopPropagation();
    });

    (el.querySelector("#c") as HTMLElement).click();

    expect(log).toEqual(["inner-jsx", "mid-native"]);
  });

  it("onClick sees the element as currentTarget", () => {
    let current: EventTarget | null = null;
    const el = mount({
      type: "button",
      attributes: { id: "c", onClick: (e: Event) => (current = e.currentTarget) },
      children: [],
    });
    const button = el.querySelector("#c") as HTMLElement;

    button.click();

    expect(current).toBe(button);
  });

  it("same element: registration order with native listeners, stopImmediatePropagation honoured", () => {
    const log: string[] = [];
    let halt = false;
    const el = mount({
      type: "button",
      attributes: {
        id: "c",
        onClick: (e: Event) => {
          log.push("jsx");
          if (halt) e.stopImmediatePropagation();
        },
      },
      children: [],
    });
    const button = el.querySelector("#c") as HTMLElement;
    button.addEventListener("click", () => log.push("native-later"));

    button.click();
    halt = true;
    button.click();

    expect(log).toEqual(["jsx", "native-later", "jsx"]);
  });

  it("a re-render swaps the handler without re-adding listeners", () => {
    const log: string[] = [];
    const el = mount({
      type: "button",
      attributes: { id: "c", onClick: () => log.push("v1") },
      children: [],
    });
    const button = el.querySelector("#c") as HTMLElement;
    button.addEventListener("click", () => log.push("native"));
    morph(el, [{ type: "button", attributes: { id: "c", onClick: () => log.push("v2") }, children: [] }]);

    button.click();

    // the slot keeps its original position ahead of the later native listener
    expect(log).toEqual(["v2", "native"]);
  });
});
