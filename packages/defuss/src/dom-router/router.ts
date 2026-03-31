import { isServer } from "../webstorage/runtime.js";

export type OnHandleRouteChangeFn = (
  newRoute: string,
  oldRoute: string,
) => void;
export type OnRouteChangeFn = (cb: OnHandleRouteChangeFn) => void;
export type RouterStrategy = "page-refresh" | "slot-refresh";

export type BeforeUnmountHookFn = () =>
  | boolean
  | void
  | Promise<boolean | void>;
export type UnmountHookFn = () => void;

/**
 * Context object passed to components rendered via Route's `component` prop.
 * Provides access to the current route request and lifecycle hooks.
 *
 * @example
 * ```tsx
 * const MyScreen = ({ route }: { route: RouteContext }) => {
 *   route.onBeforeUnmount(() => {
 *     // Return false to block navigation (e.g. unsaved changes)
 *     return confirm("Leave page?");
 *   });
 *   route.onUnmount(() => {
 *     console.log("Route was left");
 *   });
 *   return <div>Current path: {route.request.path}</div>;
 * };
 * ```
 */
export interface RouteContext {
  /** The matched RouteRequest for the current route */
  request: RouteRequest;

  /**
   * Register a hook that fires before the route is unmounted.
   * Returning `false` (or a Promise resolving to `false`) blocks navigation,
   * allowing implementation of confirmation dialogs.
   */
  onBeforeUnmount(fn: BeforeUnmountHookFn): void;

  /**
   * Register a hook that fires after the route has been unmounted
   * (navigation completed, new route is rendered).
   */
  onUnmount(fn: UnmountHookFn): void;
}

/**
 * Props mixin for screen components rendered by `<Route component={...} />`.
 * Extend your component props with this to get typed access to route context.
 *
 * @example
 * ```tsx
 * import { Router, type Props, type RouteProps } from "defuss";
 *
 * export interface ProjectDetailsProps extends Props, RouteProps {}
 *
 * export function ProjectDetailsScreen({ route }: ProjectDetailsProps) {
 *   const { projectName } = route.request.params;
 *   return <h1>Project: {projectName}</h1>;
 * }
 * ```
 */
export interface RouteProps {
  route: RouteContext;
}

export interface Router {
  listeners: Array<OnHandleRouteChangeFn>;
  strategy: RouterStrategy;
  add(registration: RouteRegistration): Router;
  match(path?: string): RouteRequest;
  resolve(pathname?: string): RouteRequest;
  getRequest(): RouteRequest;
  getRoutes(): Array<RouteRegistration>;
  tokenizePath(path: string): TokenizedPath;
  navigate(path: string): void;
  onRouteChange: OnRouteChangeFn;
  destroy(): void;
  attachPopStateHandler(): void;

  /**
   * Returns a promise that resolves when the router is ready (routes are registered).
   * Call this before using getRequest() in components that render inside Route.
   *
   * @example
   * ```tsx
   * const MyComponent = async () => {
   *   await Router.ready();
   *   const req = Router.getRequest();
   *   // params are now available
   * }
   * ```
   */
  ready(): Promise<void>;

  /**
   * Mark the router as ready. Called by RouterSlot after routes are registered.
   * @internal
   */
  setReady(): void;

  /**
   * Create a RouteContext object for a matched route request.
   * The context provides lifecycle hooks (onBeforeUnmount, onUnmount)
   * and is passed to components rendered via Route's `component` prop.
   */
  createRouteContext(request: RouteRequest): RouteContext;

  /**
   * Run all registered beforeUnmount hooks sequentially.
   * Returns `false` if any hook returns `false` (navigation should be blocked).
   * @internal
   */
  runBeforeUnmountHooks(): Promise<boolean>;

  /**
   * Run all registered unmount hooks.
   * @internal
   */
  runUnmountHooks(): void;

  /**
   * Clear all lifecycle hooks and return the old unmount hooks
   * so they can be called after the new route has been rendered.
   * @internal
   */
  clearRouteLifecycle(): { unmountHooks: Array<UnmountHookFn> };
}

export interface RouterConfig {
  strategy?: RouterStrategy;
}

interface RouteMatchGroups {
  [matchName: string]: number;
}

/**
 * Key-value map for URL parameters.
 * Used for route params, query params, and hash params.
 */
export interface RouteParams {
  [name: string]: string;
}

export interface RouteRegistration {
  path: string;
  exact?: boolean;
  tokenizedPath?: TokenizedPath;
  handler?: RouteHandler;
}

