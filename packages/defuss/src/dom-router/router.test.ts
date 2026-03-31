// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupRouter } from "./router.js";
import type { Router } from "./router.js";

describe("DOM Router", () => {
  let router: Router;
  let mockWindow: Window;

  beforeEach(() => {
    // Reset globalThis router state for test isolation
    globalThis.__defuss_router__ = undefined;
    globalThis.__defuss_router_state__ = {
      routeRegistrations: [],
      currentRequest: null,
      isReady: false,
      pendingResolvers: [],
      currentPath: "",
      popAttached: false,
      lifecycleHooks: { beforeLeave: [], leave: [] },
    };

    // Create a mock window object with history API
    mockWindow = {
      document: {
        location: {
          pathname: "/initial",
          search: "",
          hash: "",
          protocol: "http:",
          hostname: "localhost",
          port: "3000",
          href: "http://localhost:3000/initial",
        },
      },
      location: {
        pathname: "/initial",
        search: "",
        hash: "",
        protocol: "http:",
        hostname: "localhost",
        port: "3000",
        href: "http://localhost:3000/initial",
      },
      history: {
        pushState: vi.fn(),
        back: vi.fn(),
        forward: vi.fn(),
      },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as any;

    // Reset router for each test
    router = setupRouter({ strategy: "slot-refresh" }, mockWindow);
  });

  afterEach(() => {
    if (router.destroy) {
      router.destroy();
    }
    vi.clearAllMocks();
    // Clean up globalThis state
    globalThis.__defuss_router__ = undefined;
    globalThis.__defuss_router_state__ = undefined;
  });

  describe("basic functionality", () => {
    it("should create a router with slot-refresh strategy", () => {
      expect(router).toBeDefined();
      expect(router.strategy).toBe("slot-refresh");
    });

    it("should add routes", () => {
      router.add({ path: "/test" });
      const routes = router.getRoutes();
      expect(routes).toHaveLength(1);
      expect(routes[0].path).toBe("/test");
    });

    it("should match current route and return deterministic object", () => {
      router.add({ path: "/initial" });
      const req = router.match();

      // Always returns object, never false
      expect(req).toBeDefined();
      expect(typeof req).toBe("object");

      // Check match property
      expect(req.match).toBe(true);
      expect(req.matchedRoute).toBe("/initial");
      expect(req.path).toBe("/initial");

      // Verify new URL fields exist
      expect(req).toHaveProperty("protocol");
      expect(req).toHaveProperty("domain");
      expect(req).toHaveProperty("port");
      expect(req).toHaveProperty("baseUrl");
      expect(req).toHaveProperty("params");
      expect(req).toHaveProperty("queryParams");
      expect(req).toHaveProperty("hashParams");
    });

    it("should return match: false when no route matches", () => {
      router.add({ path: "/other" });
      const req = router.match();

      expect(req).toBeDefined();
      expect(req.match).toBe(false);
      expect(req.matchedRoute).toBeNull();
      expect(req.path).toBe("/initial"); // path is still populated
    });

    it("should update currentRequest when match() finds a match", () => {
      // Simulate the initial state: URL is /project/my-project
      mockWindow.document.location.pathname = "/project/my-project";
      mockWindow.document.location.href =
        "http://localhost:3000/project/my-project";
      mockWindow.location.pathname = "/project/my-project";
      mockWindow.location.href = "http://localhost:3000/project/my-project";

      // Re-create router with the updated mock window
      router = setupRouter({ strategy: "slot-refresh" }, mockWindow);

      router.add({ path: "/project/:projectName" });

      // match() with a specific path should update currentRequest
      const req = router.match("/project/:projectName");
      expect(req.match).toBe(true);
      expect(req.params.projectName).toBe("my-project");

      // getRequest() should now return the same match
      const getReq = router.getRequest();
      expect(getReq.match).toBe(true);
      expect(getReq.params.projectName).toBe("my-project");
    });

    it("should NOT overwrite currentRequest when match() does not match", () => {
      // Simulate URL: /project/my-project
      mockWindow.document.location.pathname = "/project/my-project";
      mockWindow.document.location.href =
        "http://localhost:3000/project/my-project";
      mockWindow.location.pathname = "/project/my-project";
      mockWindow.location.href = "http://localhost:3000/project/my-project";

      router = setupRouter({ strategy: "slot-refresh" }, mockWindow);

      router.add({ path: "/" });
      router.add({ path: "/project/:projectName" });

      // First, match the correct route to set currentRequest
      const matchReq = router.match("/project/:projectName");
      expect(matchReq.match).toBe(true);

      // Now match a different route that doesn't match the URL
      const noMatchReq = router.match("/");
      expect(noMatchReq.match).toBe(false);

      // currentRequest should still be the previous successful match
      const getReq = router.getRequest();
      expect(getReq.match).toBe(true);
      expect(getReq.params.projectName).toBe("my-project");
    });

    it("should provide correct params via getRequest() when simulating SSR+client routing", () => {
      // This simulates the SSR scenario:
      // Server renders /project/my-project, browser loads it,
      // then defuss client-side router initializes.
      mockWindow.document.location.pathname = "/project/my-project";
      mockWindow.document.location.href =
        "http://localhost:3000/project/my-project";
      mockWindow.location.pathname = "/project/my-project";
      mockWindow.location.href = "http://localhost:3000/project/my-project";

      router = setupRouter({ strategy: "slot-refresh" }, mockWindow);

      // Simulate Route registration order (like RouterOutlet does):
      // Route "/" is registered first
      router.add({ path: "/" });
      // Then Route "/project/:projectName"
      router.add({ path: "/project/:projectName" });

      // Route for "/" calls match("/") — no match, currentRequest stays null
      const rootMatch = router.match("/");
      expect(rootMatch.match).toBe(false);

      // Route for "/project/:projectName" calls match() — matches! Updates currentRequest.
      const projectMatch = router.match("/project/:projectName");
      expect(projectMatch.match).toBe(true);
      expect(projectMatch.params.projectName).toBe("my-project");

      // Now a child component (rendered lazily via component prop) calls getRequest():
      const request = router.getRequest();
      expect(request.match).toBe(true);
      expect(request.matchedRoute).toBe("/project/:projectName");
      expect(request.params.projectName).toBe("my-project");
      expect(request.path).toBe("/project/my-project");
    });
  });

  describe("programmatic navigation", () => {
    it("should call listeners when navigating programmatically", async () => {
      const listener = vi.fn();
      router.onRouteChange(listener);

      router.navigate("/new-path");

      expect(mockWindow.history.pushState).toHaveBeenCalledWith(
        {},
        "",
        "/new-path",
      );

      // Wait for microtask queue to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(listener).toHaveBeenCalledWith("/new-path", "/initial");
    });

    it("should update current path tracker", async () => {
      const listener = vi.fn();
      router.onRouteChange(listener);

      // Navigate to first path
      router.navigate("/first");

      // Wait for microtask queue to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(listener).toHaveBeenCalledWith("/first", "/initial");

      // Navigate to second path - old path should be "/first"
      router.navigate("/second");

      // Wait for microtask queue to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(listener).toHaveBeenCalledWith("/second", "/first");
    });
  });

  describe("browser history navigation", () => {
    it("should add popstate event listener for slot-refresh strategy", () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function),
      );
    });

    it("should not add popstate event listener for page-refresh strategy", () => {
      const pageRefreshRouter = setupRouter(
        { strategy: "page-refresh" },
        mockWindow,
      );
      // Clear the previous call from beforeEach
      vi.clearAllMocks();

      // Create new router which shouldn't add popstate listener
      setupRouter({ strategy: "page-refresh" }, mockWindow);
      expect(mockWindow.addEventListener).not.toHaveBeenCalledWith(
        "popstate",
        expect.any(Function),
      );
    });

    it("should handle browser back/forward navigation", async () => {
      const listener = vi.fn();
      router.onRouteChange(listener);

      // Get the popstate handler that was registered
      const addEventListenerCall = vi
        .mocked(mockWindow.addEventListener)
        .mock.calls.find((call) => call[0] === "popstate");
      expect(addEventListenerCall).toBeDefined();
      const popstateHandler = addEventListenerCall![1] as EventListener;

      // Simulate navigation to a new path first
      router.navigate("/page1");

      // Wait for microtask queue to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      expect(listener).toHaveBeenCalledWith("/page1", "/initial");
      vi.clearAllMocks();

      // Simulate browser back navigation by updating location and firing popstate
      mockWindow.document.location.pathname = "/initial";
      const popstateEvent = new PopStateEvent("popstate");
      popstateHandler(popstateEvent);

      // Wait for microtask queue to complete
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));

      // Should notify listeners of the path change
      expect(listener).toHaveBeenCalledWith("/initial", "/page1");
    });

    it("should track path changes correctly with multiple browser navigations", async () => {
      const listener = vi.fn();
      router.onRouteChange(listener);

      // Get the popstate handler
      const addEventListenerCall = vi
        .mocked(mockWindow.addEventListener)
        .mock.calls.find((call) => call[0] === "popstate");
      const popstateHandler = addEventListenerCall![1] as EventListener;

      // Navigate programmatically: /initial -> /page1
      router.navigate("/page1");
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(listener).toHaveBeenCalledWith("/page1", "/initial");

      // Navigate programmatically: /page1 -> /page2
      router.navigate("/page2");
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(listener).toHaveBeenCalledWith("/page2", "/page1");

      vi.clearAllMocks();

      // Simulate browser back: /page2 -> /page1
      mockWindow.document.location.pathname = "/page1";
      popstateHandler(new PopStateEvent("popstate"));
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(listener).toHaveBeenCalledWith("/page1", "/page2");

      // Simulate browser back: /page1 -> /initial
      mockWindow.document.location.pathname = "/initial";
      popstateHandler(new PopStateEvent("popstate"));
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(listener).toHaveBeenCalledWith("/initial", "/page1");

      // Simulate browser forward: /initial -> /page1
      mockWindow.document.location.pathname = "/page1";
      popstateHandler(new PopStateEvent("popstate"));
      await new Promise((resolve) => queueMicrotask(() => resolve(undefined)));
      expect(listener).toHaveBeenCalledWith("/page1", "/initial");
    });

    it("should only handle popstate events for slot-refresh strategy", () => {
      // Count the number of popstate listeners before creating page-refresh router
      const initialPopstateListeners = vi
        .mocked(mockWindow.addEventListener)
        .mock.calls.filter((call) => call[0] === "popstate").length;

      // Create page-refresh router - should NOT add a popstate listener
      const pageRefreshRouter = setupRouter(
        { strategy: "page-refresh" },
        mockWindow,
      );
      const listener = vi.fn();
      pageRefreshRouter.onRouteChange(listener);

      // Count popstate listeners after creating page-refresh router
      const finalPopstateListeners = vi
        .mocked(mockWindow.addEventListener)
        .mock.calls.filter((call) => call[0] === "popstate").length;

      // Should be the same count - no new popstate listener should have been added
      expect(finalPopstateListeners).toBe(initialPopstateListeners);
    });
  });

  describe("cleanup", () => {
    it("should remove popstate event listener when destroyed", () => {
      router.destroy();

      expect(mockWindow.removeEventListener).toHaveBeenCalledWith(
        "popstate",
        expect.any(Function),
      );
    });
  });

  describe("route lifecycle hooks", () => {
    it("should create a RouteContext with request and hook methods", () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);

      expect(ctx.request).toBe(req);
      expect(typeof ctx.onBeforeLeave).toBe("function");
      expect(typeof ctx.onLeave).toBe("function");
    });

    it("should register and run beforeLeave hooks", async () => {
      const hook = vi.fn(() => true);
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);
      ctx.onBeforeLeave(hook);

      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(true);
      expect(hook).toHaveBeenCalledOnce();
    });

    it("should block navigation when beforeLeave returns false", async () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);
      ctx.onBeforeLeave(() => false);

      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(false);
    });

    it("should block navigation when async beforeLeave resolves to false", async () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);
      ctx.onBeforeLeave(async () => false);

      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(false);
    });

    it("should allow navigation when beforeLeave returns undefined", async () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);
      ctx.onBeforeLeave(() => {});

      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(true);
    });

    it("should short-circuit on first blocking beforeLeave hook", async () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);

      const hook1 = vi.fn(() => false);
      const hook2 = vi.fn(() => true);
      ctx.onBeforeLeave(hook1);
      ctx.onBeforeLeave(hook2);

      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(false);
      expect(hook1).toHaveBeenCalledOnce();
      expect(hook2).not.toHaveBeenCalled();
    });

    it("should register and run leave hooks", () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);

      const hook = vi.fn();
      ctx.onLeave(hook);

      router.runLeaveHooks();
      expect(hook).toHaveBeenCalledOnce();
    });

    it("should run multiple leave hooks in order", () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);

      const order: number[] = [];
      ctx.onLeave(() => order.push(1));
      ctx.onLeave(() => order.push(2));

      router.runLeaveHooks();
      expect(order).toEqual([1, 2]);
    });

    it("should clear lifecycle hooks and return old leave hooks", async () => {
      router.add({ path: "/initial" });
      const req = router.match("/initial");
      const ctx = router.createRouteContext(req);

      const beforeHook = vi.fn();
      const leaveHook = vi.fn();
      ctx.onBeforeLeave(beforeHook);
      ctx.onLeave(leaveHook);

      const { leaveHooks } = router.clearRouteLifecycle();
      expect(leaveHooks).toHaveLength(1);

      // Old leave hooks are returned for deferred execution
      leaveHooks[0]();
      expect(leaveHook).toHaveBeenCalledOnce();

      // After clearing, running hooks should do nothing
      const allowed = await router.runBeforeLeaveHooks();
      // Cleared — no hooks to block
      expect(allowed).toBe(true);
    });

    it("should allow navigation with no hooks registered", async () => {
      const allowed = await router.runBeforeLeaveHooks();
      expect(allowed).toBe(true);
    });
  });
});
