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
});
