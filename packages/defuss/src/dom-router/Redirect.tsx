import type { VNodeChild } from "@/render/types.js";
import type { RouteProps } from "./Route.js";
import { Route } from "./Route.js";
import { Router } from "./router.js";

export interface RedirectProps extends RouteProps {
  to: string;
}

export const Redirect = ({
  path,
  to,
  router = Router,
  exact,
}: RedirectProps): VNodeChild => {
  queueMicrotask(() => {
    if (Route({ path, router, exact, children: [true] })) {
      //console.log("Redirect", to);
      router.navigate(to);
    }
  });
  return null;
};
