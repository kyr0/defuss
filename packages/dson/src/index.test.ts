/**
 * @vitest-environment happy-dom
 */
import { DSON } from "./index.js";
describe("DSON exports", () => {
  it("should export DSON", () => {
    expect(DSON).toBeDefined();
    expect(DSON.clone).toBeInstanceOf(Function);
    expect(DSON.parse).toBeInstanceOf(Function);
    expect(DSON.stringify).toBeInstanceOf(Function);
    expect(DSON.isEqual).toBeInstanceOf(Function);
  });
});
