import type { Props, VNodeChild } from "../render/types.js";
import {
  createRef,
  type Ref,
  type NodeType,
} from "../render/client.js";
import { Router } from "./router.js";
import { $, type TransitionConfig } from "../dequery/index.js";

export const RouterSlotId = "router-slot";

// Unique, non-colliding flag on the router instance
const ROUTER_SLOT_GUARD = Symbol.for("defuss.RouterSlot.guard");

export interface RouterSlotProps extends Props {
  /** to override the tag name used for the router slot */
  tag?: string;

  /** to override the default id 'router-slot' */
  id?: string;

  /** to identify/select the root DOM element or style it, W3C naming */
  class?: string;

  /** to identify/select the root DOM element or style it, React naming */
  className?: string;

  /** to override the default global router */
  router?: Router;

  /** A component reference that returns many <Route />, <Redirect ... /> etc. components */
  RouterOutlet?: any;

  /** Transition configuration for route changes; default: { type: 'fade', duration: 50 } */
  transitionConfig?: TransitionConfig;
}

/**
 * RouterSlot registers a slot refresh handler with the global router configuration
 * and renders its default children (RouterOutlet). Whenever the route changes, it re-renders dynamically.
 * This decouples the slot refresh logic from route registration.
 */
export const RouterSlot = ({
  router = Router,
  children,
  RouterOutlet,
  id,
  transitionConfig = {
    type: "fade",
    duration: 25,
    target: "self",
  } as TransitionConfig,
  ...attributes
}: RouterSlotProps): VNodeChild => {
  const { tag, ...attributesWithoutTag } = attributes;
  const ref: Ref<NodeType> = createRef();

  // Use provided id or fall back to default
  const slotId = id ?? RouterSlotId;

  // by using this component, we automatically switch to slot-refresh strategy
  router.strategy = "slot-refresh";
  router.attachPopStateHandler();

  // guard: register onRouteChange listener only once per router instance
  const r: any = router;
  if (!r[ROUTER_SLOT_GUARD]) {
    r[ROUTER_SLOT_GUARD] = true;

    router.onRouteChange(async () => {
      await $(ref).update(
        typeof RouterOutlet === "function" ? RouterOutlet() : [],
        transitionConfig,
      );
    });
  }

  if (document.getElementById(slotId)) {
    console.warn(
      `It seems there's more than one <RouterSlot /> components defined as an element with id #${slotId} already exists in the DOM.`,
    );
  }

  return {
    children: [RouterOutlet() || []].flat(),
    type: attributes.tag || "div",
    attributes: {
      ...attributesWithoutTag,
      id: slotId,
      ref,
    },
  };
};