/**
 * Represents the current routing state and URL information.
 *
 * This object is **always returned** by `Router.getRequest()`, `Router.match()`,
 * and `Router.resolve()`. Unlike returning `false` on no match, this provides
 * a deterministic API where you can always access URL information.
 *
 * @example
 * ```tsx
 * const req = Router.getRequest();
 *
 * // Check if a registered route matched
 * if (req.match) {
 *   console.log(`Matched route: ${req.matchedRoute}`);
 *   console.log(`Component name: ${req.params.name}`);
 * } else {
 *   console.log('No matching route');
 * }
 *
 * // URL components are always available regardless of match
 * console.log(`Current path: ${req.path}`);
 * console.log(`Base URL: ${req.baseUrl}`);
 * ```
 *
 * @example
 * ```tsx
 * // Dynamic route like "/components/:name"
 * const req = Router.getRequest();
 * const title = req.match ? req.params.name : 'Unknown';
 * ```
 */
export interface RouteRequest {
  /**
   * Whether a registered route pattern matched the current path.
   * Always check this before accessing route-specific params.
   */
  match: boolean;

  /**
   * The route pattern that matched, e.g., "/components/:name".
   * `null` if no route matched (`match === false`).
   */
  matchedRoute: string | null;

  /**
   * URL protocol without the colon, e.g., "http" or "https".
   */
  protocol: string;

  /**
   * Domain/hostname, e.g., "localhost" or "example.com".
   */
  domain: string;

  /**
   * Port number as string, e.g., "5173".
   * Empty string if using default port (80 for http, 443 for https).
   */
  port: string;

  /**
   * Base URL combining protocol, domain, and port.
   * E.g., "http://localhost:5173" or "https://example.com".
   * Does not include path, query, or hash.
   */
  baseUrl: string;

  /**
   * Path portion of the URL, e.g., "/components/accordion".
   * Does not include query string or hash.
   */
  path: string;

  /**
   * Full URL including path, query, and hash.
   * E.g., "http://localhost:5173/components/accordion?tab=code#section"
   */
  url: string;

  /**
   * Route parameters extracted from dynamic segments.
   * E.g., for route "/components/:name" and path "/components/accordion",
   * params would be `{ name: "accordion" }`.
   * Empty object if no route matched or route has no params.
   */
  params: RouteParams;

  /**
   * Query string parameters parsed from the URL.
   * E.g., for "?q=test&page=1", queryParams would be `{ q: "test", page: "1" }`.
   */
  queryParams: RouteParams;

  /**
   * Hash fragment parameters parsed as key-value pairs.
   * E.g., for "#sort=desc&view=grid", hashParams would be `{ sort: "desc", view: "grid" }`.
   * Note: Only works if hash uses query-string format.
   */
  hashParams: RouteParams;
}

export interface TokenizedPath {
  regexp: RegExp;
  groups: RouteMatchGroups;
}

export type RouteHandler = (request: RouteRequest) => void;

export const tokenizePath = (path: string): TokenizedPath => {
  const paramNameRegexp = /:([a-zA-Z0-9_]+)|\*/g;
  const groups: RouteMatchGroups = {};
  let groupIndex = 1;

  // Escape special regex characters in the string
  const escapeRegex = (str: string) =>
    str.replace(/[.+?^${}()|[\]\\]/g, "\\$&"); // Removed * from escape list

  let pattern = "";
  let lastIndex = 0;
  let match;

  while ((match = paramNameRegexp.exec(path)) !== null) {
    const [fullMatch, paramName] = match;
    const offset = match.index;

    // Append the static part before this parameter, escaped
    pattern += escapeRegex(path.slice(lastIndex, offset));

    if (fullMatch === "*") {
      // Wildcard
      groups["wildcard"] = groupIndex++;
      pattern += "(.*)";
    } else {
      // Named parameter
      groups[paramName] = groupIndex++;
      // Append capturing group for the parameter (matches anything except /)
      pattern += "([^/]+)";
    }

    lastIndex = offset + fullMatch.length;
  }

  // Append remaining static part
  pattern += escapeRegex(path.slice(lastIndex));

  // Handle optional trailing slash
  if (pattern.endsWith("/")) {
    pattern = pattern.slice(0, -1) + "/?";
  } else if (pattern !== "") {
    // Don't add /? to empty string
    pattern += "/?";
  }

  return {
    groups,
    regexp: new RegExp(`^${pattern}$`),
  };
};

export interface MatchRouteRegistrationsOpts {
  invokeHandler?: boolean;
}

const parseParams = (str: string): RouteParams => {
  const params: RouteParams = {};
  if (!str) return params;
  // Remove leading ? or # if present
  const cleanStr =
    str.startsWith("?") || str.startsWith("#") ? str.slice(1) : str;
  if (!cleanStr) return params;
  const searchParams = new URLSearchParams(cleanStr);
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }
  return params;
};

/**
 * Builds a RouteRequest object with all URL components.
 * Always returns a complete object - never returns false.
 */
