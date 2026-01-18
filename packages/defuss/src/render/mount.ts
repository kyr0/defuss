import { renderIsomorphicSync } from "./isomorph.js";
import { registerComponent, unregisterComponent } from "./component-registry.js";
import { observeUnmount } from "./isomorph.js";
import type { VNode, Globals } from "./types.js";

/**
 * Mount a component to a container, registering it for implicit updates.
 * 
 * After mounting, `$(container).update({ ...props })` will re-render the component
 * with merged props, enabling the FluxDOM implicit update contract.
 * 
 * @param container - The mount boundary element (stable root for updates)
 * @param Component - The component function (props) => VNode
 * @param initialProps - Initial props to render with
 * @returns The container element (for chaining)
 * 
 * @example
 * ```tsx
 * const Counter = ({ count }) => <div>{count}</div>;
 * const root = mount(document.getElementById("app"), Counter, { count: 0 });
 * 
 * // Later: implicit update via props merge
 * $(root).update({ count: 5 });
 * ```
 */
export function mount<P extends Record<string, unknown>>(
    container: Element,
    Component: (props: P) => VNode,
    initialProps: P,
): Element {
    // Initial render into container
    const vnode = Component(initialProps);
    renderIsomorphicSync(vnode, container as HTMLElement, globalThis as Globals);

    // Register on the container boundary (stable root)
    registerComponent(
        container,
        Component as (props: Record<string, unknown>) => VNode,
        { ...initialProps } as Record<string, unknown>,
    );

    // Observe unmount to clean up registry
    if (container.parentNode) {
        observeUnmount(container, () => unregisterComponent(container));
    }

    return container;
}

/**
 * Unmount a component and clean up its registry entry.
 */
export function unmount(container: Element): void {
    unregisterComponent(container);
    // Clear children
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}
