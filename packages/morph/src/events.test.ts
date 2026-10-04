import { describe, expect, it } from "vitest";
import {
  CAPTURE_ONLY_EVENTS,
  clearDelegatedEvents,
  clearDelegatedEventsDeep,
  getRegisteredEventKeys,
  getRegisteredEventTypes,
  parseEventPropName,
  registerDelegatedEvent,
  removeDelegatedEvent,
  removeDelegatedEventByKey,
} from "./index.js";

const attached = <T extends HTMLElement>(el: T): T => {
  document.body.appendChild(el);
  return el;
};

const click = () => new MouseEvent("click", { bubbles: true });

/** Real handler that records each call's arguments and `this`. */
const recorder = (impl?: (ev: Event) => void) => {
  const calls: unknown[][] = [];
  const contexts: unknown[] = [];
  const fn = function (this: unknown, ...args: unknown[]) {
    calls.push(args);
    contexts.push(this);
    impl?.(args[0] as Event);
  };
  return Object.assign(fn, { calls, contexts });
};

describe("parseEventPropName", () => {
  it("parses bubble and capture prop names", () => {
    expect(parseEventPropName("onClick")).toEqual({ eventType: "click", capture: false });
    expect(parseEventPropName("onClickCapture")).toEqual({ eventType: "click", capture: true });
    expect(parseEventPropName("onclick")).toEqual({ eventType: "click", capture: false });
    expect(parseEventPropName("onclickcapture")).toEqual({ eventType: "click", capture: true });
  });

  it("rejects non-event props", () => {
    expect(parseEventPropName("xclick")).toBeNull();
    expect(parseEventPropName("on")).toBeNull();
    expect(parseEventPropName("onCapture")).toBeNull(); // "capture" alone is not an event type
    expect(parseEventPropName("")).toBeNull();
  });
});

describe("CAPTURE_ONLY_EVENTS", () => {
  it("contains the non-bubbling events", () => {
    for (const type of ["focus", "blur", "scroll", "mouseenter", "mouseleave"]) {
      expect(CAPTURE_ONLY_EVENTS.has(type)).toBe(true);
    }
    expect(CAPTURE_ONLY_EVENTS.has("click")).toBe(false);
  });
});

