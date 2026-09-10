import { resolveGlobals, updateDomWithVdom } from "./morph.js";
import { htmlStringToVNodes } from "./html.js";
import type { RenderInput } from "./types.js";
import {
  DEFAULT_TRANSITION_CONFIG,
  performTransition,
  type TransitionConfig,
} from "./transitions.js";

export * from "./types.js";
export * from "./queue.js";
export * from "./delegated-events.js";
export * from "./renderer.js";
export * from "./morph.js";
export * from "./html.js";
export * from "./transitions.js";

export interface MorphOptions {
  /**
   * Optional transition to apply around the morph.
   * When set (and `type !== "none"`), `morph()` returns a `Promise`
   * that resolves once the transition completed.
   */
  transition?: TransitionConfig;
}

/**
 * Morphs the children of `el` to match the given HTML string or JSX/VNode input.
 *
 * A string is parsed into a DOM tree via the native `DOMParser`
 * of the element's own document (isomorphic: browser, happy-dom, ...);
 * any other `RenderInput` (JSX, VNodes, arrays, text) is used directly.
 * Both paths then morph into the existing DOM using the defuss morph algorithm:
 *
 * - key/id-aware node matching (`key` and `id` attributes)
 * - move-not-replace semantics (preserves node identity, focus, selection
 *   and event listeners)
 * - in-place attribute patching for same-tag elements
 * - uncontrolled form-state preservation (live input values survive
 *   unless the new HTML explicitly controls them)
 * - shadow DOM / custom element (light DOM) aware
 * - re-entrant morphs on the same or an ancestor element are queued
 *   latest-wins and replayed after the active morph finishes
 * - overlapping transitions are latest-wins too: a morph issued while a
 *   transition is in flight replaces the content that transition will apply
 *
 * Plain text input morphs as a text node.
 *
 * Unlike an HTML string, a VNode/JSX input can express explicit state
 * (`checked: false`, `value: ""`) and carry event handlers.
 *
 * @example
 * ```ts
 * import { morph } from "defuss-morph";
 *
 * morph(document.getElementById("app")!, "<ul><li key='a'>Hello</li></ul>");
 *
 * // JSX / VNodes work too (same API, same algorithm):
 * morph(document.getElementById("app")!, <p>Hi</p>);
 *
 * // with a transition (async):
 * await morph(document.getElementById("app")!, "<p>Hi</p>", {
 *   transition: { type: "fade", duration: 200 },
 * });
 * ```
 */

/**
 * In-flight transition content slots. Non-fade transitions apply their morph
 * only after the exit phase (`await wait(duration)` inside performTransition),
 * so a morph issued during that window would be overwritten by stale content.
 * The slot makes such overlaps latest-wins: the deferred update applies
 * whatever content was requested last for the element.
 */
const inflightTransitions = new WeakMap<Element, { content: RenderInput }>();

export const morph = (
  el: Element,
  newContent: RenderInput,
  options: MorphOptions = {},
): void | Promise<void> => {
  const globals = resolveGlobals(el);
  const win = globals.window;

  // strings go through the HTML parser; JSX/VNodes are used as-is
  const apply = (content: RenderInput) =>
    updateDomWithVdom(
      el,
      typeof content === "string" ? htmlStringToVNodes(content, win.DOMParser) : content,
      globals,
    );

  const transition = options.transition;
  if (transition && transition.type !== "none") {
    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transition };
    const transitionTarget =
      config.target === "self" ? (el as HTMLElement) : el.parentElement;

    // no transition target (detached root) -> morph directly
    if (!transitionTarget) {
      apply(newContent);
      return;
    }

    // register the content slot for this element (replaces any previous one)
    const slot = { content: newContent };
    inflightTransitions.set(el, slot);

    return performTransition(
      transitionTarget,
      // apply the latest requested content — but only if this transition
      // still owns the slot; when a newer transition has taken it over (or
      // already completed and cleaned it up), this deferred update is stale
      // and must not clobber the newer content
      async () => {
        if (inflightTransitions.get(el) === slot) apply(slot.content);
      },
      config,
    ).finally(() => {
      // clean up only if no newer transition took over the slot
      if (inflightTransitions.get(el) === slot) inflightTransitions.delete(el);
    });
  }

  // plain morph: apply immediately, and if a transition is in flight for this
  // element, rewrite its slot so the deferred update re-applies this (latest)
  // content instead of the transition's stale content
  const slot = inflightTransitions.get(el);
  if (slot) slot.content = newContent;

  apply(newContent);
};
