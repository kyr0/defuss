import { describe, expect, it } from "vitest";
import { createDomAdapter, documentOf } from "../src/dom.js";

/**
 * No-DOM paths of the source modules (the node project runs without a
 * document; these import src directly so they feed src coverage).
 */
describe("dom adapter without a DOM", () => {
  it("documentOf requires a document or explicit context", () => {
    expect(() => documentOf(undefined)).toThrow(/DOM document/);
  });

  it("structural operations require morph to be loaded", () => {
    const adapter = createDomAdapter({} as any);
    expect(() => adapter.create("<b>x</b>", undefined as any)).toThrow(/load defuss-morph/);
  });
});
