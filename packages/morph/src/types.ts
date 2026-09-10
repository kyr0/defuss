/**
 * Lean structural types for the defuss morph engine.
 *
 * These are intentionally minimal (no JSX namespace, no store/ref machinery).
 * defuss's richer types are structurally assignable to these.
 */

export type Globals = Performance & Window & typeof globalThis;

export type DefussKey = string | number;

export type MountHandler<T extends Element = Element> = (element: T) => void;
export type UnmountHandler<T extends Element = Element> = (element: T) => void;

/**
 * Minimal ref shape: the morph engine only ever assigns `current`.
 * defuss's full `Ref` interface is structurally assignable to this.
 */
export interface RefLike {
  current?: any;
  orphan?: boolean;
}

export interface VNodeAttributes {
  // detect ref
  ref?: RefLike;

  // array-local unique key to identify element items in a NodeList
  key?: DefussKey;

  // defuss custom element lifecycle events
  onMount?: MountHandler<any>;
  onUnmount?: UnmountHandler<any>;

  [attributeName: string]: any;
}

// string as in "div" creates an HTMLElement in the renderer
// function as in functional component is called to return a VDOM object
export type VNodeType = string | Function | any;

export interface VNode<A = VNodeAttributes> {
  type?: VNodeType;
  attributes?: A;
  children?: VNodeChildren;
  sourceInfo?: unknown;
  /** Original props passed to a function component (set by jsx runtime for SSG hydration). */
  componentProps?: Record<string, any>;
}

export type VNodeChild =
  | VNode<any>
  | object
  | string
  | number
  | boolean
  | null
  | undefined;
export type VNodeChildren = VNodeChild[];

/**
 * Anything the morph engine accepts as new content.
 */
export type RenderInput =
  | VNode
  | object
  | string
  | number
  | boolean
  | null
  | undefined
  | RenderInput[];

export interface DomAbstractionImpl {
  hasElNamespace(domElement: Element | Document): boolean;

  hasSvgNamespace(parentElement: Element | Document, type: string): boolean;

  createElementOrElements(
    virtualNode: RenderInput,
    parentDomElement?: Element | Document,
  ): Array<Element | Text | undefined> | Element | Text | undefined;

  createElement(
    virtualNode: RenderInput,
    parentDomElement?: Element | Document,
  ): Element | undefined;

  createTextNode(text: string, parentDomElement?: Element | Document): Text;

  createChildElements(
    virtualChildren: VNodeChildren,
    parentDomElement?: Element | Document,
  ): Array<Element | Text | undefined>;

  setAttribute(name: string, value: any, domElement: Element): void;

  setAttributes(
    virtualNode: VNode<VNodeAttributes>,
    domElement: Element,
  ): void;
}
