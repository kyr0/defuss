import { beforeEach, describe, expect, it } from "vitest";
import * as query from "../src/query.js";
import * as dom from "../src/dom.js";
import * as morph from "defuss-morph";

/**
 * Internal edge paths, run directly against the source modules: createDf$
 * slot protection, the installGlobal coexistence contract, and dom-adapter
 * calls that the chain API guards before they can happen.
 *
 * Static imports (not dynamic /@fs or root-URL imports) so the executed
 * modules are the coverage-instrumented graph instances.
 */

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("createDf$", () => {
  it("reserves function intrinsics and query slots when copying the API", () => {
    const df$ = query.createDf$({
      ...morph,
      name: "bad",
      length: 99,
      prototype: null,
      fn: 1,
      dom: 2,
      queryVersion: "x",
      custom: 42,
    });
    expect(df$.name).not.toBe("bad");
    expect(df$.length).not.toBe(99);
    expect(df$.fn).toBe(query.DfQuery.prototype);
    expect(df$.queryVersion).toBe(query.QUERY_VERSION);
    expect(typeof df$.dom.create).toBe("function");
    expect(df$.custom).toBe(42);
  });

  it("element on() requires the morph engine", () => {
    const bare = query.createDf$({} as any);
    expect(() => bare(document.createElement("b")).on("click", () => {})).toThrow(
      /load defuss-morph/,
    );
  });
});

describe("installGlobal", () => {
  it("reuses the branded installation on repeat entry", () => {
    const scope: any = {};
    const installed = query.installGlobal(scope);
    expect(scope.df$).toBe(installed);
    expect(query.installGlobal(scope)).toBe(installed);
  });

  it("refuses an unrelated callable and an unwritable global", () => {
    expect(() => query.installGlobal({ df$: () => {} })).toThrow(/unrelated/);
    expect(() => query.installGlobal(Object.freeze({ df$: null }))).toThrow(
      /not writable/,
    );
  });
});

describe("dom adapter direct calls", () => {
  it("create handles fragments, null, arrays, fragment VNodes and rejects non-intrinsic types", () => {
    const adapter = dom.createDomAdapter(morph);
    const fragment = document.createDocumentFragment();
    fragment.append(document.createElement("b"), document.createElement("i"));
    expect(adapter.create(fragment, document).length).toBe(2);
    expect(adapter.create(null, document)).toEqual([]);
    expect(
      adapter.create(
        [
          { type: "b", children: ["1"] },
          { type: "i", children: ["2"] },
        ],
        document,
      ).length,
    ).toBe(2);
    expect(
      (adapter.create({ type: "fragment", children: [{ type: "b", children: ["x"] }] }, document)[0] as Element)
        .localName,
    ).toBe("b");
    expect(() => adapter.create({ type: () => {} }, document)).toThrow(/intrinsic VNode/);
  });

  it("insert/replace on detached targets are harmless", () => {
    const adapter = dom.createDomAdapter(morph);
    const detached = document.createElement("div");
    expect(adapter.insert(detached, "<b>x</b>", "beforebegin")).toEqual([]);
    expect(adapter.replace(detached, "<i>x</i>")).toEqual([]);
  });

  it("moving a delegated node into a new root re-arms root listeners", () => {
    const adapter = dom.createDomAdapter(morph);
    const host = document.createElement("div");
    document.body.append(host);
    const shadow = host.attachShadow({ mode: "open" });
    const button = document.createElement("button");
    morph.registerDelegatedEvent(button, "custom", () => {}, { multi: true });
    adapter.insert(shadow, button, "beforeend");
    expect(button.getRootNode()).toBe(shadow);
    let count = 0;
    morph.registerDelegatedEvent(button, "rearm-test", () => count++, { multi: true });
    const moved = document.createElement("i");
    morph.registerDelegatedEvent(moved, "rearm-test", () => (count += 10), { multi: true });
    adapter.insert(shadow, moved, "beforeend");
    moved.dispatchEvent(new CustomEvent("rearm-test", { bubbles: true, composed: true }));
    expect(count).toBe(10);
  });
});
