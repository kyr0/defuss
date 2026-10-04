export type DelegatedPhase = "bubble" | "capture";

export interface DelegatedEventOptions {
  capture?: boolean;
  /** If true, allows multiple handlers per element+type (Dequery mode) */
  multi?: boolean;
}

export interface ParsedEventProp {
  eventType: string;
  capture: boolean;
}

/**
 * Events whose handlers are forced into the capture phase, so an ancestor's
 * handler also sees descendants' events (container onFocus/onBlur). Every
 * other non-bubbling event reaches only its target's handlers, natively.
 */
export const CAPTURE_ONLY_EVENTS = new Set<string>([
  "focus",
  "blur",
  "scroll",
  "mouseenter",
  "mouseleave",
  // Note: focusin/focusout DO bubble, so they're not included here
]);

/**
 * Why per-element native listeners instead of one delegating root listener:
 * replaying the event path from the document ran handlers in the wrong order
 * relative to native listeners, ignored an ancestor's stopPropagation(), missed
 * non-bubbling events and reported currentTarget === document. On the element
 * itself the browser applies every propagation rule exactly.
 * VERIFIED: order, stopPropagation (both phases), stopImmediatePropagation,
 * currentTarget, non-bubbling and shadow DOM (delegated-events.browser.test.ts).
 *
 * What stays "delegated" is the indirection: a JSX prop slot owns one
 * trampoline listener that calls whichever handler the slot holds right now,
 * so re-renders swap handlers without touching listeners. Multi-mode handlers
 * (dequery-style on()) are attached as-is.
 */
interface HandlerEntry {
  bubble?: EventListener;
  capture?: EventListener;
  bubbleSet?: Set<EventListener>;
  captureSet?: Set<EventListener>;
}

/** element -> (eventType -> handlers) */
const elementHandlerMap = new WeakMap<EventTarget, Map<string, HandlerEntry>>();

/** element -> (`${eventType}:${phase}` -> installed slot trampoline) */
const slotListeners = new WeakMap<EventTarget, Map<string, EventListener>>();

/**
 * Re-entrancy guard for JSX slots: while a slot's handler runs, a *new* event
 * of the same type that morph fires synchronously on the same element (e.g.
 * focus/blur while moving nodes) does not re-enter it.
 */
const activeDispatches = new WeakMap<EventTarget, Set<string>>();

export const parseEventPropName = (
  propName: string,
): ParsedEventProp | null => {
  if (!propName.startsWith("on")) return null;

  // support onClick / onClickCapture / onclick / onclickcapture
  const raw = propName.slice(2);
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const isCapture = lower.endsWith("capture");

  const eventType = isCapture ? lower.slice(0, -"capture".length) : lower;

  if (!eventType) return null;

  return { eventType, capture: isCapture };
};

const getOrCreateElementHandlers = (el: EventTarget) => {
  const existing = elementHandlerMap.get(el);
  if (existing) return existing;

  const created = new Map<string, HandlerEntry>();
  elementHandlerMap.set(el, created);
  return created;
};

/** Run the handler a JSX slot holds right now (looked up per event). */
const runSlot = (
  target: EventTarget,
  eventType: string,
  phase: DelegatedPhase,
  event: Event,
): void => {
  const handler = elementHandlerMap.get(target)?.get(eventType)?.[phase];
  if (!handler) return;

  const dispatchKey = `${eventType}:${phase}`;
  let active = activeDispatches.get(target);
  if (active?.has(dispatchKey)) return;
  if (!active) {
    active = new Set();
    activeDispatches.set(target, active);
  }
  active.add(dispatchKey);
  try {
    handler.call(target, event);
  } finally {
    active.delete(dispatchKey);
  }
};

/** Set (or clear) a JSX slot, installing/removing its trampoline listener. */
const setSlot = (
  target: EventTarget,
  eventType: string,
  phase: DelegatedPhase,
  entry: HandlerEntry,
  handler: EventListener | undefined,
): void => {
  entry[phase] = handler;
  const key = `${eventType}:${phase}`;
  const capture = phase === "capture";
  let byKey = slotListeners.get(target);
  const installed = byKey?.get(key);

  if (handler && !installed) {
    if (!byKey) {
      byKey = new Map();
      slotListeners.set(target, byKey);
    }
    const trampoline: EventListener = (event) =>
      runSlot(target, eventType, phase, event);
    byKey.set(key, trampoline);
    target.addEventListener(eventType, trampoline, capture);
  } else if (!handler && installed) {
    byKey!.delete(key);
    target.removeEventListener(eventType, installed, capture);
  }
};

/** Detach every handler of one phase (slot and set) for a type. */
const clearPhase = (
  target: EventTarget,
  eventType: string,
  entry: HandlerEntry,
  phase: DelegatedPhase,
): void => {
  setSlot(target, eventType, phase, entry, undefined);
  const setKey = phase === "capture" ? "captureSet" : "bubbleSet";
  for (const handler of entry[setKey] ?? [])
    target.removeEventListener(eventType, handler, phase === "capture");
  entry[setKey] = undefined;
};

