import type { ElementProps, FC, Ref, VNode } from "../render/types.js";
import { createRef } from "../render/ref.js";
import { reactive, type ReactiveConfig } from "./reactive.js";

/**
 * Props for the Reactive component.
 */
export interface ReactiveProps extends ElementProps<HTMLDivElement> {
  /** One or more stores to subscribe to. */
  store: ReactiveConfig["store"];
  /** Render function that returns JSX to render into the component. */
  render: ReactiveConfig["render"];
  /** Optional cleanup function called on unmount. */
  cleanup?: ReactiveConfig["cleanup"];
  /** Wrapper element tag name. Default: "div". */
  tag?: string;
}

/**
 * A component that automatically re-renders when its store(s) change.
 * Handles subscription setup on mount and cleanup on unmount.
 *
 * @example
 * ```tsx
 * import { Reactive, createStore } from "defuss";
 *
 * const store = createStore({ count: 0 });
 *
 * <Reactive store={store} render={() => (
 *   <div>
 *     <p>Count: {store.value.count}</p>
 *     <button onClick={() => store.set({ count: store.value.count + 1 })}>
 *       Increment
 *     </button>
 *   </div>
 * )}/>
 * ```
 */
export const Reactive: FC<ReactiveProps> = ({
  store,
  render,
  cleanup,
  tag = "div",
  className,
  ref: externalRef,
  ...props
}) => {
  // Use external ref if provided, otherwise create one internally
  const reactiveRef = (externalRef ?? createRef()) as Ref<HTMLDivElement>;
  let cleanupFn: (() => void) | undefined;
  let isUnmounted = false;

  // Build attributes with lifecycle hooks
  const attrs: Record<string, any> = {
    ref: reactiveRef,
  };

  if (className) {
    attrs.class = className;
  }

  // Spread additional props
  Object.assign(attrs, props);

  // Lifecycle hooks
  attrs.onMount = () => {
    cleanupFn = reactive({ store, render, cleanup }, reactiveRef);
  };
  attrs.onUnmount = () => {
    // Guard against double-fire of onUnmount
    if (isUnmounted) return;
    isUnmounted = true;
    cleanupFn?.();
  };

  // Return a VNode directly to ensure dynamic tag names are properly handled
  // as element types rather than being treated as function components
  return {
    type: tag,
    attributes: attrs,
    children: [],
  } as VNode;
};
