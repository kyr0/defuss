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

/** non-bubbling events best handled via capture */
export const CAPTURE_ONLY_EVENTS = new Set<string>([
    "focus",
    "blur",
    "scroll",
    "mouseenter",
    "mouseleave",
    // Note: focusin/focusout DO bubble, so they're not included here
]);

interface HandlerEntry {
    bubble?: EventListener;
    capture?: EventListener;
    bubbleSet?: Set<EventListener>;
    captureSet?: Set<EventListener>;
}

/** element -> (eventType -> handlers) */
const elementHandlerMap = new WeakMap<
    HTMLElement,
    Map<string, HandlerEntry>
>();

/** document -> installed listener keys ("click:bubble", "focus:capture", ...) */
const installedDocListeners = new WeakMap<Document, Set<string>>();

export const parseEventPropName = (propName: string): ParsedEventProp | null => {
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

const getOrCreateElementHandlers = (el: HTMLElement) => {
    const existing = elementHandlerMap.get(el);
    if (existing) return existing;

    const created = new Map<string, HandlerEntry>();
    elementHandlerMap.set(el, created);
    return created;
};

const getEventPath = (event: Event): Array<EventTarget> => {
    // composedPath is best (works with shadow DOM)
    const composedPath = (event as Event & { composedPath?: () => Array<EventTarget> })
        .composedPath?.();
    if (composedPath && composedPath.length > 0) return composedPath;

    // fallback: walk up from target
    const path: Array<EventTarget> = [];
    let node: unknown = event.target;

    while (node) {
        path.push(node as EventTarget);

        // walk DOM parents
        const maybeNode = node as Node;
        if (typeof maybeNode === "object" && maybeNode && "parentNode" in maybeNode) {
            node = (maybeNode as Node).parentNode;
            continue;
        }

        break;
    }

    // ensure document/window are at the end if available
    const doc = (event.target as Node | null)?.ownerDocument;
    if (doc && path[path.length - 1] !== doc) path.push(doc);
    const win = doc?.defaultView;
    if (win && path[path.length - 1] !== win) path.push(win);

    return path;
};

/**
 * Create the dispatch handler for a given phase.
 * Each phase runs its own handlers - capture phase runs capture handlers,
 * bubble phase runs bubble handlers. This supports onClickCapture semantics.
 */
const createPhaseHandler = (eventType: string, phase: DelegatedPhase): EventListener => {
    return (event: Event) => {
        const path = getEventPath(event).filter(
            (t): t is HTMLElement => typeof t === "object" && t !== null && (t as HTMLElement).nodeType === Node.ELEMENT_NODE,
        );

        // Capture phase: root -> target (reversed path)
        // Bubble phase: target -> root (normal path)
        const ordered = phase === "capture" ? [...path].reverse() : path;

        for (const target of ordered) {
            const handlersByEvent = elementHandlerMap.get(target);
            if (!handlersByEvent) continue;

            const entry = handlersByEvent.get(eventType);
            if (!entry) continue;

            // Execute only the handlers for this phase
            if (phase === "capture") {
                // Single handler (JSX mode)
                if (entry.capture) {
                    entry.capture.call(target, event);
                    if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                }
                // Handler set (Dequery multi mode)
                if (entry.captureSet) {
                    for (const handler of entry.captureSet) {
                        handler.call(target, event);
                        if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                    }
                }
            } else {
                // Bubble phase
                if (entry.bubble) {
                    entry.bubble.call(target, event);
                    if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                }
                if (entry.bubbleSet) {
                    for (const handler of entry.bubbleSet) {
                        handler.call(target, event);
                        if ((event as Event & { cancelBubble?: boolean }).cancelBubble) return;
                    }
                }
            }
        }
    };
};

/** 
 * Track installed listeners per root (Document or ShadowRoot).
 * Using WeakMap allows GC when shadow roots are removed.
 */
type EventRoot = Document | ShadowRoot;
const installedRootListeners = new WeakMap<EventRoot, Set<string>>();

/**
 * Ensure delegation listeners are installed on the correct root.
 * Installs BOTH capture and bubble listeners, but each only dispatches for appropriate events.
 */
const ensureRootListener = (root: EventRoot, eventType: string) => {
    const installed = installedRootListeners.get(root) ?? new Set<string>();
    installedRootListeners.set(root, installed);

    // Install capture phase listener
    const captureKey = `${eventType}:capture`;
    if (!installed.has(captureKey)) {
        root.addEventListener(eventType, createPhaseHandler(eventType, "capture"), true);
        installed.add(captureKey);
    }

    // Install bubble phase listener
    const bubbleKey = `${eventType}:bubble`;
    if (!installed.has(bubbleKey)) {
        root.addEventListener(eventType, createPhaseHandler(eventType, "bubble"), false);
        installed.add(bubbleKey);
    }
};

/**
 * Get the root node where delegation listeners should be installed.
 * Handles Document, ShadowRoot, and detached elements.
 */
const getEventRoot = (element: HTMLElement): EventRoot | null => {
    const root = element.getRootNode();

    // Document or ShadowRoot - use as delegation target
    if (root instanceof Document || root instanceof ShadowRoot) {
        return root;
    }

    // Detached element - root is the element itself, no delegation possible
    return null;
};


export const registerDelegatedEvent = (
    element: HTMLElement,
    eventType: string,
    handler: EventListener,
    options: DelegatedEventOptions = {},
): void => {
    // Get the correct root for delegation (Document or ShadowRoot)
    const root = getEventRoot(element);

    // capture-only events should be forced to capture
    const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);

    if (root) {
        // Element is in DOM - use delegation
        ensureRootListener(root, eventType);
    } else if (element.ownerDocument) {
        // Element has a document but isn't connected yet - install listener on document
        // Events will work once the element is attached
        ensureRootListener(element.ownerDocument, eventType);
    } else {
        // Truly detached element (no document) - use direct binding
        // This ensures events work even for elements never attached to DOM
        element.addEventListener(eventType, handler, capture);
    }

    const byEvent = getOrCreateElementHandlers(element);
    const entry = byEvent.get(eventType) ?? {};
    byEvent.set(eventType, entry);

    if (options.multi) {
        // Dequery mode: add to set (allows multiple handlers)
        if (capture) {
            if (!entry.captureSet) entry.captureSet = new Set();
            entry.captureSet.add(handler);
        } else {
            if (!entry.bubbleSet) entry.bubbleSet = new Set();
            entry.bubbleSet.add(handler);
        }
    } else {
        // JSX mode: one handler per prop, overwrite to prevent duplicates
        if (capture) {
            entry.capture = handler;
        } else {
            entry.bubble = handler;
        }
    }
};

