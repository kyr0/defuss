import type { Props, FC } from "@/render/types.js";
import { Router } from "./router.js";

export interface RouteProps extends Props {
  path: string;
  router?: Router;
  exact?: boolean;
}

export const Route: FC<RouteProps> = ({
  path,
  exact,
  children,
  router = Router,
}) => {
  // make sure the router knows the path to be matched
  router.add({
    path,
    exact: exact || false,
  });
  const req = router.match(path);

  if (!req.match) return null;

  return Array.isArray(children)
    ? children[0]
    : children || null;
};
