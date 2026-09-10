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
      removeDelegatedEventByKey(el, "click", "bubble");
      clearDelegatedEvents(el);
    }).not.toThrow();
  });
});
