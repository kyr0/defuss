/**
 * Why: the package's shared type vocabulary in one runtime-free module.
 * `MorphApi` in particular defines the injection contract between the query
 * facade and defuss-morph — see its doc below.
 */
import type * as Morph from "defuss-morph";
import type {
  MorphOptions,
  RenderInput,
  TransitionConfig,
  VNode,
} from "defuss-morph";
export type { MorphOptions, RenderInput, TransitionConfig, VNode };

/**
 * The exact subset of defuss-morph the facade and adapter rely on. Declaring
 * it as a `Pick` keeps the browser bundle honest: any object providing these
 * functions (e.g. the CDN morph global) can be injected in place of the
 * module, so the engine never gets bundled twice.
 */
export type MorphApi = Pick<
  typeof Morph,
  | "morph"
  | "getRenderer"
  | "htmlStringToVNodes"
  | "renderMarkup"
  | "domNodeToVNode"
  | "registerDelegatedEvent"
  | "removeDelegatedEvent"
  | "getRegisteredEventTypes"
  | "clearDelegatedEventsDeep"
  | "clearDelegatedEvents"
  | "handleLifecycleEventsForOnMount"
>;
export type QueryRoot = Document | Element | DocumentFragment;
/** Anything insertion methods accept: renderable input, nodes, node lists. */
export type DomContent = RenderInput | Node | Iterable<Node> | ArrayLike<Node>;
/** Anything `df$()` accepts as its first argument. */
export type QueryInput<T extends EventTarget = EventTarget> =
  | string
  | T
  | Iterable<T>
  | ArrayLike<T>
  | VNode
  | null
  | undefined;
/** A form control value: scalar, cleared by null, or multi-select array. */
export type Value = string | number | null | readonly string[];
/**
 * Delegation supports capture only; other listener options need the native
 * addEventListener API.
 */
export type QueryEventOptions = Pick<AddEventListenerOptions, "capture">;
/** The DOM event map matching the selected target kind. */
export type EventMapFor<T> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : GlobalEventHandlersEventMap;
/** Listener with `this` bound to the selected target. */
export type Handler<T, E extends Event = Event> = (
  this: T,
  event: E,
) => unknown;
/** Options without `transition` keep morph() synchronous. */
export type SynchronousMorphOptions = Omit<MorphOptions, "transition"> & {
  transition?: undefined;
};
/** Requiring a transition config makes the async morph() overload explicit. */
export type AsynchronousMorphOptions = MorphOptions & {
  transition: TransitionConfig;
};
/** Insert positions, named after the native insertAdjacentHTML API. */
export type Position = "beforebegin" | "afterbegin" | "beforeend" | "afterend";
