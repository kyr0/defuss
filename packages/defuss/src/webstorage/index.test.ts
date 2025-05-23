/**
 * @vitest-environment happy-dom
 */
import { webstorage } from "./index.js";
import { isServer } from "./runtime.js";
describe("WebStorage exports", () => {
  it("should export webstorage", () => {
    expect(webstorage).toBeDefined();
  });

  it("should export WebStorage with correct type", () => {
    expect(webstorage).toBeInstanceOf(Function);
  });

  it("re-import dynamically with mock and test server export", async () => {
    // mock isServer
    vi.mock("./runtime.js", () => ({
      isServer: vi.fn(() => true),
    }));
    // re-import webstorage
    const { webstorage: webstorageServer } = await import("./index.js");
    expect(webstorageServer).toBeDefined();
    expect(webstorageServer).toBeInstanceOf(Function);
    expect(isServer()).toBe(true);
  });
});
