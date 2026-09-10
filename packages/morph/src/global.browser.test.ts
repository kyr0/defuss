import { beforeEach, describe, expect, it } from "vitest";

/**
 * E2E for the `df$` global registered by the CDN bundle (dist/all.js /
 * all.min.js) when loaded as a plain script — no ESM import statement.
 *
 * Each case fetches the real built artifact, wraps it in a fresh blob URL
 * (unique URL => the module is re-evaluated per case, no module-map caching)
 * and loads it via a real <script type="module"> element.
 */

const loadAsScript = async (path: string): Promise<void> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  const code = await res.text();
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.type = "module";
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`script load failed: ${path}`));
      document.head.appendChild(script);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
};

const importArtifact = async (path: string): Promise<Record<string, any>> => {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`fetch failed: ${path} (${res.status})`);
  const code = await res.text();
  const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const df = () => (window as any).df$;

beforeEach(() => {
  delete (window as any).df$;
});

describe("df$ global — CDN bundle (dist/all.js)", () => {
  it("registers window.df$.morph on plain script load, and it morphs", async () => {
    expect(df()).toBeUndefined();

    await loadAsScript("/dist/all.js");

    expect(typeof df()?.morph).toBe("function");

    const el = document.createElement("div");
    document.body.appendChild(el);
    df().morph(el, `<p>via df$</p>`);
    expect(el.innerHTML).toBe("<p>via df$</p>");
  });

  it("registers window.df$.morph from the minified bundle too", async () => {
    await loadAsScript("/dist/all.min.js");
    expect(typeof df()?.morph).toBe("function");

    const el = document.createElement("div");
    document.body.appendChild(el);
    df().morph(el, `<b>min</b>`);
    expect(el.innerHTML).toBe("<b>min</b>");
  });

  it("preserves a pre-existing df$ object (the API is assigned onto it)", async () => {
    (window as any).df$ = { marker: 123 };

    await loadAsScript("/dist/all.js");

    expect(df().marker).toBe(123);
    expect(typeof df().morph).toBe("function");
    expect(typeof df().updateDomWithVdom).toBe("function");
  });

  it("replaces a non-object df$ value with a fresh object", async () => {
    (window as any).df$ = 42;

    await loadAsScript("/dist/all.js");

    expect(typeof df()).toBe("object");
    expect(typeof df().morph).toBe("function");
  });

  it("df$.morph is the same function as the bundle's named ESM export", async () => {
    await loadAsScript("/dist/all.js");
    const mod = await importArtifact("/dist/all.js");

    expect(typeof mod.morph).toBe("function");
    expect(df().morph).toBe(mod.morph);
  });

  it("exposes the full public API on df$ (all.js)", async () => {
    await loadAsScript("/dist/all.js");

    const fns = [
      "morph",
      "updateDomWithVdom",
      "replaceDomWithVdom",
      "resolveGlobals",
      "htmlStringToVNodes",
      "domNodeToVNode",
      "getRenderer",
      "registerDelegatedEvent",
      "removeDelegatedEvent",
      "clearDelegatedEvents",
      "clearDelegatedEventsDeep",
      "getRegisteredEventKeys",
      "getRegisteredEventTypes",
      "parseEventPropName",
      "observeUnmount",
      "handleLifecycleEventsForOnMount",
      "performTransition",
      "getTransitionStyles",
      "applyStyles",
      "areDomNodesEqual",
      "isMarkup",
      "isHTML",
      "isSVG",
      "parseDOM",
      "renderMarkup",
      "getMimeType",
      "queueCallback",
    ];
    for (const key of fns) {
      expect(typeof df()[key], `df$.${key}`).toBe("function");
    }
    expect(df().nsMap.svg).toBe("http://www.w3.org/2000/svg");
    expect(df().DEFAULT_TRANSITION_CONFIG.type).toBe("fade");
  });

  it("exposes the API on df$ from the minified bundle (export names survive)", async () => {
    await loadAsScript("/dist/all.min.js");
    expect(typeof df().morph).toBe("function");
    expect(typeof df().updateDomWithVdom).toBe("function");
    expect(typeof df().registerDelegatedEvent).toBe("function");
  });

  it("df$.updateDomWithVdom gives explicit (controlled) form state — no globals arg needed", async () => {
    await loadAsScript("/dist/all.js");

    const el = document.createElement("div");
    document.body.appendChild(el);

    // an HTML morph cannot uncheck (absence = uncontrolled)…
    df().morph(el, `<input type="checkbox" checked>`);
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(true);

    // …but the VNode API can, explicitly
    df().updateDomWithVdom(el, [
      {
        type: "input",
        attributes: { type: "checkbox", checked: false },
        children: [],
      },
    ]);
    expect(input.checked).toBe(false);
    expect(el.querySelector("input")).toBe(input);
  });

  it("df$.registerDelegatedEvent handlers survive df$.morph patches", async () => {
    await loadAsScript("/dist/all.js");

    const el = document.createElement("div");
    el.innerHTML = `<button id="g">v1</button>`;
    document.body.appendChild(el);
    const btn = el.querySelector("#g") as HTMLButtonElement;

    let clicks = 0;
    df().registerDelegatedEvent(btn, "click", () => clicks++);

    df().morph(el, `<button id="g" class="hot">v2</button>`);

    expect(el.querySelector("#g")).toBe(btn);
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(clicks).toBe(1);
    expect(btn.textContent).toBe("v2");
  });
});

describe("df$ global — library entries stay SSR-safe", () => {
  it("dist/index.mjs does NOT register df$", async () => {
    await importArtifact("/dist/index.mjs");
    expect(df()).toBeUndefined();
  });
});
