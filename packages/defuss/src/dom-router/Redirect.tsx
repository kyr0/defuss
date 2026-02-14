import type { RouteProps } from "./Route.js";
import { Route } from "./Route.js";
import { Router } from "./router.js";
import type { FC } from "@/render/types.js";

export interface RedirectProps extends RouteProps {
  to: string;
}

export const Redirect: FC<RedirectProps> = ({
  path,
  to,
  router = Router,
  exact,
}) => {
  queueMicrotask(() => {
    if (Route({ path, router, exact, children: [true] })) {
      //console.log("Redirect", to);
      router.navigate(to);
    }
  });
  return null;
};
