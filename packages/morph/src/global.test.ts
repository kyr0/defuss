import { describe, expect, it } from "vitest";
import { morph, updateDomWithVdom } from "./index.js";

/** the full runtime API surface that must land on df$ */
const EXPECTED_API_FUNCTIONS = [
  "morph",
  "updateDomWithVdom",
  "replaceDomWithVdom",
  "resolveGlobals",
  "htmlStringToVNodes",
  "domNodeToVNode",
  "parseDOM",
  "isSVG",
  "isHTML",
  "isMarkup",
  "renderMarkup",
  "getMimeType",
  "areDomNodesEqual",
  "getRenderer",
  "observeUnmount",
  "handleLifecycleEventsForOnMount",
  "registerDelegatedEvent",
  "removeDelegatedEvent",
  "removeDelegatedEventByKey",
  "clearDelegatedEvents",
  "clearDelegatedEventsDeep",
  "getRegisteredEventTypes",
  "getRegisteredEventKeys",
  "parseEventPropName",
  "queueCallback",
  "performTransition",
  "getTransitionStyles",
  "applyStyles",
] as const;

/**
 * Node-side coverage for the CDN entry modules (all.ts / global.ts).
 * The behavioral e2e (plain script load, pre-existing df$, min bundle)
 * lives in global.browser.test.ts.
 */
describe("df$ global registration (module side effect)",  () => {
  it("registers the full public API on df$ when the CDN entry is evaluated", async () => {
    delete (globalThis as any).df$;

    await import("./all.js"); // side effect: declares globalThis.df$

    const df = (globalThis as any).df$;
    expect(typeof df).toBe("object");

    for (const key of EXPECTED_API_FUNCTIONS) {
      expect(typeof df[key], `df$.${key}`).toBe("function");
    }

    // identity: the global references the same implementations as the ESM exports
    expect(df.morph).toBe(morph);
    expect(df.updateDomWithVdom).toBe(updateDomWithVdom);

    // constants and value exports are carried over too
    expect(df.nsMap.svg).toBe("http://www.w3.org/2000/svg");
    expect(df.DEFAULT_TRANSITION_CONFIG.type).toBe("fade");
    expect(df.CAPTURE_ONLY_EVENTS.has("focus")).toBe(true);
  });

  it("df$.updateDomWithVdom works standalone (globals derived from the element)", async () => {
    const df = (globalThis as any).df$;

    const el = document.createElement("div");
    document.body.appendChild(el);

    df.morph(el, `<input type="checkbox" checked>`);
    const input = el.querySelector("input") as HTMLInputElement;
    expect(input.checked).toBe(true);

    // explicit control via the VNode API — no third argument needed
    df.updateDomWithVdom(el, [
      { type: "input", attributes: { type: "checkbox", checked: false }, children: [] },
    ]);
    expect(input.checked).toBe(false);
    expect(el.querySelector("input")).toBe(input); // patched in place

    delete (globalThis as any).df$;
  });
});
