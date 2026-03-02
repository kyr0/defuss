// @vitest-environment happy-dom
import { CallChainImpl, dequery, type Dequery } from "./dequery.js";

describe("extend() static method test with typing", () => {
  it("can extend the dequery API", () => {
    let didCall: number | undefined;

    class DequeryWithFoo<NT> extends CallChainImpl<
      NT,
      DequeryWithFoo<NT> & Dequery<NT>
    > {
      foo(bar: number): this & Dequery<NT> {
        didCall = bar;
        return this as unknown as this & Dequery<NT>;
      }
    }

    const $ = dequery.extend(DequeryWithFoo);

    const instance = $(document.body)
      .foo(42)
      .addClass("foo")
      .foo(42)
      .addClass("bar");

    expect($).toBeInstanceOf(Function);
    expect(instance).toBeInstanceOf(Object);
    expect(instance).toHaveProperty("foo");
    expect(didCall).toBe(42);
  });
});
