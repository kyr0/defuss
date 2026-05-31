import type { Store } from "../store/store.js";
import type { Ref } from "../render/types.js";
import { updateDomWithVdom } from "../common/dom.js";

/**
 * Configuration for reactive rendering.
 */
export interface ReactiveConfig {
  /** One or more stores to subscribe to. */
  store: Store<any> | Store<any>[];
  /** Render function that returns JSX to render into the target. */
  render: () => JSX.Element;
  /** Optional cleanup function called on unmount. */
  cleanup?: () => void;
}

/**
 * Core reactive utility - subscribes to store(s) and re-renders JSX on changes.
 * Returns a cleanup function to unsubscribe all stores and call optional cleanup.
 *
 * @example
 * ```ts
 * const store = createStore({ count: 0 });
 * const ref = createRef<HTMLDivElement>();
 *
 * // In onMount:
 * const cleanup = reactive({
 *   store,
 *   render: () => <div>Count: {store.value.count}</div>,
 *   cleanup: () => console.log("unmounted")
 * }, ref);
 *
 * // Later, to clean up:
 * cleanup();
 * ```
 */
export function reactive(
  config: ReactiveConfig,
  target: Ref<HTMLElement> | HTMLElement
): () => void {
  const stores = Array.isArray(config.store) ? config.store : [config.store];
  const ref: Ref<HTMLElement> =
    target instanceof HTMLElement
      ? ({ current: target } as Ref<HTMLElement>)
      : target;

  const update = () => {
    if (ref.current) {
      updateDomWithVdom(ref.current, config.render());
    }
  };

  // Initial render
  update();

  // Subscribe to all stores
  const unsubscribes = stores.map((s) => s.subscribe(update));

  // Return cleanup function
  return () => {
    unsubscribes.forEach((unsub) => unsub());
    config.cleanup?.();
  };
}