export const registerDelegatedEvent = (
  element: HTMLElement,
  eventType: string,
  handler: EventListener,
  options: DelegatedEventOptions = {},
): void => {
  // capture-only events should be forced to capture
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
  const phase: DelegatedPhase = capture ? "capture" : "bubble";

  const byEvent = getOrCreateElementHandlers(element);
  const entry = byEvent.get(eventType) ?? {};
  byEvent.set(eventType, entry);

  if (options.multi) {
    // Dequery mode: every handler is its own native listener (the set mirrors
    // addEventListener's dedupe of an identical type/handler/capture triple)
    const setKey = capture ? "captureSet" : "bubbleSet";
    const set = (entry[setKey] ??= new Set());
    if (!set.has(handler)) {
      set.add(handler);
      element.addEventListener(eventType, handler, capture);
    }
  } else {
    // JSX mode: one handler per prop, overwrite to prevent duplicates
    setSlot(element, eventType, phase, entry, handler);
  }
};

/** true when a handler entry holds no single handler and no non-empty set */
const isEntryEmpty = (entry: HandlerEntry): boolean =>
  !entry.capture &&
  !entry.bubble &&
  (!entry.captureSet || entry.captureSet.size === 0) &&
  (!entry.bubbleSet || entry.bubbleSet.size === 0);

export const removeDelegatedEvent = (
  target: EventTarget,
  eventType: string,
  handler?: EventListener,
  // part of the public signature; removal always covers both phases,
  // so the options are intentionally not consulted here
  _options: DelegatedEventOptions = {},
): void => {
  const byEvent = elementHandlerMap.get(target);
  if (!byEvent) return;

  const entry = byEvent.get(eventType);
  if (!entry) return;

  if (handler) {
    // Remove the specific handler from both phases (the caller may not know which)
    for (const phase of ["capture", "bubble"] as const) {
      const set = phase === "capture" ? entry.captureSet : entry.bubbleSet;
      if (set?.delete(handler))
        target.removeEventListener(eventType, handler, phase === "capture");
      if (entry[phase] === handler)
        setSlot(target, eventType, phase, entry, undefined);
    }
  } else {
    // Remove ALL handlers for this event type (both phases)
    // This is what users expect from .off("click") without specific handler
    clearPhase(target, eventType, entry, "capture");
    clearPhase(target, eventType, entry, "bubble");
  }

  // Clean up entry if empty
  if (isEntryEmpty(entry)) {
    byEvent.delete(eventType);
  }
};

/** Teardown hooks of listener owners outside this registry. */
const clearHooks = new Set<(target: EventTarget) => void>();

/**
 * Why: listeners a facade attaches natively (defuss-query's on()) live
 * outside this registry, yet must go whenever morph clears an element
 * (removal, replacement, clearDelegatedEventsDeep). A hook keeps morph
 * ignorant of who owns them, instead of morph also tracking native listeners.
 * Registering the same hook twice is a no-op; returns an unregister function.
 */
export const onClearDelegatedEvents = (
  hook: (target: EventTarget) => void,
): (() => void) => {
  clearHooks.add(hook);
  return () => {
    clearHooks.delete(hook);
  };
};

export const clearDelegatedEvents = (target: EventTarget): void => {
  const byEvent = elementHandlerMap.get(target);
  if (byEvent) {
    for (const [eventType, entry] of byEvent) {
      clearPhase(target, eventType, entry, "capture");
      clearPhase(target, eventType, entry, "bubble");
    }
    byEvent.clear();
  }
  for (const hook of clearHooks) hook(target);
};

/**
 * Clear delegated events for an element and all its descendants.
 * Used by empty() to prevent event handler leaks when removing subtrees.
 */
export const clearDelegatedEventsDeep = (root: HTMLElement): void => {
  // Clear the root element
  clearDelegatedEvents(root);

  // Walk all descendant elements and clear their handlers
  // Use ownerDocument for SSR/multi-doc compatibility
  const doc = root.ownerDocument;
  if (!doc) return;
  const walker = doc.createTreeWalker(root, 1 /* NodeFilter.SHOW_ELEMENT */);
  let node = walker.nextNode();
  while (node) {
    clearDelegatedEvents(node as HTMLElement);
    node = walker.nextNode();
  }
};

/**
 * Get all event types currently registered on an element.
 * Used to detect which events need to be removed when vnode props change.
 */
export const getRegisteredEventTypes = (element: HTMLElement): Set<string> => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return new Set();
  return new Set(byEvent.keys());
};

/**
 * Get all event keys with phases currently registered on an element.
 * Returns keys like "click:bubble", "click:capture" for precise phase-aware removal.
 */
export const getRegisteredEventKeys = (element: HTMLElement): Set<string> => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return new Set();

  const keys = new Set<string>();
  for (const [eventType, entry] of byEvent) {
    if (entry.bubble || entry.bubbleSet?.size) keys.add(`${eventType}:bubble`);
    if (entry.capture || entry.captureSet?.size)
      keys.add(`${eventType}:capture`);
  }
  return keys;
};

/**
 * Remove delegated event handler for a specific phase only.
 * Used by patchElementInPlace to precisely remove stale handlers when vnode changes from
 * onClick + onClickCapture → onClickCapture only.
 */
export const removeDelegatedEventByKey = (
  element: HTMLElement,
  eventType: string,
  phase: "bubble" | "capture",
): void => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent) return;

  const entry = byEvent.get(eventType);
  if (!entry) return;

  clearPhase(element, eventType, entry, phase);

  // Clean up entry if empty
  if (isEntryEmpty(entry)) byEvent.delete(eventType);
};
