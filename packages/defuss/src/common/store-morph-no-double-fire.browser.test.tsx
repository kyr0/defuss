/**
 * Playwright browser test: store-driven morph does NOT double-fire events.
 *
 * This test validates ARCH.md §10 ("The Double-Fire Problem") by creating
 * the exact scenario described: a click handler mutates a store, the store
 * subscriber morphs the DOM (updating attributes on the clicked element),
 * and we verify the handler fires exactly once per click.
 *
 * If the browser were to re-dispatch the click event due to attribute
 * mutation during the morph, the handler would fire twice and the test
 * would fail. This test proves the claim is either not a real browser
 * behavior, or that defuss' architecture already prevents it.
 *
 * Runs in real Chromium via Playwright (vitest browser mode).
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderSync } from "../render/client.js";
import { updateDomWithVdom } from "../common/dom.js";
import { createStore } from "../store/store.js";

let container: HTMLDivElement;

afterEach(() => {
  if (container) {
    container.remove();
  }
});

describe("Store-driven morph: no double-fire (Browser / Playwright)", () => {
  it("click → store.set → morph (attribute change) fires handler exactly once", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const store = createStore({ count: 0 });
    let handlerFireCount = 0;
    const timestamps: number[] = [];

    // Component: a button that shows the count and has aria-pressed toggled by morph
    const CounterButton = () => (
      <button
        type="button"
        id="counter-btn"
        aria-pressed={String(store.value.count % 2 === 1)}
        data-count={String(store.value.count)}
        onClick={(e: MouseEvent) => {
          handlerFireCount++;
          timestamps.push(e.timeStamp);
          // Mutate store - this triggers the subscriber below
          store.set({ count: store.value.count + 1 });
        }}
      >
        Count: {String(store.value.count)}
      </button>
    );

    // Initial render
    renderSync(<CounterButton />, container);

    // Store subscriber morphs the DOM on every state change (ARCH.md §9.6 pattern)
    store.subscribe(() => {
      updateDomWithVdom(container, <CounterButton />, globalThis as any);
    });

    // Click the button - this should fire the handler exactly once,
    // even though the morph updates aria-pressed on the clicked element
    const btn = container.querySelector("#counter-btn") as HTMLButtonElement;
    expect(btn).toBeTruthy();

    btn.click();

    expect(handlerFireCount).toBe(1);
    expect(store.value.count).toBe(1);
    expect(btn.getAttribute("aria-pressed")).toBe("true");
    expect(btn.getAttribute("data-count")).toBe("1");
  });

  it("multiple sequential clicks each fire handler exactly once", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const store = createStore({ count: 0 });
    let handlerFireCount = 0;

    const CounterButton = () => (
      <button
        type="button"
        id="multi-btn"
        aria-pressed={String(store.value.count % 2 === 1)}
        data-count={String(store.value.count)}
        onClick={() => {
          handlerFireCount++;
          store.set({ count: store.value.count + 1 });
        }}
      >
        Count: {String(store.value.count)}
      </button>
    );

    renderSync(<CounterButton />, container);
    store.subscribe(() => {
      updateDomWithVdom(container, <CounterButton />, globalThis as any);
    });

    const btn = container.querySelector("#multi-btn") as HTMLButtonElement;

    for (let i = 0; i < 5; i++) {
      btn.click();
    }

    expect(handlerFireCount).toBe(5);
    expect(store.value.count).toBe(5);
  });

  it("morph that changes class, textContent, and aria-* does not re-dispatch", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const store = createStore({ active: false });
    let handlerFireCount = 0;

    const ToggleButton = () => (
      <button
        type="button"
        id="toggle-btn"
        class={store.value.active ? "btn active" : "btn"}
        aria-expanded={String(store.value.active)}
        onClick={() => {
          handlerFireCount++;
          store.set({ active: !store.value.active });
        }}
      >
        {store.value.active ? "Collapse" : "Expand"}
      </button>
    );

    renderSync(<ToggleButton />, container);
    store.subscribe(() => {
      updateDomWithVdom(container, <ToggleButton />, globalThis as any);
    });

    const btn = container.querySelector("#toggle-btn") as HTMLButtonElement;

    btn.click();
    expect(handlerFireCount).toBe(1);
    expect(store.value.active).toBe(true);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.classList.contains("active")).toBe(true);

    // Click again - toggle back
    btn.click();
    expect(handlerFireCount).toBe(2);
    expect(store.value.active).toBe(false);
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.classList.contains("active")).toBe(false);
  });

  it("tree view scenario: nested rows with data attributes morphed mid-click", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const store = createStore({ expandedIds: [] as number[] });
    let handlerFireCount = 0;

    const toggleExpand = (id: number) => {
      const expanded = store.value.expandedIds;
      if (expanded.includes(id)) {
        store.set({ expandedIds: expanded.filter((x) => x !== id) });
      } else {
        store.set({ expandedIds: [...expanded, id] });
      }
    };

    const TreeView = () => (
      <div id="tree">
        {[1, 2, 3].map((id) => {
          const isExpanded = store.value.expandedIds.includes(id);
          return (
            <div
              key={String(id)}
              class="tree-row"
              data-node-id={String(id)}
              aria-expanded={String(isExpanded)}
              onClick={() => {
                handlerFireCount++;
                toggleExpand(id);
              }}
            >
              Node {String(id)} {isExpanded ? "(open)" : "(closed)"}
            </div>
          );
        })}
      </div>
    );

    renderSync(<TreeView />, container);
    store.subscribe(() => {
      updateDomWithVdom(container, <TreeView />, globalThis as any);
    });

    // Click first row
    const row1 = container.querySelector('[data-node-id="1"]') as HTMLElement;
    row1.click();

    // The ARCH.md §10.1 scenario: if double-fire happened, the toggle would
    // cancel itself out (expanded → collapsed) and handlerFireCount would be 2.
    expect(handlerFireCount).toBe(1);
    expect(store.value.expandedIds).toEqual([1]);
    expect(row1.getAttribute("aria-expanded")).toBe("true");

    // Click again to collapse - must also fire exactly once
    row1.click();
    expect(handlerFireCount).toBe(2);
    expect(store.value.expandedIds).toEqual([]);
    expect(row1.getAttribute("aria-expanded")).toBe("false");
  });

  it("handler receives exactly one event object per click (no echo events)", () => {
    container = document.createElement("div");
    document.body.appendChild(container);

    const store = createStore({ count: 0 });
    const events: Event[] = [];

    const Button = () => (
      <button
        id="echo-btn"
        type="button"
        data-count={String(store.value.count)}
        onClick={(e: MouseEvent) => {
          events.push(e);
          store.set({ count: store.value.count + 1 });
        }}
      >
        Click
      </button>
    );

    renderSync(<Button />, container);
    store.subscribe(() => {
      updateDomWithVdom(container, <Button />, globalThis as any);
    });

    const btn = container.querySelector("#echo-btn") as HTMLButtonElement;

    btn.click();
    btn.click();
    btn.click();

    // Each click should produce exactly one handler invocation - no echoes
    expect(events).toHaveLength(3);
    expect(store.value.count).toBe(3);
  });
});