export const removeDelegatedEvent = (
    element: HTMLElement,
    eventType: string,
    handler?: EventListener,
    options: DelegatedEventOptions = {},
): void => {
    const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return;

    const entry = byEvent.get(eventType);
    if (!entry) return;

    if (handler) {
        // Remove specific handler from both phases (since we don't know which phase it was added to)
        if (entry.captureSet) {
            entry.captureSet.delete(handler);
        }
        if (entry.bubbleSet) {
            entry.bubbleSet.delete(handler);
        }
        // Also check if it matches single handler
        if (entry.capture === handler) {
            entry.capture = undefined;
        }
        if (entry.bubble === handler) {
            entry.bubble = undefined;
        }

        // Always call removeEventListener for safety (handles detached element direct-binding case)
        element.removeEventListener(eventType, handler, true);  // capture
        element.removeEventListener(eventType, handler, false); // bubble
    } else {
        // Remove ALL handlers for this event type (both phases)
        // This is what users expect from .off("click") without specific handler
        entry.capture = undefined;
        entry.bubble = undefined;
        entry.captureSet = undefined;
        entry.bubbleSet = undefined;
    }

    // Clean up entry if empty
    const isEmpty = !entry.capture && !entry.bubble &&
        (!entry.captureSet || entry.captureSet.size === 0) &&
        (!entry.bubbleSet || entry.bubbleSet.size === 0);
    if (isEmpty) {
        byEvent.delete(eventType);
    }
};

export const clearDelegatedEvents = (element: HTMLElement): void => {
    const byEvent = elementHandlerMap.get(element);
    if (!byEvent) return;

    byEvent.clear();
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
    const doc = root.ownerDocument ?? document;
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
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
