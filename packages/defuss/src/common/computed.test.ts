import { describe, it, expect, vi } from "vitest";
import { createStore } from "../store/store.js";
import { computed } from "./computed.js";

describe("computed", () => {
  it("calculates initial value from store", () => {
    const store = createStore({ count: 5 });
    const doubled = computed(store, (v) => v.count * 2);

    expect(doubled.value).toBe(10);
  });

  it("recalculates when dependency store changes", () => {
    const store = createStore({ count: 5 });
    const doubled = computed(store, (v) => v.count * 2);

    expect(doubled.value).toBe(10);

    store.set({ count: 7 });
    expect(doubled.value).toBe(14);
  });

  it("works with multiple stores", () => {
    const a = createStore({ value: 3 });
    const b = createStore({ value: 4 });
    const sum = computed([a, b], (av, bv) => av.value + bv.value);

    expect(sum.value).toBe(7);

    a.set({ value: 10 });
    expect(sum.value).toBe(14);

    b.set({ value: 20 });
    expect(sum.value).toBe(30);
  });

  it("notifies subscribers when value changes", () => {
    const store = createStore({ count: 1 });
    const doubled = computed(store, (v) => v.count * 2);
    const listener = vi.fn();

    doubled.subscribe(listener);

    store.set({ count: 5 });
    expect(listener).toHaveBeenCalledWith(10, 2);

    store.set({ count: 3 });
    expect(listener).toHaveBeenCalledWith(6, 10);
  });

  it("does not notify when value is unchanged", () => {
    const store = createStore({ count: 1, label: "a" });
    const countDoubled = computed(store, (v) => v.count * 2);
    const listener = vi.fn();

    countDoubled.subscribe(listener);

    // Changing label should not affect countDoubled
    store.set({ count: 1, label: "b" });
    expect(listener).not.toHaveBeenCalled();
  });

  it("throws on set", () => {
    const store = createStore({ count: 1 });
    const doubled = computed(store, (v) => v.count * 2);

    expect(() => doubled.set(99)).toThrow("read-only");
    expect(() => doubled.setRaw(99)).toThrow("read-only");
  });

  it("unsubscribe works", () => {
    const store = createStore({ count: 1 });
    const doubled = computed(store, (v) => v.count * 2);
    const listener = vi.fn();

    const unsub = doubled.subscribe(listener);
    store.set({ count: 5 });
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();
    store.set({ count: 10 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
