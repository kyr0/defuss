// @vitest-environment happy-dom
import type { NodeType } from "../render/index.js";
import {
  CallChainImpl,
  CallChainImplThenable,
  createCall,
  dequery,
  type Dequery,
} from "./dequery.js";

describe("extend() static method test with typing", () => {
  it("can extend the dequery API", async () => {
    let didCall;

    class DequeryWithFoo<NT> extends CallChainImpl<
      NT,
      DequeryWithFoo<NT> & Dequery<NT>
    > {
      foo(bar: number): DequeryWithFoo<NT> & Dequery<NT> {
        return createCall(this, "foo", async () => {
          didCall = bar;
          return this.nodes as NT;
        }) as unknown as DequeryWithFoo<NT> & Dequery<NT>;
      }
    }

    const $ = dequery.extend(DequeryWithFoo);

    const instance = await $(document.body)
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
