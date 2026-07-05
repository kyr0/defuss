/**
 * @vitest-environment happy-dom
 */
/**
 * Unit tests for reactive() function.
 * Tests core subscription, render, cleanup, and multi-store behavior
 * using real Store and dequery implementations (no mocks).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { reactive, type ReactiveConfig } from "./reactive.js";
import { createStore } from "../store/store.js";
import { createRef } from "../render/ref.js";
import { dequery as $ } from "../dequery/dequery.js";
import { jsx } from "../render/isomorph.js";

describe("reactive()", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    container.id = "reactive-test-container";
    document.body.appendChild(container);
  });

  it("should render initial content into target", () => {
    const store = createStore({ count: 42 });
    const ref = createRef<HTMLDivElement>();

    // Pre-mount an empty div so the ref has a target
    $(container).jsx(<div ref={ref} />);

    reactive({
      store,
      render: () => <span>{store.value.count}</span>,
    }, ref);

    expect(ref.current?.textContent).toBe("42");
  });

  it("should re-render when store changes", () => {
    const store = createStore({ count: 0 });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    reactive({
      store,
      render: () => <span>{store.value.count}</span>,
    }, ref);

    expect(ref.current?.textContent).toBe("0");

    // Mutate store to trigger re-render
    store.set({ count: 5 });

    expect(ref.current?.textContent).toBe("5");
  });

  it("should return a cleanup function that unsubscribes", () => {
    const store = createStore({ count: 0 });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    const cleanup = reactive({
      store,
      render: () => <span>{store.value.count}</span>,
    }, ref);

    expect(ref.current?.textContent).toBe("0");

    // Unsubscribe
    cleanup();

    // Store change should NOT trigger re-render
    store.set({ count: 100 });

    expect(ref.current?.textContent).toBe("0");
  });

  it("should invoke cleanup callback on cleanup", () => {
    const store = createStore({ count: 0 });
    const ref = createRef<HTMLDivElement>();
    const cleanupSpy = vi.fn();

    $(container).jsx(<div ref={ref} />);

    const cleanup = reactive({
      store,
      render: () => <span>{store.value.count}</span>,
      cleanup: cleanupSpy,
    }, ref);

    cleanup();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("should subscribe to multiple stores", () => {
    const storeA = createStore({ a: 0 });
    const storeB = createStore({ b: 0 });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    reactive({
      store: [storeA, storeB],
      render: () => <span>{storeA.value.a}-{storeB.value.b}</span>,
    }, ref);

    expect(ref.current?.textContent).toBe("0-0");

    // Change store A
    storeA.set({ a: 1 });
    expect(ref.current?.textContent).toBe("1-0");

    // Change store B
    storeB.set({ b: 2 });
    expect(ref.current?.textContent).toBe("1-2");
  });

  it("should unsubscribe from all stores on cleanup", () => {
    const storeA = createStore({ a: 0 });
    const storeB = createStore({ b: 0 });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    const cleanup = reactive({
      store: [storeA, storeB],
      render: () => <span>{storeA.value.a}-{storeB.value.b}</span>,
    }, ref);

    cleanup();

    // Neither store change should trigger re-render
    storeA.set({ a: 99 });
    storeB.set({ b: 88 });

    expect(ref.current?.textContent).toBe("0-0");
  });

  it("should accept a raw HTMLElement as target", () => {
    const store = createStore({ msg: "hello" });
    const target = document.createElement("div");
    container.appendChild(target);

    reactive({
      store,
      render: () => <span>{store.value.msg}</span>,
    }, target);

    expect(target.textContent).toBe("hello");

    store.set({ msg: "world" });
    expect(target.textContent).toBe("world");
  });

  it("should render complex JSX structures", () => {
    const store = createStore({ items: [1, 2, 3] });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    reactive({
      store,
      render: () => (
        <ul>
          {store.value.items.map((item) => (
            <li key={item}>Item {item}</li>
          ))}
        </ul>
      ),
    }, ref);

    const lis = ref.current?.querySelectorAll("li");
    expect(lis?.length).toBe(3);
    expect(lis?.[0]?.textContent).toBe("Item 1");
    expect(lis?.[1]?.textContent).toBe("Item 2");
    expect(lis?.[2]?.textContent).toBe("Item 3");
  });

  it("should re-render complex structures on store change", () => {
    const store = createStore({ items: [1, 2] });
    const ref = createRef<HTMLDivElement>();

    $(container).jsx(<div ref={ref} />);

    reactive({
      store,
      render: () => (
        <ul>
          {store.value.items.map((item) => (
            <li key={item}>Item {item}</li>
          ))}
        </ul>
      ),
    }, ref);

    expect(ref.current?.querySelectorAll("li").length).toBe(2);

    store.set({ items: [1, 2, 3, 4] });

    expect(ref.current?.querySelectorAll("li").length).toBe(4);
  });
});
