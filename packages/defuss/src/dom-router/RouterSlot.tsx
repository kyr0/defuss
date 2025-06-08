import type { Props, VNodeChild } from "../render/types.js";
import {
  createRef,
  type Ref,
  type NodeType,
  type TransitionType,
} from "../render/client.js";
import { Router } from "./router.js";
import { $, type TransitionConfig } from "../dequery/index.js";

export const RouterSlotId = "router-slot";

export interface RouterSlotProps extends Props {
  /** to override the tag name used for the router slot */
  tag?: string;

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
  transitionConfig = { type: "fade", duration: 50 },
  ...attributes
}: RouterSlotProps): VNodeChild => {
  const { tag, ...attributesWithoutTag } = attributes;
  const ref: Ref<NodeType> = createRef();

  // by using this component, we automatically switch to slot-refresh strategy
  router.strategy = "slot-refresh";
  router.attachPopStateHandler();

  router.onRouteChange(async () => {
    //console.log("<RouterSlot> RouterSlot.onRouteChange", newPath, oldPath, ref.current);
    await $(ref).update(RouterOutlet(), transitionConfig);
  });

  if (document.getElementById(RouterSlotId)) {
    console.warn(
      `It seems there's more than one <RouterSlot /> components defined as an element with id #${RouterSlotId} already exists in the DOM.`,
    );
  }

  return {
    children: RouterOutlet() || [],
    type: attributes.tag || "div",
    attributes: {
      ...attributesWithoutTag,
      id: RouterSlotId,
      ref,
    },
  };
};