describe("registerDelegatedEvent", () => {
  it("dispatches bubbling events with correct this binding", () => {
    const el = attached(document.createElement("button"));
    const onClick = recorder();
    registerDelegatedEvent(el, "click", onClick);

    el.dispatchEvent(click());
    expect(onClick.calls).toHaveLength(1);
    expect(onClick.contexts[0]).toBe(el);
  });

  it("forces capture-only events into the capture phase", () => {
    const el = attached(document.createElement("div"));
    const onFocus = recorder();
    registerDelegatedEvent(el, "focus", onFocus); // no capture flag

    expect(getRegisteredEventKeys(el).has("focus:capture")).toBe(true);
    expect(getRegisteredEventKeys(el).has("focus:bubble")).toBe(false);

    el.dispatchEvent(new Event("focus")); // does not bubble
    expect(onFocus.calls).toHaveLength(1);
  });

  it("works for elements registered while detached (listener pre-installed on the document)", () => {
    const el = document.createElement("button"); // never attached yet
    const onClick = recorder();
    registerDelegatedEvent(el, "click", onClick);

    attached(el);
    el.dispatchEvent(click());
    expect(onClick.calls).toHaveLength(1);
  });

  it("supports capture-phase handlers via options", () => {
    const parent = attached(document.createElement("div"));
    const child = document.createElement("span");
    parent.appendChild(child);

    const order: string[] = [];
    registerDelegatedEvent(parent, "click", () => order.push("bubble"));
    registerDelegatedEvent(parent, "click", () => order.push("capture"), { capture: true });

    child.dispatchEvent(click());
    expect(order).toEqual(["capture", "bubble"]);
  });

  it("multi mode allows multiple handlers per element+type", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    const h2 = recorder();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    el.dispatchEvent(click());
    expect(h1.calls).toHaveLength(1);
    expect(h2.calls).toHaveLength(1);
  });

  it("single (JSX) mode overwrites the previous handler", () => {
    const el = attached(document.createElement("button"));
    const first = recorder();
    const second = recorder();
    registerDelegatedEvent(el, "click", first);
    registerDelegatedEvent(el, "click", second);

    el.dispatchEvent(click());
    expect(first.calls).toHaveLength(0);
    expect(second.calls).toHaveLength(1);
  });

  it("re-dispatching a finished event object fires again (native semantics)", () => {
    const el = attached(document.createElement("button"));
    const onClick = recorder();
    registerDelegatedEvent(el, "click", onClick);

    const ev = click();
    el.dispatchEvent(ev);
    el.dispatchEvent(ev); // a completed event may be dispatched again
    expect(onClick.calls).toHaveLength(2);
  });

  it("suppresses re-entrant dispatch while the handler is running", () => {
    const el = attached(document.createElement("button"));
    let depth = 0;
    let calls = 0;

    const handler = () => {
      calls++;
      depth++;
      if (depth === 1) {
        // handler synchronously dispatches a *new* click on itself —
        // the guard must prevent infinite recursion
        el.dispatchEvent(click());
      }
      depth--;
    };
    registerDelegatedEvent(el, "click", handler);

    el.dispatchEvent(click());
    expect(calls).toBe(1);

    // after the stack unwinds, normal dispatch works again
    el.dispatchEvent(click());
    expect(calls).toBe(2);
  });

  it("stops dispatching to ancestors when a handler cancels bubbling", () => {
    const parent = attached(document.createElement("div"));
    const child = document.createElement("button");
    parent.appendChild(child);

    const onParent = recorder();
    registerDelegatedEvent(child, "click", (ev) => {
      ev.stopPropagation(); // sets cancelBubble internally
    });
    registerDelegatedEvent(parent, "click", onParent);

    child.dispatchEvent(click());
    expect(onParent.calls).toHaveLength(0);
  });

  it("multi mode supports multiple capture handlers", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    const h2 = recorder();
    registerDelegatedEvent(el, "click", h1, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", h2, { multi: true, capture: true });

    expect(getRegisteredEventKeys(el).has("click:capture")).toBe(true);
    el.dispatchEvent(click());
    expect(h1.calls).toHaveLength(1);
    expect(h2.calls).toHaveLength(1);
  });

  it("capture multi handlers: stopPropagation keeps siblings, stopImmediatePropagation stops them", () => {
    const el = attached(document.createElement("button"));
    const stop = recorder((ev) => ev.stopPropagation());
    const sibling = recorder();
    registerDelegatedEvent(el, "click", stop, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", sibling, { multi: true, capture: true });

    el.dispatchEvent(click());
    expect(stop.calls).toHaveLength(1);
    expect(sibling.calls).toHaveLength(1);

    const immediate = attached(document.createElement("button"));
    const halt = recorder((ev) => ev.stopImmediatePropagation());
    const skipped = recorder();
    registerDelegatedEvent(immediate, "click", halt, { multi: true, capture: true });
    registerDelegatedEvent(immediate, "click", skipped, { multi: true, capture: true });

    immediate.dispatchEvent(click());
    expect(halt.calls).toHaveLength(1);
    expect(skipped.calls).toHaveLength(0);
  });

  it("bubble multi handlers: stopPropagation keeps siblings, stopImmediatePropagation stops them", () => {
    const el = attached(document.createElement("button"));
    const stop = recorder((ev) => ev.stopPropagation());
    const sibling = recorder();
    registerDelegatedEvent(el, "click", stop, { multi: true });
    registerDelegatedEvent(el, "click", sibling, { multi: true });

    el.dispatchEvent(click());
    expect(stop.calls).toHaveLength(1);
    expect(sibling.calls).toHaveLength(1);

    const immediate = attached(document.createElement("button"));
    const halt = recorder((ev) => ev.stopImmediatePropagation());
    const skipped = recorder();
    registerDelegatedEvent(immediate, "click", halt, { multi: true });
    registerDelegatedEvent(immediate, "click", skipped, { multi: true });

    immediate.dispatchEvent(click());
    expect(halt.calls).toHaveLength(1);
    expect(skipped.calls).toHaveLength(0);
  });

  it("stops capture dispatch to descendants when cancelBubble is set", () => {
    const parent = attached(document.createElement("div"));
    const child = document.createElement("button");
    parent.appendChild(child);

    const onChild = recorder();
    registerDelegatedEvent(parent, "click", (ev) => ev.stopPropagation(), {
      capture: true,
    });
    registerDelegatedEvent(child, "click", onChild, { capture: true });

    child.dispatchEvent(click());
    expect(onChild.calls).toHaveLength(0);
  });

  it("listens on the element itself, even without an owner document", () => {
    const added = recorder();
    const fake = {
      getRootNode: () => null,
      addEventListener: added,
      removeEventListener: recorder(),
    } as unknown as HTMLElement;

    registerDelegatedEvent(fake, "click", recorder());
    expect(added.calls).toHaveLength(1);
    expect(added.calls[0][0]).toBe("click");
    expect(typeof added.calls[0][1]).toBe("function");
    expect(added.calls[0][2]).toBe(false);
  });

  it("installs delegation on a shadow root", () => {
    const host = attached(document.createElement("my-widget"));
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("button");
    shadow.appendChild(inner);

    const onClick = recorder();
    registerDelegatedEvent(inner, "click", onClick);

    // root resolution must have picked the ShadowRoot; the entry is usable
    expect(getRegisteredEventKeys(inner).has("click:bubble")).toBe(true);
  });
});

