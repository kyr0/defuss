import { beforeEach, describe, expect, it } from "vitest";
import { MORPH_ALL_MIN, loadScript } from "./browser-utils";

/**
 * Load-order E2E: every supported way of combining the morph engine bundle
 * with the query browser entries, each starting from a pristine df$ global.
 */

const df = () => (window as any).df$;

beforeEach(() => {
  delete (window as any).df$;
  document.body.innerHTML = '<div id="app"></div>';
});

describe("load order", () => {
  it("morph → query upgrades the object and preserves morph identities", async () => {
    await loadScript(MORPH_ALL_MIN);
    const originalMorph = df().morph;

    await loadScript("/dist/all.min.js");

    expect(typeof df()).toBe("function");
    expect(df().morph).toBe(originalMorph);
    df()("#app").html("<b>ready</b>");
    expect(df()("#app").text()).toBe("ready");
  });

  it("query → morph hydrates the pending function without replacing it", async () => {
    await loadScript("/dist/all.min.js");

    const before = df();
    expect(before("#app").length).toBe(1);
    expect(() => before("#app").html("missing engine")).toThrow();

    await loadScript(MORPH_ALL_MIN);

    expect(df()).toBe(before);
    before("#app").html("<b>ready</b>");
    expect(before("#app").text()).toBe("ready");
  });

  it("duplicate query entries reuse the installed function", async () => {
    await loadScript(MORPH_ALL_MIN);
    await loadScript("/dist/all.min.js");
    const before = df();

    await loadScript("/dist/all.js");

    expect(df()).toBe(before);
    df()("#app").html("<b>ready</b>");
    expect(df()("#app").text()).toBe("ready");
  });

  it("classic script first, morph second", async () => {
    await loadScript("/dist/global.min.js", true);

    const before = df();
    expect(before("#app").length).toBe(1);
    expect(() => before("#app").html("missing engine")).toThrow();

    await loadScript(MORPH_ALL_MIN);

    expect(df()).toBe(before);
    before("#app").html("<b>ready</b>");
    expect(before("#app").text()).toBe("ready");
  });

  it("pure ESM library entry: no global side effects", async () => {
    // served through the vitest dev server, which resolves the defuss-morph
    // bare import to the workspace peer
    const indexUrl: string = "/dist/index.js";
    const mod: any = await import(/* @vite-ignore */ indexUrl);

    expect(typeof mod.df$).toBe("function");
    expect(df()).toBeUndefined();
    mod.df$("#app").html("<b>ready</b>");
    expect(mod.df$("#app").text()).toBe("ready");
  });

  it("pure ESM source entry: no global side effects", async () => {
    // same contract against src/index.ts — instrumented, feeds src coverage
    const srcUrl: string = "/src/index.ts";
    const mod: any = await import(/* @vite-ignore */ srcUrl);

    expect(typeof mod.df$).toBe("function");
    expect(df()).toBeUndefined();
    mod.df$("#app").html("<b>ready</b>");
    expect(mod.df$("#app").text()).toBe("ready");
  });
});