const buildRouteRequest = (
  windowImpl: Window | undefined,
  pathname: string,
  matched: boolean,
  matchedRoute: string | null,
  params: RouteParams = {},
): RouteRequest => {
  let protocol = "";
  let domain = "";
  let port = "";
  let baseUrl = "";
  let url = pathname;
  let queryParams: RouteParams = {};
  let hashParams: RouteParams = {};

  if (windowImpl) {
    const loc = windowImpl.location;
    protocol = loc.protocol.replace(":", ""); // Remove trailing colon
    domain = loc.hostname;
    port = loc.port;

    // Build baseUrl
    baseUrl = `${loc.protocol}//${loc.hostname}`;
    if (loc.port) {
      baseUrl += `:${loc.port}`;
    }

    // Full URL
    url = loc.href;

    // Parse query and hash params
    queryParams = parseParams(loc.search);
    hashParams = parseParams(loc.hash);
  }

  return {
    match: matched,
    matchedRoute,
    protocol,
    domain,
    port,
    baseUrl,
    path: pathname,
    url,
    params,
    queryParams,
    hashParams,
  };
};

/**
 * Match registered routes against the current pathname.
 * Always returns a RouteRequest object with match: true/false.
 */
export const matchRouteRegistrations = (
  routeRegistrations: Array<RouteRegistration>,
  actualPathName: string,
  haystackPathName?: string,
  opts: MatchRouteRegistrationsOpts = {},
  windowImpl?: Window,
): RouteRequest => {
  const invokeHandler = opts.invokeHandler ?? true;

  for (const route of routeRegistrations) {
    // Check if path is set and route.path matches it
    if (haystackPathName && route.path !== haystackPathName) {
      continue;
    }

    // Check if exact match is required
    if (route.exact && route.path !== actualPathName) {
      continue;
    }

    const regexMatch = route.tokenizedPath!.regexp.exec(actualPathName);
    if (!regexMatch) {
      continue;
    }

    const params: RouteParams = {};

    // Extract each parameter using the stored capturing group index.
    for (const [paramName, groupIndex] of Object.entries(
      route.tokenizedPath!.groups,
    )) {
      params[paramName] = regexMatch[groupIndex];
    }

    const request = buildRouteRequest(
      windowImpl,
      actualPathName,
      true,
      route.path,
      params,
    );

    if (invokeHandler && typeof route.handler === "function") {
      route.handler(request);
    }
    return request;
  }

  // No match found - return request with match: false
  return buildRouteRequest(windowImpl, actualPathName, false, null);
};

