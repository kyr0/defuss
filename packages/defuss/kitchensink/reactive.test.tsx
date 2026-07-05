/**
 * Kitchen Sink Test Suite - Reactive System Tests
 *
 * Integration tests for <Reactive /> component and $.reactive() method
 * using a real browser (Playwright/Chromium).
 *
 * Tests cover:
 * - <Reactive /> initial render and re-render on store change
 * - <Reactive /> custom wrapper tag
 * - <Reactive /> cleanup on unmount
 * - <Reactive /> with multiple stores
 * - $.reactive() basic render and re-render
 * - $.reactive() on multiple matched elements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { $, createRef, createStore, Reactive } from "@/index.js";
import { jsx } from "@/render/isomorph.js";
import { createContainer, cleanup, wait } from "./utils.js";

let container: HTMLDivElement;

beforeEach(() => {
  container = createContainer();
});

afterEach(() => {
  cleanup(container);
});

describe("Reactive System", () => {
  describe("<Reactive /> Component", () => {
    it("should render initial content", async () => {
      const store = createStore({ count: 0 });

      await $(container).jsx(
        <Reactive
          store={store}
          render={() => <span>Count: {store.value.count}</span>}
        />
      );

      const span = container.querySelector("span");
      expect(span?.textContent).toBe("Count: 0");
    });

    it("should re-render when store changes", async () => {
      const store = createStore({ count: 0 });

      await $(container).jsx(
        <Reactive
          store={store}
          render={() => (
            <div>
              <span class="count">{store.value.count}</span>
              <button
                type="button"
                class="increment"
                onClick={() => store.set({ count: store.value.count + 1 })}
              >
                +1
              </button>
            </div>
          )}
        />
      );

      expect(container.querySelector(".count")?.textContent).toBe("0");

      // Click the button to trigger store update
      const button = container.querySelector(".increment") as HTMLButtonElement;
      button.click();
      await wait(50);

      expect(container.querySelector(".count")?.textContent).toBe("1");

      button.click();
      button.click();
      await wait(50);

      expect(container.querySelector(".count")?.textContent).toBe("3");
    });

    it("should use custom wrapper tag", async () => {
      const store = createStore({ msg: "test" });
      const wrapperRef = createRef<HTMLElement>();

      await $(container).jsx(
        <Reactive
          tag="section"
          ref={wrapperRef}
          store={store}
          render={() => <p>{store.value.msg}</p>}
        />
      );

      // Verify the wrapper element is a section
      expect(wrapperRef.current?.tagName).toBe("SECTION");
      expect(wrapperRef.current?.querySelector("p")?.textContent).toBe("test");
    });

    it("should apply className to wrapper element", async () => {
      const store = createStore({ msg: "test" });

      await $(container).jsx(
        <Reactive
          className="my-reactive-block"
          store={store}
          render={() => <p>{store.value.msg}</p>}
        />
      );

      const wrapper = container.querySelector(".my-reactive-block");
      expect(wrapper).toBeTruthy();
    });

    it("should not crash when cleanup is not provided", async () => {
      const store = createStore({ count: 0 });

      // Should work without cleanup prop
      await $(container).jsx(
        <Reactive
          store={store}
          render={() => <span>{store.value.count}</span>}
        />
      );

      expect(container.querySelector("span")?.textContent).toBe("0");

      store.set({ count: 5 });
      await wait(50);

      expect(container.querySelector("span")?.textContent).toBe("5");
    });

    it("should subscribe to multiple stores", async () => {
      const storeA = createStore({ a: 0 });
      const storeB = createStore({ b: 0 });

      await $(container).jsx(
        <Reactive
          store={[storeA, storeB]}
          render={() => (
            <div>
              <span class="a">{storeA.value.a}</span>
              <span class="b">{storeB.value.b}</span>
            </div>
          )}
        />
      );

      expect(container.querySelector(".a")?.textContent).toBe("0");
      expect(container.querySelector(".b")?.textContent).toBe("0");

      // Change store A
      storeA.set({ a: 10 });
      await wait(50);
      expect(container.querySelector(".a")?.textContent).toBe("10");
      expect(container.querySelector(".b")?.textContent).toBe("0");

      // Change store B
      storeB.set({ b: 20 });
      await wait(50);
      expect(container.querySelector(".a")?.textContent).toBe("10");
      expect(container.querySelector(".b")?.textContent).toBe("20");
    });
  });

  describe("$.reactive() Method", () => {
    it("should render into selected element", async () => {
      const store = createStore({ value: "from-reactive" });

      await $(container).jsx(<div id="target" />);

      $("#target", container).reactive({
        store,
        render: () => <span>{store.value.value}</span>,
      });

      const span = container.querySelector("#target span");
      expect(span?.textContent).toBe("from-reactive");
    });

    it("should re-render when store changes", async () => {
      const store = createStore({ count: 0 });

      await $(container).jsx(<div id="target" />);

      $("#target", container).reactive({
        store,
        render: () => <span>{store.value.count}</span>,
      });

      expect(container.querySelector("#target span")?.textContent).toBe("0");

      store.set({ count: 42 });
      await wait(50);

      expect(container.querySelector("#target span")?.textContent).toBe("42");
    });

    it("should render into multiple matched elements", async () => {
      const store = createStore({ label: "A" });

      await $(container).jsx(
        <>
          <div class="target" />
          <div class="target" />
          <div class="target" />
        </>
      );

      $(".target", container).reactive({
        store,
        render: () => <span>{store.value.label}</span>,
      });

      const spans = container.querySelectorAll(".target span");
      expect(spans.length).toBe(3);
      expect(spans[0]?.textContent).toBe("A");
      expect(spans[1]?.textContent).toBe("A");
      expect(spans[2]?.textContent).toBe("A");

      // Update store — all elements should re-render
      store.set({ label: "B" });
      await wait(50);

      expect(spans[0]?.textContent).toBe("B");
      expect(spans[1]?.textContent).toBe("B");
      expect(spans[2]?.textContent).toBe("B");
    });
  });
});
