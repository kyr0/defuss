/**
 * @vitest-environment happy-dom
 */
import { createStore } from "./index.js";
describe("Store exports", () => {
  it("should export createStore", () => {
    expect(createStore).toBeDefined();
  });

  it("should export createStore with correct type", () => {
    expect(createStore).toBeDefined();
    expect(createStore).toBeInstanceOf(Function);
  });
});
