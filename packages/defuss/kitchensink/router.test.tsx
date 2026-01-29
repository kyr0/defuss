/**
 * Kitchen Sink Test Suite - Router Browser Tests
 * 
 * Tests for the DOM Router in a real Chromium browser environment:
 * - Route parameter extraction (/user/:id → params.id)
 * - Nested component depth
 * - No double-rendering verification
 * - Router.navigate() between pages
 * - RouterSlot integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, type Ref, setupRouter, RouterSlot, Route, type Router } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait, waitForCondition } from "./utils.js";

let container: HTMLDivElement;
let router: Router;

const createTestRouter = (initialPath: string = "/") => {
    // Create a mock window-like object that uses history API
    const mockWindow = {
        document: {
            location: {
                pathname: initialPath,
            },
        },
        history: {
            pushState: (state: any, title: string, url: string) => {
                mockWindow.document.location.pathname = url;
            },
            back: vi.fn(),
            forward: vi.fn(),
        },
        location: {
            get href() { return mockWindow.document.location.pathname; },
            set href(val: string) { mockWindow.document.location.pathname = val; }
        },
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as any;

    return {
        router: setupRouter({ strategy: "slot-refresh" }, mockWindow),
        mockWindow
    };
};

beforeEach(() => {
    container = createContainer();
});

afterEach(() => {
    cleanup(container);
    if (router?.destroy) {
        router.destroy();
    }
});

describe("Router Browser Tests", () => {
    describe("Route Parameter Extraction", () => {
        it("should extract single param from /user/:id route", async () => {
            const { router: testRouter, mockWindow } = createTestRouter("/user/123");
            router = testRouter;

            router.add({ path: "/user/:id" });
            const request = router.getRequest();

            expect(request).toBeTruthy();
            if (request) {
                expect(request.params.id).toBe("123");
                expect(request.url).toBe("/user/123");
            }
        });

        it("should extract multiple params from /org/:orgId/user/:userId route", async () => {
            const { router: testRouter } = createTestRouter("/org/acme/user/456");
            router = testRouter;

            router.add({ path: "/org/:orgId/user/:userId" });
            const request = router.getRequest();

            expect(request).toBeTruthy();
            if (request) {
                expect(request.params.orgId).toBe("acme");
                expect(request.params.userId).toBe("456");
            }
        });

        it("should handle numeric param values", async () => {
            const { router: testRouter } = createTestRouter("/items/999");
            router = testRouter;

            router.add({ path: "/items/:itemId" });
            const request = router.getRequest();

            expect(request).toBeTruthy();
            if (request) {
                expect(request.params.itemId).toBe("999");
            }
        });

        it("should handle alphanumeric param values", async () => {
            const { router: testRouter } = createTestRouter("/posts/abc123xyz");
            router = testRouter;

            router.add({ path: "/posts/:slug" });
            const request = router.getRequest();

            expect(request).toBeTruthy();
            if (request) {
                expect(request.params.slug).toBe("abc123xyz");
            }
        });
    });

    describe("Nested Component Depth", () => {
        it("should provide getRequest() at nested component depths", async () => {
            const { router: testRouter, mockWindow } = createTestRouter("/profile/john");
            router = testRouter;
            router.add({ path: "/profile/:username" });

            const receivedParams: string[] = [];

            // Deep nested component that accesses route params
            const DeepChild = ({ router }: { router: Router }) => {
                const request = router.getRequest();
                if (request) {
                    receivedParams.push(`deep:${request.params.username}`);
                }
                return <span class="deep-child">Deep: {request ? request.params.username : "none"}</span>;
            };

            const MiddleComponent = ({ router }: { router: Router }) => {
                const request = router.getRequest();
                if (request) {
                    receivedParams.push(`middle:${request.params.username}`);
                }
                return (
                    <div class="middle">
                        <DeepChild router={router} />
                    </div>
                );
            };

            const ProfilePage = ({ router }: { router: Router }) => {
                const request = router.getRequest();
                if (request) {
                    receivedParams.push(`top:${request.params.username}`);
                }
                return (
                    <div class="profile">
                        <h1>Profile</h1>
                        <MiddleComponent router={router} />
                    </div>
                );
            };

            await $(container).jsx(<ProfilePage router={router} />);

            expect(receivedParams).toContain("top:john");
            expect(receivedParams).toContain("middle:john");
            expect(receivedParams).toContain("deep:john");
            expect(container.querySelector(".deep-child")?.textContent).toBe("Deep: john");
        });
    });

    describe("No Double-Rendering", () => {
        it("should not double-render when getRequest() is called multiple times", async () => {
            const { router: testRouter } = createTestRouter("/page/test");
            router = testRouter;
            router.add({ path: "/page/:name" });

            let renderCount = 0;

            const TrackedComponent = ({ router }: { router: Router }) => {
                renderCount++;
                const request = router.getRequest();
                // Call getRequest multiple times - should not affect render count
                router.getRequest();
                router.getRequest();
                return <div class="tracked">Rendered: {String(renderCount)}</div>;
            };

            await $(container).jsx(<TrackedComponent router={router} />);

            // Should only render once despite multiple getRequest calls
            expect(renderCount).toBe(1);
        });

        it("should render once per navigation, not double", async () => {
            const { router: testRouter, mockWindow } = createTestRouter("/view/1");
            router = testRouter;
            router.add({ path: "/view/:id" });

            let renderCount = 0;
            const containerRef = createRef<HTMLDivElement>();

            const ViewComponent = ({ router }: { router: Router }) => {
                renderCount++;
                const request = router.getRequest();
                return <div class="view">View {request ? request.params.id : "none"} (renders: {String(renderCount)})</div>;
            };

            const App = () => (
                <div ref={containerRef}>
                    <ViewComponent router={router} />
                </div>
            );

            await $(container).jsx(<App />);
            expect(renderCount).toBe(1);

            // Navigate to new route
            router.navigate("/view/2");
            await wait(50);

            // Re-render after navigation
            await $(containerRef).jsx(<ViewComponent router={router} />);
            expect(renderCount).toBe(2); // Should be exactly 2, not more
        });
    });

    describe("Router.navigate() Between Pages", () => {
        it("should update params after navigate", async () => {
            const { router: testRouter } = createTestRouter("/item/first");
            router = testRouter;
            router.add({ path: "/item/:name" });

            let request = router.getRequest();
            expect(request).toBeTruthy();
            expect(request && request.params.name).toBe("first");

            // Navigate to a new item
            router.navigate("/item/second");
            await wait(10);

            request = router.getRequest();
            expect(request).toBeTruthy();
            expect(request && request.params.name).toBe("second");
        });

        it("should call route change listeners on navigate", async () => {
            const { router: testRouter } = createTestRouter("/page/a");
            router = testRouter;
            router.add({ path: "/page/:id" });

            const navigations: Array<{ from: string; to: string }> = [];

            router.onRouteChange((newRoute, oldRoute) => {
                navigations.push({ from: oldRoute, to: newRoute });
            });

            router.navigate("/page/b");
            await wait(10);

            router.navigate("/page/c");
            await wait(10);

            expect(navigations).toHaveLength(2);
            expect(navigations[0]).toEqual({ from: "/page/a", to: "/page/b" });
            expect(navigations[1]).toEqual({ from: "/page/b", to: "/page/c" });
        });

        it("should update content when navigating between routes", async () => {
            const { router: testRouter } = createTestRouter("/tab/home");
            router = testRouter;
            router.add({ path: "/tab/:name" });

            const containerRef = createRef<HTMLDivElement>();

            const TabContent = ({ router }: { router: Router }) => {
                const request = router.getRequest();
                const tabName = request ? request.params.name : "unknown";
                return <div class="tab-content">Current tab: {tabName}</div>;
            };

            await $(container).jsx(<div ref={containerRef}><TabContent router={router} /></div>);
            expect(container.querySelector(".tab-content")?.textContent).toBe("Current tab: home");

            // Navigate to settings tab
            router.navigate("/tab/settings");
            await wait(10);
            await $(containerRef).jsx(<TabContent router={router} />);
            expect(container.querySelector(".tab-content")?.textContent).toBe("Current tab: settings");

            // Navigate to profile tab
            router.navigate("/tab/profile");
            await wait(10);
            await $(containerRef).jsx(<TabContent router={router} />);
            expect(container.querySelector(".tab-content")?.textContent).toBe("Current tab: profile");
        });
    });

    describe("RouterSlot Integration", () => {
        it("should integrate with RouterSlot for slot-refresh strategy", async () => {
            const { router: testRouter, mockWindow } = createTestRouter("/dashboard");
            router = testRouter;
            router.add({ path: "/dashboard" });
            router.add({ path: "/settings" });

            let dashboardRenderCount = 0;
            let settingsRenderCount = 0;

            const Dashboard = () => {
                dashboardRenderCount++;
                return <div class="dashboard-page">Dashboard Content</div>;
            };

            const Settings = () => {
                settingsRenderCount++;
                return <div class="settings-page">Settings Content</div>;
            };

            const RouterOutlet = () => {
                const request = router.getRequest();
                if (!request) return <div>No route matched</div>;

                if (request.url === "/dashboard") return <Dashboard />;
                if (request.url === "/settings") return <Settings />;
                return <div>Unknown route {request.url}</div>;
            };

            await $(container).jsx(
                <RouterSlot
                    router={router}
                    RouterOutlet={RouterOutlet}
                    id="test-router-slot"
                />
            );

            expect(container.querySelector(".dashboard-page")).toBeTruthy();
            expect(dashboardRenderCount).toBe(1);

            // Navigate to settings
            router.navigate("/settings");
            await wait(100); // Allow transition

            expect(container.querySelector(".settings-page")).toBeTruthy();
            expect(settingsRenderCount).toBe(1);
        });
    });

    describe("Route Component Integration", () => {
        it("should render Route component for matching paths", async () => {
            const { router: testRouter } = createTestRouter("/users");
            router = testRouter;
            router.add({ path: "/users" });
            router.add({ path: "/about" });

            const UsersPage = () => <div class="users-page">Users List</div>;
            const AboutPage = () => <div class="about-page">About Us</div>;

            const App = () => (
                <div>
                    <Route path="/users" router={router}>
                        <UsersPage />
                    </Route>
                    <Route path="/about" router={router}>
                        <AboutPage />
                    </Route>
                </div>
            );

            await $(container).jsx(<App />);

            // Users route matches, about does not
            expect(container.querySelector(".users-page")).toBeTruthy();
            expect(container.querySelector(".about-page")).toBeFalsy();
        });

        it("should show different Route content after navigation", async () => {
            const { router: testRouter } = createTestRouter("/home");
            router = testRouter;
            router.add({ path: "/home" });
            router.add({ path: "/contact" });

            const containerRef = createRef<HTMLDivElement>();

            const HomePage = () => <div class="home-page">Welcome Home</div>;
            const ContactPage = () => <div class="contact-page">Contact Us</div>;

            const Routes = () => (
                <fragment>
                    <Route path="/home" router={router}>
                        <HomePage />
                    </Route>
                    <Route path="/contact" router={router}>
                        <ContactPage />
                    </Route>
                </fragment>
            );

            await $(container).jsx(<div ref={containerRef}><Routes /></div>);
            expect(container.querySelector(".home-page")).toBeTruthy();
            expect(container.querySelector(".contact-page")).toBeFalsy();

            // Navigate to contact
            router.navigate("/contact");
            await wait(10);
            await $(containerRef).jsx(<Routes />);

            expect(container.querySelector(".home-page")).toBeFalsy();
            expect(container.querySelector(".contact-page")).toBeTruthy();
        });
    });
});
