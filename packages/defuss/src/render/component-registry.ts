import type { VNode } from "./types.js";

/**
 * Component instance metadata for implicit updates.
 * Stored on the mount boundary (container) element.
 */
export interface ComponentInstance {
    renderFn: (props: Record<string, unknown>) => VNode;
    props: Record<string, unknown>;
    prevVNode?: VNode;
}

/** Element → Component Instance registry (WeakMap for GC safety) */
const componentRegistry = new WeakMap<Element, ComponentInstance>();

/** Check if an element is a managed component root */
export function isComponentRoot(el: Element): boolean {
    return componentRegistry.has(el);
}

/** Get component instance for an element */
export function getComponentInstance(el: Element): ComponentInstance | undefined {
    return componentRegistry.get(el);
}

/** Register a component instance on an element */
export function registerComponent(
    el: Element,
    renderFn: (props: Record<string, unknown>) => VNode,
    props: Record<string, unknown>,
): void {
    componentRegistry.set(el, { renderFn, props });
}

/** Unregister a component (called on unmount) */
export function unregisterComponent(el: Element): void {
    componentRegistry.delete(el);
}