export const setupRouter = (
  config: RouterConfig = {
    strategy: "page-refresh", // default
  },
  windowImpl?: Window,
): Router => {
  // Use shared state from globalThis for dual-package compatibility
  const state = globalThis.__defuss_router_state__ ?? {
    routeRegistrations: [],
    currentRequest: null,
    isReady: false,
    pendingResolvers: [],
    currentPath: "",
    popAttached: false,
    lifecycleHooks: { beforeUnmount: [], unmount: [] },
  };

  // Ensure lifecycleHooks exists (for pre-existing state without it)
  if (!state.lifecycleHooks) {
    state.lifecycleHooks = { beforeUnmount: [], unmount: [] };
  }

  // Aliases for cleaner code
  const routeRegistrations = state.routeRegistrations;

  // safe SSR rendering, and fine default for client side
  if (typeof window !== "undefined" && !windowImpl) {
    windowImpl = globalThis.__defuss_window /** for SSR support */ || window;
  }

  if (!windowImpl && !isServer()) {
    // console.warn("Router requires a Window API implementation!");
  }

  // Initialize current path
  if (windowImpl) {
    state.currentPath = windowImpl.document.location.pathname;
  }

  const resolveFromLocation = (invokeHandler: boolean): RouteRequest => {
    const pathname = windowImpl?.document.location.pathname ?? "/";
    state.currentRequest = matchRouteRegistrations(
      routeRegistrations,
      pathname,
      undefined,
      { invokeHandler },
      windowImpl,
    );
    return state.currentRequest;
  };

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
    match(path?: string): RouteRequest {
      const pathname = windowImpl?.document.location.pathname ?? "/";

      const req = matchRouteRegistrations(
        routeRegistrations,
        pathname,
        path,
        { invokeHandler: false },
        windowImpl,
      );

      // When a route matches, update currentRequest so that getRequest()
      // returns the correct match info for child components rendered lazily
      // (e.g. via the Route component={...} prop).
      if (req.match) {
        state.currentRequest = req;
      }

      return req;
    },
    resolve(pathname?: string): RouteRequest {
      const actualPathname =
        pathname ?? windowImpl?.document.location.pathname ?? "/";
      state.currentRequest = matchRouteRegistrations(
        routeRegistrations,
        actualPathname,
        undefined,
        { invokeHandler: false },
        windowImpl,
      );
      return state.currentRequest;
    },

    getRequest(): RouteRequest {
      if (state.currentRequest) return state.currentRequest;
      return resolveFromLocation(false);
    },

    navigate(newPath: string) {
      const strategy = api.strategy || "page-refresh";
      const oldPath = state.currentPath; // Use tracked currentPath instead of window location

      if (strategy === "page-refresh") {
        windowImpl!.location.href = newPath;
      } else if (strategy === "slot-refresh") {
        // Extract just the pathname for matching (remove query and hash)
        const pathname = newPath.split("?")[0].split("#")[0];

        if (typeof windowImpl !== "undefined") {
          windowImpl!.history.pushState({}, "", newPath);
        }

        state.currentPath = pathname;

        state.currentRequest = matchRouteRegistrations(
          routeRegistrations,
          pathname,
          undefined,
          { invokeHandler: false },
          windowImpl,
        );

        // Queue listeners to be called asynchronously
        // We use setTimeout to ensure it runs after the DOM sync
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
        state.popAttached = false;
      }
    },
    attachPopStateHandler() {
      if (windowImpl && api.strategy === "slot-refresh" && !state.popAttached) {
        windowImpl.addEventListener("popstate", handlePopState);
        state.popAttached = true;
      }
    },

    ready(): Promise<void> {
      if (state.isReady) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        state.pendingResolvers.push(resolve);
      });
    },

    setReady() {
      if (state.isReady) return;
      state.isReady = true;

      // Re-resolve the current route now that all routes are registered
      // This ensures getRequest() returns accurate match info
      resolveFromLocation(false);

      // Resolve all pending ready() calls
      for (const resolve of state.pendingResolvers) {
        resolve();
      }
      state.pendingResolvers = [];
    },

    createRouteContext(request: RouteRequest): RouteContext {
      return {
        request,
        onBeforeUnmount(fn: BeforeUnmountHookFn) {
          state.lifecycleHooks.beforeUnmount.push(fn);
        },
        onUnmount(fn: UnmountHookFn) {
          state.lifecycleHooks.unmount.push(fn);
        },
      };
    },

    async runBeforeUnmountHooks(): Promise<boolean> {
      for (const fn of state.lifecycleHooks.beforeUnmount) {
        const result = await fn();
        if (result === false) return false;
      }
      return true;
    },

    runUnmountHooks() {
      for (const fn of state.lifecycleHooks.unmount) {
        fn();
      }
    },

    clearRouteLifecycle(): { unmountHooks: Array<UnmountHookFn> } {
      const oldUnmountHooks = [...state.lifecycleHooks.unmount];
      state.lifecycleHooks.beforeUnmount = [];
      state.lifecycleHooks.unmount = [];
      return { unmountHooks: oldUnmountHooks };
    },
  };

  // Handle browser back/forward navigation
  const handlePopState = (event: PopStateEvent) => {
    if (api.strategy === "slot-refresh" && windowImpl) {
      const newPath = windowImpl.document.location.pathname;
      const oldPath = state.currentPath;

      // Update current path tracker
      state.currentPath = newPath;

      // resolve new request, keep cache in sync on back/forward
      resolveFromLocation(false);

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

// Use globalThis to ensure singleton across all module instances
// This fixes dual-package issues when defuss is imported from multiple sources
const ROUTER_GLOBAL_KEY = "__defuss_router__";
const ROUTER_STATE_KEY = "__defuss_router_state__";

// Shared state that must be accessible across all module instances
interface RouterState {
  routeRegistrations: Array<RouteRegistration>;
  currentRequest: RouteRequest | null;
  isReady: boolean;
  pendingResolvers: Array<() => void>;
  currentPath: string;
  popAttached: boolean;
  lifecycleHooks: {
    beforeUnmount: Array<BeforeUnmountHookFn>;
    unmount: Array<UnmountHookFn>;
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __defuss_router__: Router | undefined;
  // eslint-disable-next-line no-var
  var __defuss_router_state__: RouterState | undefined;
}

// Initialize shared state if it doesn't exist
if (!globalThis[ROUTER_STATE_KEY]) {
  globalThis[ROUTER_STATE_KEY] = {
    routeRegistrations: [],
    currentRequest: null,
    isReady: false,
    pendingResolvers: [],
    currentPath: "",
    popAttached: false,
    lifecycleHooks: { beforeUnmount: [], unmount: [] },
  };
}

// Get the shared state - used by setupRouter
export const getRouterState = (): RouterState => globalThis[ROUTER_STATE_KEY]!;

const existingRouter = globalThis[ROUTER_GLOBAL_KEY];
export const Router: Router =
  existingRouter ?? (globalThis[ROUTER_GLOBAL_KEY] = setupRouter());
