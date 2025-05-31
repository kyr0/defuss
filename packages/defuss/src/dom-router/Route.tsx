import type { Props, VNodeChild } from "@/render/types.js";
import { Router } from "./router.js";

export interface RouteProps extends Props {
  path: string;
  router?: Router;
  exact?: boolean;
}

export const Route = ({
  path,
  exact,
  children,
  router = Router,
}: RouteProps): VNodeChild => {
  // make sure the router knows the path to be matched
  router.add({
    path,
    exact: exact || false,
  });
  return router.match(path)
    ? Array.isArray(children)
      ? children[0]
      : null
    : null;
};
