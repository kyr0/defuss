import { $ } from "./_dq_R1.js";

describe.skip("DQR12 Traversal", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <div id="container">
        <span class="item">1</span>
        <span class="item target">2</span>
        <span class="item">3</span>
        <p>Sibling paragraph</p>
      </div>
      <div id="empty-container"></div>
    `;

    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 10);
    });
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("finds elements within the current selection", async () => {
    const items = await $<HTMLElement>("#container").find(".item");
    expect(items[0].textContent).toBe("1");
    expect(items[1].textContent).toBe("2");
    expect(items[2].textContent).toBe("3");
    expect(items.length).toBe(3);

    for (const item of items) {
      expect(item).toBeInstanceOf(HTMLElement);
      expect(item.tagName).toBe("SPAN");
      expect(item.classList.contains("item")).toBe(true);
    }
  });

  it("finds elements within the current selection with empty container11", async () => {
    const sel = await $<HTMLElement>("#container").find(".item");
    const firstEl = await sel.getFirstElement();
    const firstEl2 = await sel.getFirstElement();

    expect(firstEl).toBeDefined();
    expect(firstEl?.textContent).toBe("1");

    expect(firstEl2).toBeDefined();
    expect(firstEl2?.textContent).toBe("1");
  });

  it("gets the parent element", async () => {
    const parent = await $<HTMLElement>(".target").parent();
    // This already uses .elements, should be correct if await resolves properly
    expect(parent[0].id).toBe("container");
  });

  it("gets the next sibling element", async () => {
    const next = await $<HTMLElement>(".target").next();

    await next.debug((result) => {
      console.log("DEBUG 1");
      expect(result.toString()).toBe('<span class="item">3</span>');
    });

    await next.debug((result) => {
      console.log("DEBUG 2");
      expect(result.toString()).toBe('<span class="item">3</span>');
    });

    await next.debug((result) => {
      console.log("DEBUG 3");
      expect(result.toString()).toBe('<span class="item">3</span>');
    });

    await next.debug((result) => {
      console.log("DEBUG 4");
      expect(result.toString()).toBe('<span class="item">3</span>');
    });

    await next.debug((result) => {
      console.log("DEBUG 5");
      expect(result.toString()).toBe('<span class="item">3</span>');
    });

    // This already uses .elements
    expect(next[0].textContent).toBe("3");
  });

  it("handles next() when there is no next sibling", async () => {
    const next = await $("#container").children().last().next();
    // Use next.elements.length instead of next.length
    expect(next.length).toBe(0);
  });

  it("gets the previous sibling element", async () => {
    const prev = await $<HTMLElement>(".target").prev();
    // This already uses .elements
    expect(prev[0].textContent).toBe("1");
  });

  it("handles prev() when there is no previous sibling", async () => {
    const prev = await $<HTMLElement>("#container").children().first().prev();
    // Use prev.elements.length instead of prev.length
    expect(prev.length).toBe(0);
  });

  it("gets the closest ancestor matching the selector", async () => {
    const closest = await $<HTMLElement>(".target").closest("div");
    // This already uses .elements
    expect(closest[0].id).toBe("container");
  });

  it("gets the first element in the selection", async () => {
    const first = await $<HTMLElement>(".item").first();
    // Use first.elements.length instead of first.length
    expect(first.length).toBe(1);
    // This already uses .elements
    expect(first[0].textContent).toBe("1");
  });

  it("gets the last element in the selection", async () => {
    const last = await $<HTMLElement>(".item").last();
    // Use last.elements.length instead of last.length
    expect(last.length).toBe(1);
    // This already uses .elements
    expect(last[0].textContent).toBe("3");
  });

  it("executes debug callback", async () => {
    let debugCalled = false;
    let elementsInDebug: any[] = [];
    await $(".item").debug((elements) => {
      debugCalled = true;
      elementsInDebug = Array.isArray(elements) ? elements : [elements];
    });
    expect(debugCalled).toBe(true);
    expect(elementsInDebug.length).toBe(3);
  });
});
