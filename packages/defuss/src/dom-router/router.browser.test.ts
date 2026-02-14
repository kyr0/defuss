import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setupRouter } from "./router.js";
import type { Router } from "./router.js";

// This test suite runs in a real browser (headless Chrome) via Vitest Browser Mode
describe("DOM Router Browser Integration", () => {
    let router: Router;

    beforeEach(() => {
        // In browser tests, we use the real window
        // We use slot-refresh to test history API integration
        router = setupRouter({ strategy: "slot-refresh" });
    });

    afterEach(() => {
        if (router.destroy) router.destroy();
        // Reset URL to clean state
        window.history.pushState({}, "", "/");
    });

    it("should match dynamic parameters in real browser environment", async () => {
        router.add({ path: "/components/:name" });

        // Navigate
        router.navigate("/components/lala");

        // Wait for microtask (router uses queueMicrotask/setTimeout for async updates)
        await new Promise(resolve => setTimeout(resolve, 10));

        // Check match - now always returns object
        const req = router.getRequest();

        expect(req.match).toBe(true);
        expect(req.matchedRoute).toBe("/components/:name");
        expect(req.path).toBe("/components/lala");
        expect(req.params).toEqual({ name: "lala" });
    });

    it("should extract query and hash params", async () => {
        router.add({ path: "/search" });

        // Navigate with query and hash
        router.navigate("/search?q=test&page=1#sort=desc");

        await new Promise(resolve => setTimeout(resolve, 10));

        const req = router.getRequest();

        expect(req.match).toBe(true);
        expect(req.queryParams).toEqual({ q: "test", page: "1" });
        expect(req.hashParams).toEqual({ sort: "desc" });
    });

    it("should populate URL fields correctly", async () => {
        router.add({ path: "/" });
        router.navigate("/");

        await new Promise(resolve => setTimeout(resolve, 10));

        const req = router.getRequest();

        // Protocol should be http or https
        expect(["http", "https"]).toContain(req.protocol);
        expect(req.domain).toBe("localhost");
        expect(req.port).toBeTruthy(); // Should have a port in dev
        expect(req.baseUrl).toMatch(/^https?:\/\/localhost:\d+$/);
        expect(req.path).toBe("/");
        expect(req.url).toMatch(/^https?:\/\/localhost:\d+\/$/);
    });

    it("should match deep paths with wildcards", async () => {
        router.add({ path: "/files/*" });

        router.navigate("/files/images/logo.png");
        await new Promise(resolve => setTimeout(resolve, 10));

        const req = router.getRequest();

        expect(req.match).toBe(true);
        expect(req.params["wildcard"]).toBe("images/logo.png");
    });

    it("should handle mixed parameters and wildcards", async () => {
        router.add({ path: "/api/v:version/endpoints/*" });

        router.navigate("/api/v2/endpoints/users/123/profile");
        await new Promise(resolve => setTimeout(resolve, 10));

        const req = router.getRequest();

        expect(req.match).toBe(true);
        expect(req.params["version"]).toBe("2");
        expect(req.params["wildcard"]).toBe("users/123/profile");
    });

    it("should handle optional trailing slashes", async () => {
        router.add({ path: "/about/" });

        router.navigate("/about");
        await new Promise(resolve => setTimeout(resolve, 10));

        const reqWithNoSlash = router.getRequest();
        expect(reqWithNoSlash.match).toBe(true); // Should match despite missing slash

        router.navigate("/about/");
        await new Promise(resolve => setTimeout(resolve, 10));

        const reqWithSlash = router.getRequest();
        expect(reqWithSlash.match).toBe(true);
    });

    it("should return match: false when no route matches but still have URL info", async () => {
        router.add({ path: "/other" });

        router.navigate("/unknown-path");
        await new Promise(resolve => setTimeout(resolve, 10));

        const req = router.getRequest();

        expect(req.match).toBe(false);
        expect(req.matchedRoute).toBeNull();
        expect(req.path).toBe("/unknown-path");
        // URL info should still be populated
        expect(req.protocol).toBeTruthy();
        expect(req.domain).toBe("localhost");
    });
});
