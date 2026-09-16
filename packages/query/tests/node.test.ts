import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import * as morph from "defuss-morph";
import df$, { createDf$, installGlobal, DfQuery } from "../dist/index.js";

const require = createRequire(import.meta.url);

describe("defuss-query node API", () => {
  it("ESM import is safe without a DOM and has no global side effect", () => {
    expect(typeof document).toBe("undefined");
    expect((globalThis as any).df$).toBeUndefined();
    expect(typeof df$).toBe("function");
    expect(df$.morph).toBe(morph.morph);
    expect(df$.getRenderer).toBe(morph.getRenderer);
    expect(df$().length).toBe(0);
  });

  it("CJS import is safe without a DOM", () => {
    const cjs = require("../dist/cjs/index.js");
    expect(typeof cjs.df$).toBe("function");
    expect(cjs.df$().length).toBe(0);
    expect((globalThis as any).df$).toBeUndefined();
  });

  it("real Array semantics and stable selection snapshots", () => {
    const a = new EventTarget(),
      b = new EventTarget();
    const q = df$([a, b, a]);
    expect(q).toBeInstanceOf(Array);
    expect(q).toBeInstanceOf(DfQuery);
    expect(q.length).toBe(2);
    expect(q[1]).toBe(b);
    expect(q.map((_: any, i: number) => i)).toEqual([0, 1]);
    expect(q.map((x: any) => x).constructor).toBe(Array);
    expect(q.slice().constructor).toBe(Array);
    expect(q.find((x: any) => x === b)).toBe(b);
    expect(q.filter((x: any) => x === a)[0]).toBe(a);
    expect(q.length).toBe(2);
    expect(q.eq(-1)[0]).toBe(b);
    expect(q.eq(8).length).toBe(0);
    expect(q.get()).toEqual([a, b]);
  });

  it("factory accepts large iterables without spread argument overflow", () => {
    const nodes = Array.from({ length: 150000 }, () => new EventTarget());
    expect(df$(nodes).length).toBe(nodes.length);
  });

  it("upgrade copies every morph export and preserves symbol/custom data", () => {
    const symbol = Symbol("plugin");
    const previous: any = { ...morph, custom: 17, [symbol]: "x" };
    const scope: any = { df$: previous };
    const next: any = installGlobal(scope);
    expect(scope.df$).toBe(next);
    expect(typeof next).toBe("function");
    expect(next.custom).toBe(17);
    expect(next[symbol]).toBe("x");
    for (const key of Object.keys(morph))
      expect(next[key]).toBe((morph as any)[key]);
    expect(installGlobal(scope)).toBe(next);
    expect(next.fn).toBe(DfQuery.prototype);
    expect(next).not.toBe(previous);
  });

  it("function intrinsic slots cannot be overwritten by a capability object", () => {
    const next: any = createDf$({
      ...morph,
      length: 99,
      name: "bad",
      prototype: null,
    } as any);
    expect(next.length).not.toBe(99);
    expect(next.name).not.toBe("bad");
    expect(typeof next).toBe("function");
  });

  it("unrelated callable and unwritable globals are rejected", () => {
    expect(() => installGlobal({ df$: () => {} } as any)).toThrow(/unrelated/);
    expect(() => installGlobal(Object.freeze({ df$: null }) as any)).toThrow(
      /not writable/,
    );
  });

  it("pending global can be hydrated by morph without replacing the function", () => {
    const scope: any = {};
    const next: any = installGlobal(scope);
    expect(next().length).toBe(0);
    Object.assign(next, morph);
    expect(next.morph).toBe(morph.morph);
  });

  it("native EventTargets support registration, multiple handlers and removal", () => {
    const target = new EventTarget();
    const q = df$(target);
    let n = 0;
    const one = () => n++;
    const two = () => (n += 10);
    q.on("x", one).on("x", one).on("x", two).trigger("x");
    expect(n).toBe(11);
    q.off("x", one).trigger("x");
    expect(n).toBe(21);
    q.off().trigger("x");
    expect(n).toBe(21);
  });

  it("partial APIs fail clearly rather than silently creating broken nodes", () => {
    expect(() => df$("input")).toThrow(/DOM document/);
    expect(() => df$({ wrong: true } as any)).toThrow(/expected/);
    expect(() => df$([{}] as any)).toThrow(/EventTargets/);
    expect(() => df$().form()).toThrow(/exactly one/);
  });
});
