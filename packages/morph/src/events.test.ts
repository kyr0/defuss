import { describe, expect, it, vi } from "vitest";
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
    const onClick = vi.fn();
    registerDelegatedEvent(el, "click", onClick);

    el.dispatchEvent(click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick.mock.contexts[0]).toBe(el);
  });

  it("forces capture-only events into the capture phase", () => {
    const el = attached(document.createElement("div"));
    const onFocus = vi.fn();
    registerDelegatedEvent(el, "focus", onFocus); // no capture flag

    expect(getRegisteredEventKeys(el).has("focus:capture")).toBe(true);
    expect(getRegisteredEventKeys(el).has("focus:bubble")).toBe(false);

    el.dispatchEvent(new Event("focus")); // does not bubble
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("works for elements registered while detached (listener pre-installed on the document)", () => {
    const el = document.createElement("button"); // never attached yet
    const onClick = vi.fn();
    registerDelegatedEvent(el, "click", onClick);

    attached(el);
    el.dispatchEvent(click());
    expect(onClick).toHaveBeenCalledTimes(1);
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
    const h1 = vi.fn();
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    el.dispatchEvent(click());
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("single (JSX) mode overwrites the previous handler", () => {
    const el = attached(document.createElement("button"));
    const first = vi.fn();
    const second = vi.fn();
    registerDelegatedEvent(el, "click", first);
    registerDelegatedEvent(el, "click", second);

    el.dispatchEvent(click());
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("de-duplicates re-dispatch of the same event object", () => {
    const el = attached(document.createElement("button"));
    const onClick = vi.fn();
    registerDelegatedEvent(el, "click", onClick);

    const ev = click();
    el.dispatchEvent(ev);
    el.dispatchEvent(ev); // same event object dispatched again
    expect(onClick).toHaveBeenCalledTimes(1);
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

    const onParent = vi.fn();
    registerDelegatedEvent(child, "click", (ev) => {
      ev.stopPropagation(); // sets cancelBubble internally
    });
    registerDelegatedEvent(parent, "click", onParent);

    child.dispatchEvent(click());
    expect(onParent).not.toHaveBeenCalled();
  });

  it("multi mode supports multiple capture handlers", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn();
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", h2, { multi: true, capture: true });

    expect(getRegisteredEventKeys(el).has("click:capture")).toBe(true);
    el.dispatchEvent(click());
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("stops capture multi-dispatch when a handler cancels bubbling", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn((ev: Event) => ev.stopPropagation());
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", h2, { multi: true, capture: true });

    el.dispatchEvent(click());
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();
  });

  it("stops bubble multi-dispatch when a handler cancels bubbling", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn((ev: Event) => ev.stopPropagation());
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    el.dispatchEvent(click());
    expect(h1).toHaveBeenCalledTimes(1);
    expect(h2).not.toHaveBeenCalled();
  });

  it("stops capture dispatch to descendants when cancelBubble is set", () => {
    const parent = attached(document.createElement("div"));
    const child = document.createElement("button");
    parent.appendChild(child);

    const onChild = vi.fn();
    registerDelegatedEvent(parent, "click", (ev) => ev.stopPropagation(), {
      capture: true,
    });
    registerDelegatedEvent(child, "click", onChild, { capture: true });

    child.dispatchEvent(click());
    expect(onChild).not.toHaveBeenCalled();
  });

  /**
   * Capture the bubble-phase root listener a registration installs, so the
   * handler can be invoked directly with a crafted event. Real DOM
   * implementations compute composedPath internally (happy-dom even requires
   * it), so the SSR parent-walk fallback can only be exercised by calling
   * the installed handler with a composedPath-less event object.
   * ensureRootListener installs capture first, then bubble — bubble is [1].
   */
  const captureBubbleRootListener = (eventType: string): EventListener => {
    const calls: unknown[][] = [];
    const original = document.addEventListener.bind(document);
    document.addEventListener = ((type: string, listener: any, ...rest: any[]) => {
      calls.push([type, listener]);
      original(type as any, listener, ...rest);
    }) as typeof document.addEventListener;
    try {
      const anchor = attached(document.createElement("div"));
      registerDelegatedEvent(anchor, eventType, vi.fn());
    } finally {
      document.addEventListener = original;
    }
    const installed = calls.filter(([type]) => type === eventType);
    if (installed.length < 2)
      throw new Error(`bubble root listener not installed for ${eventType}`);
    return installed[1][1] as EventListener;
  };

  const fakeEvent = (target: EventTarget, type: string): Event =>
    ({ type, target, cancelBubble: false }) as unknown as Event;

  it("walks parentNode when composedPath is unavailable (SSR fallback)", () => {
    // unique type: no dedup interference, listener freshly installed
    const bubbleListener = captureBubbleRootListener("x-fallback");

    const parent = attached(document.createElement("div"));
    const child = document.createElement("button");
    parent.appendChild(child);

    const onParent = vi.fn();
    registerDelegatedEvent(parent, "x-fallback", onParent);

    // no composedPath on the event -> getEventPath must walk up parentNode
    // and append document + window, reaching the parent entry
    bubbleListener(fakeEvent(child, "x-fallback"));
    expect(onParent).toHaveBeenCalledTimes(1);
  });

  it("falls back to the parent walk when composedPath returns an empty array", () => {
    // own type: per-root install dedup means each case needs a fresh event type
    const bubbleListener = captureBubbleRootListener("x-empty");

    const parent = attached(document.createElement("div"));
    const child = document.createElement("button");
    parent.appendChild(child);

    const onParent = vi.fn();
    registerDelegatedEvent(parent, "x-empty", onParent);

    const ev = fakeEvent(child, "x-empty");
    (ev as any).composedPath = () => [];
    bubbleListener(ev);
    expect(onParent).toHaveBeenCalledTimes(1);
  });

  it("stops the parent walk at a non-Node target without an ownerDocument", () => {
    const bubbleListener = captureBubbleRootListener("x-nonode");

    // exotic SSR target: plain object (no parentNode, no ownerDocument) —
    // the walk must stop without throwing and simply find no handler
    const exoticTarget = { not: "a node" } as unknown as EventTarget;
    expect(() => bubbleListener(fakeEvent(exoticTarget, "x-nonode"))).not.toThrow();
  });

  it("appends ownerDocument when the parent walk stops before it (detached target)", () => {
    const bubbleListener = captureBubbleRootListener("x-detached");

    const el = document.createElement("button"); // detached: walk ends at el
    const onClick = vi.fn();
    registerDelegatedEvent(el, "x-detached", onClick);

    // path = [el] -> document + window must be appended so document-level
    // delegation still reaches the detached element's entry
    bubbleListener(fakeEvent(el, "x-detached"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("binds directly on elements without an owner document", () => {
    // truly detached: no root node AND no ownerDocument -> direct binding
    const fake = {
      getRootNode: () => null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    const h = vi.fn();
    registerDelegatedEvent(fake, "click", h);
    expect(fake.addEventListener).toHaveBeenCalledWith("click", h, false);
  });

  it("installs delegation on a shadow root", () => {
    const host = attached(document.createElement("my-widget"));
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("button");
    shadow.appendChild(inner);

    const onClick = vi.fn();
    registerDelegatedEvent(inner, "click", onClick);

    // root resolution must have picked the ShadowRoot; the entry is usable
    expect(getRegisteredEventKeys(inner).has("click:bubble")).toBe(true);
  });
});

describe("removal and inspection", () => {
  it("removeDelegatedEvent removes a specific handler (multi mode)", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn();
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    removeDelegatedEvent(el, "click", h1);
    el.dispatchEvent(click());
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("removeDelegatedEvent without a handler removes all handlers for the type", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn();
    registerDelegatedEvent(el, "click", h1);
    registerDelegatedEvent(el, "click", h1, { capture: true });

    removeDelegatedEvent(el, "click");
    expect(getRegisteredEventKeys(el).size).toBe(0);

    el.dispatchEvent(click());
    expect(h1).not.toHaveBeenCalled();
  });

  it("removeDelegatedEvent removes a specific single (JSX) handler, both phases", () => {
    const el = attached(document.createElement("button"));
    const bubble = vi.fn();
    const capture = vi.fn();
    registerDelegatedEvent(el, "click", bubble);
    registerDelegatedEvent(el, "click", capture, { capture: true });

    removeDelegatedEvent(el, "click", bubble);
    expect(getRegisteredEventKeys(el)).toEqual(new Set(["click:capture"]));

    removeDelegatedEvent(el, "click", capture);
    expect(getRegisteredEventKeys(el).size).toBe(0);

    el.dispatchEvent(click());
    expect(bubble).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("removeDelegatedEvent removes a specific capture multi handler", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn();
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true, capture: true });
    registerDelegatedEvent(el, "click", h2, { multi: true, capture: true });

    removeDelegatedEvent(el, "click", h1);
    el.dispatchEvent(click());
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalledTimes(1);
  });

  it("removeDelegatedEvent empties the entry when the last multi handler goes", () => {
    const el = attached(document.createElement("button"));
    const h1 = vi.fn();
    const h2 = vi.fn();
    registerDelegatedEvent(el, "click", h1, { multi: true });
    registerDelegatedEvent(el, "click", h2, { multi: true });

    removeDelegatedEvent(el, "click", h1);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);

    removeDelegatedEvent(el, "click", h2);
    expect(getRegisteredEventTypes(el).size).toBe(0); // entry fully removed
  });

  it("removeDelegatedEventByKey removes only one phase", () => {
    const el = attached(document.createElement("button"));
    const bubble = vi.fn();
    const capture = vi.fn();
    registerDelegatedEvent(el, "click", bubble);
    registerDelegatedEvent(el, "click", capture, { capture: true });

    removeDelegatedEventByKey(el, "click", "capture");
    expect(getRegisteredEventKeys(el).has("click:capture")).toBe(false);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);

    el.dispatchEvent(click());
    expect(capture).not.toHaveBeenCalled();
    expect(bubble).toHaveBeenCalledTimes(1);

    // removing the remaining phase drops the entry entirely
    removeDelegatedEventByKey(el, "click", "bubble");
    expect(getRegisteredEventTypes(el).size).toBe(0);
  });

  it("removeDelegatedEventByKey keeps the entry when the other phase has handlers", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", vi.fn(), { multi: true, capture: true });
    registerDelegatedEvent(el, "click", vi.fn(), { multi: true });

    // unknown event type: safe no-op even though other types are registered
    removeDelegatedEventByKey(el, "mouseover", "bubble");

    removeDelegatedEventByKey(el, "click", "bubble");
    const keys = getRegisteredEventKeys(el);
    expect(keys.has("click:bubble")).toBe(false);
    expect(keys.has("click:capture")).toBe(true); // captureSet survives
  });

  it("clearDelegatedEvents removes every handler of an element", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", vi.fn());
    registerDelegatedEvent(el, "mouseover", vi.fn());

    clearDelegatedEvents(el);
    expect(getRegisteredEventTypes(el).size).toBe(0);
  });

  it("clearDelegatedEventsDeep clears an element and all descendants", () => {
    const root = attached(document.createElement("div"));
    const mid = document.createElement("section");
    const leaf = document.createElement("button");
    root.appendChild(mid);
    mid.appendChild(leaf);

    registerDelegatedEvent(root, "click", vi.fn());
    registerDelegatedEvent(mid, "click", vi.fn());
    registerDelegatedEvent(leaf, "click", vi.fn());

    clearDelegatedEventsDeep(root);
    expect(getRegisteredEventKeys(root).size).toBe(0);
    expect(getRegisteredEventKeys(mid).size).toBe(0);
    expect(getRegisteredEventKeys(leaf).size).toBe(0);
  });

  it("getRegisteredEventTypes and getRegisteredEventKeys reflect phases", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", vi.fn());
    registerDelegatedEvent(el, "focus", vi.fn(), { capture: true });

    expect([...getRegisteredEventTypes(el)].sort()).toEqual(["click", "focus"]);
    expect(getRegisteredEventKeys(el).has("click:bubble")).toBe(true);
    expect(getRegisteredEventKeys(el).has("focus:capture")).toBe(true);
  });

  it("removal on unknown elements is a safe no-op", () => {
    const el = document.createElement("button");
    expect(() => {
      removeDelegatedEvent(el, "click");
      removeDelegatedEvent(el, "click", vi.fn());
      removeDelegatedEventByKey(el, "click", "bubble");
      clearDelegatedEvents(el);
    }).not.toThrow();
    expect(getRegisteredEventTypes(el).size).toBe(0);
    expect(getRegisteredEventKeys(el).size).toBe(0);
  });

  it("removeDelegatedEvent on a registered element but unknown type is a no-op", () => {
    const el = attached(document.createElement("button"));
    registerDelegatedEvent(el, "click", vi.fn());

    // byEvent exists but has no "focus" entry
    removeDelegatedEvent(el, "focus");
    removeDelegatedEvent(el, "focus", vi.fn());
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as HTMLElement;

    registerDelegatedEvent(orphan, "click", vi.fn());
    expect(getRegisteredEventTypes(orphan)).toEqual(new Set(["click"]));
  });
});