describe("removal and inspection", () => {
  it("removeDelegatedEvent removes a specific handler (multi mode)", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    const h2 = recorder();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    removeDelegatedEvent(el, "click", h1);
    el.dispatchEvent(click());
    expect(h1.calls).toHaveLength(0);
    expect(h2.calls).toHaveLength(1);
  });

  it("removeDelegatedEvent without a handler removes all handlers for the type", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    registerDelegatedEvent(el, "click", h1);
    registerDelegatedEvent(el, "click", h1, { capture: true });

    removeDelegatedEvent(el, "click");
    expect(getRegisteredEventKeys(el).size).toBe(0);

    el.dispatchEvent(click());
    expect(h1.calls).toHaveLength(0);
  });

  it("removeDelegatedEvent removes a specific single (JSX) handler, both phases", () => {
    const el = attached(document.createElement("button"));
    const bubble = recorder();
    const capture = recorder();
    registerDelegatedEvent(el, "click", bubble);
    registerDelegatedEvent(el, "click", capture, { capture: true });

    removeDelegatedEvent(el, "click", bubble);
    expect(getRegisteredEventKeys(el)).toEqual(new Set(["click:capture"]));

    removeDelegatedEvent(el, "click", capture);
    expect(getRegisteredEventKeys(el).size).toBe(0);

    el.dispatchEvent(click());
    expect(bubble.calls).toHaveLength(0);
    expect(capture.calls).toHaveLength(0);
  });

  it("removeDelegatedEvent removes a specific capture multi handler", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    const h2 = recorder();
    registerDelegatedEvent(el, "click", h1, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", h2, { multi: true, capture: true });

    removeDelegatedEvent(el, "click", h1);
    el.dispatchEvent(click());
    expect(h1.calls).toHaveLength(0);
    expect(h2.calls).toHaveLength(1);
  });

  it("removeDelegatedEvent empties the entry when the last multi handler goes", () => {
    const el = attached(document.createElement("button"));
    const h1 = recorder();
    const h2 = recorder();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    removeDelegatedEvent(el, "click", h1);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);

    removeDelegatedEvent(el, "click", h2);
    expect(getRegisteredEventTypes(el).size).toBe(0); // entry fully removed
  });

  it("removeDelegatedEventByKey removes only one phase", () => {
    const el = attached(document.createElement("button"));
    const bubble = recorder();
    const capture = recorder();
    registerDelegatedEvent(el, "click", bubble);
    registerDelegatedEvent(el, "click", capture, { capture: true });

    removeDelegatedEventByKey(el, "click", "capture");
    expect(getRegisteredEventKeys(el).has("click:capture")).toBe(false);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);

    el.dispatchEvent(click());
    expect(capture.calls).toHaveLength(0);
    expect(bubble.calls).toHaveLength(1);

    // removing the remaining phase drops the entry entirely
    removeDelegatedEventByKey(el, "click", "bubble");
    expect(getRegisteredEventTypes(el).size).toBe(0);
  });

  it("removeDelegatedEventByKey keeps the entry when the other phase has handlers", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", recorder(), { multi: true, capture: true });
    registerDelegatedEvent(el, "click", recorder(), { multi: true });

    // unknown event type: safe no-op even though other types are registered
    removeDelegatedEventByKey(el, "mouseover", "bubble");

    removeDelegatedEventByKey(el, "click", "bubble");
    const keys = getRegisteredEventKeys(el);
    expect(keys.has("click:bubble")).toBe(false);
    expect(keys.has("click:capture")).toBe(true); // captureSet survives
  });

  it("clearDelegatedEvents removes every handler of an element", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", recorder());
    registerDelegatedEvent(el, "mouseover", recorder());

    clearDelegatedEvents(el);
    expect(getRegisteredEventTypes(el).size).toBe(0);
  });

  it("clearDelegatedEventsDeep clears an element and all descendants", () => {
    const root = attached(document.createElement("div"));
    const mid = document.createElement("section");
    const leaf = document.createElement("button");
    root.appendChild(mid);
    mid.appendChild(leaf);

    registerDelegatedEvent(root, "click", recorder());
    registerDelegatedEvent(mid, "click", recorder());
    registerDelegatedEvent(leaf, "click", recorder());

    clearDelegatedEventsDeep(root);
    expect(getRegisteredEventKeys(root).size).toBe(0);
    expect(getRegisteredEventKeys(mid).size).toBe(0);
    expect(getRegisteredEventKeys(leaf).size).toBe(0);
  });

  it("getRegisteredEventTypes and getRegisteredEventKeys reflect phases", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", recorder());
    registerDelegatedEvent(el, "focus", recorder(), { capture: true });

    expect([...getRegisteredEventTypes(el)].sort()).toEqual(["click", "focus"]);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);
    expect(getRegisteredEventKeys(el).has("focus:capture")).toBe(true);
  });

  it("removal on unknown elements is a safe no-op", () => {
    const el = document.createElement("button");
    expect(() => {
      removeDelegatedEvent(el, "click");
      removeDelegatedEvent(el, "click", recorder());
      removeDelegatedEventByKey(el, "click", "bubble");
      clearDelegatedEvents(el);
    }).not.toThrow();
    expect(getRegisteredEventTypes(el).size).toBe(0);
    expect(getRegisteredEventKeys(el).size).toBe(0);
  });

  it("removeDelegatedEvent on a registered element but unknown type is a no-op", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", recorder());

    // byEvent exists but has no "focus" entry
    removeDelegatedEvent(el, "focus");
    removeDelegatedEvent(el, "focus", recorder());
    expect([...getRegisteredEventTypes(el)]).toEqual(["click"]);
  });

  it("clearDelegatedEventsDeep tolerates elements without an owner document", () => {
    // no-ownerDocument elements have nothing to walk — must not throw
    const orphan = { ownerDocument: undefined } as unknown as HTMLElement;
    expect(() => clearDelegatedEventsDeep(orphan)).not.toThrow();
  });

  it("pre-installs delegation on the ownerDocument for orphaned elements (no root node)", () => {
    // element reports no root node but has an ownerDocument -> document-level
    // delegation is installed so events work once it is attached
    const orphan = {
      getRootNode: () => null,
      ownerDocument: document,
      addEventListener: recorder(),
      removeEventListener: recorder(),
    } as unknown as HTMLElement;

    registerDelegatedEvent(orphan, "click", recorder());
    expect(getRegisteredEventTypes(orphan)).toEqual(new Set(["click"]));
  });
});
