import { isServer } from "../webstorage/runtime.js";

export type OnHandleRouteChangeFn = (
  newRoute: string,
  oldRoute: string,
) => void;
export type OnRouteChangeFn = (cb: OnHandleRouteChangeFn) => void;
export type RouterStrategy = "page-refresh" | "slot-refresh";

export interface Router {
  listeners: Array<OnHandleRouteChangeFn>;
  strategy: RouterStrategy;
  add(registration: RouteRegistration): Router;
  match(path?: string): RouteRequest | false;
  getRoutes(): Array<RouteRegistration>;
  tokenizePath(path: string): TokenizedPath;
  navigate(path: string): void;
  onRouteChange: OnRouteChangeFn;
  destroy(): void;
  attachPopStateHandler(): void;
}

export interface RouterConfig {
  strategy?: RouterStrategy;
}

interface RouteMatchGroups {
  [matchName: string]: number;
}

export interface RouteParams {
  [name: string]: string;
}

export interface RouteRegistration {
  path: string;
  exact?: boolean;
  tokenizedPath?: TokenizedPath;
  handler?: RouteHandler;
}

export interface RouteRequest {
  url: string;
  params: RouteParams;
}

export interface TokenizedPath {
  regexp: RegExp;
  groups: RouteMatchGroups;
}

export type RouteHandler = (request: RouteRequest) => void;

export const tokenizePath = (path: string): TokenizedPath => {
  const paramNameRegexp = /:([^\/\.\\]+)/g;
  const groups: RouteMatchGroups = {};
  let groupIndex = 1;

  // Replace parameters with capturing groups and store the parameter names.
  const pattern = path.replace(paramNameRegexp, (_, paramName) => {
    groups[paramName] = groupIndex++;
    return "([^/.\\]+)";
  });

  return {
    groups,
    regexp: new RegExp(`^${pattern}$`),
  };
};

export const matchRouteRegistrations = (
  routeRegistrations: Array<RouteRegistration>,
  actualPathName: string,
  haystackPathName?: string,
): RouteRequest | false => {
  for (const route of routeRegistrations) {
    // Check if path is set and route.path matches it
    if (haystackPathName && route.path !== haystackPathName) {
      //console.warn(`Skipped path: Looking for ${haystackPathName}, but found ${route.path}`);
      continue;
    }

    // Check if exact match is required and if the match is exact
    if (route.exact && route.path !== actualPathName) {
      //console.warn(`Exact match required, but found ${actualPathName} instead of ${route.path}`);
      continue;
    }

    const match = route.tokenizedPath!.regexp.exec(actualPathName);
    if (!match) continue;

    //console.log(`Route matched: ${route.path} for URL: ${actualPathName}`);

    const params: RouteParams = {};

    // Extract each parameter using the stored capturing group index.
    for (const [paramName, groupIndex] of Object.entries(
      route.tokenizedPath!.groups,
    )) {
      params[paramName] = match[groupIndex];
    }

    const request: RouteRequest = { url: actualPathName, params };

    if (typeof route.handler === "function") {
      route.handler(request);
    }
    return request;
  }
  return false;
};

export const setupRouter = (
  config: RouterConfig = {
    strategy: "page-refresh", // default
  },
  windowImpl?: Window,
): Router => {
  const routeRegistrations: Array<RouteRegistration> = [];
  let currentPath = ""; // Track current path for popstate events
  let popAttached = false; // Guard to prevent stacking popstate listeners

  // safe SSR rendering, and fine default for client side
  if (typeof window !== "undefined" && !windowImpl) {
    windowImpl = globalThis.__defuss_window /** for SSR support */ || window;
  }

  if (!windowImpl && !isServer()) {
    console.warn("Router requires a Window API implementation!");
  }

  // Initialize current path
  if (windowImpl) {
    currentPath = windowImpl.document.location.pathname;
  }

  const api = {
    ...config,
    listeners: [] as Array<OnHandleRouteChangeFn>,
    onRouteChange: (cb: OnHandleRouteChangeFn) => {
      api.listeners.push(cb);
    },
    tokenizePath,
    add(registration: RouteRegistration): Router {
      const isAlreadyRegistered = routeRegistrations.some(
        (registeredRoute) => registeredRoute.path === registration.path,
      );

      if (!isAlreadyRegistered) {
        routeRegistrations.push({
          ...registration,
          tokenizedPath: tokenizePath(registration.path),
        });
      }
      return api as Router;
    },
    match(path?: string) {
      return matchRouteRegistrations(
        routeRegistrations,
        windowImpl!.document.location.pathname,
        path,
      );
    },
    navigate(newPath: string) {
      const strategy = api.strategy || "page-refresh";
      const oldPath = currentPath; // Use tracked currentPath instead of window location

      if (strategy === "page-refresh") {
        document.location.href = newPath;
      } else if (strategy === "slot-refresh") {
        // show new path in the address bar
        if (typeof windowImpl !== "undefined") {
          windowImpl!.history.pushState({}, "", newPath);
        }

        // Update current path tracker
        currentPath = newPath;

        // Queue listeners to be called asynchronously
        queueMicrotask(() => {
          for (const listener of api.listeners) {
            listener(newPath, oldPath);
          }
        });
      }
    },
    getRoutes() {
      return routeRegistrations;
    },
    destroy() {
      // Remove popstate event listener when router is destroyed
      if (windowImpl && api.strategy === "slot-refresh") {
        windowImpl.removeEventListener("popstate", handlePopState);
        popAttached = false;
      }
    },
    attachPopStateHandler() {
      if (windowImpl && api.strategy === "slot-refresh" && !popAttached) {
        windowImpl.addEventListener("popstate", handlePopState);
        popAttached = true;
      }
    },
  };

  // Handle browser back/forward navigation
  const handlePopState = (event: PopStateEvent) => {
    if (api.strategy === "slot-refresh" && windowImpl) {
      const newPath = windowImpl.document.location.pathname;
      const oldPath = currentPath;

      // Update current path tracker
      currentPath = newPath;

      // Queue listeners to be called asynchronously to ensure proper timing
      queueMicrotask(() => {
        for (const listener of api.listeners) {
          listener(newPath, oldPath);
        }
      });
    }
  };

  // Add popstate event listener for slot-refresh strategy during initialization
  if (windowImpl && api.strategy === "slot-refresh") {
    api.attachPopStateHandler();
  }

  return api as Router;
};

export const Router = setupRouter();
