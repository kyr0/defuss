// @vitest-environment happy-dom
import { $ } from "./dequery.js";

describe("$", () => {
  it("is defined", async () => {
    expect($).toBeDefined();
  });

  it("implements all methods", async () => {
    expect($(document.body).attr).toBeInstanceOf(Function);
    expect($(document.body).val).toBeInstanceOf(Function);
    expect($(document.body).empty).toBeInstanceOf(Function);
    expect($(document.body).remove).toBeInstanceOf(Function);
    expect($(document.body).html).toBeInstanceOf(Function);
    expect($(document.body).addClass).toBeInstanceOf(Function);
    expect($(document.body).hasClass).toBeInstanceOf(Function);
    expect($(document.body).removeClass).toBeInstanceOf(Function);
    expect($(document.body).toggleClass).toBeInstanceOf(Function);
    expect($(document.body).replaceWith).toBeInstanceOf(Function);
    expect($(document.body).on).toBeInstanceOf(Function);
    expect($(document.body).off).toBeInstanceOf(Function);
  });

  it("filters elements correctly", async () => {
    // create a test container
    const container = document.createElement("div");
    container.innerHTML = `
      <div class="test"></div>
      <div class="test"></div>
      <div class="not-test"></div>
    `;
    document.body.appendChild(container);

    // use the filter method to select elements with class 'test'
    const filteredElements = await $(container).children().filter(".test");

    // check if the filter method returns the correct number of elements
    expect(filteredElements.length).toBe(2);

    // clean up
    document.body.removeChild(container);
  });

  it("returns empty set for non-existent elements (sync)", () => {
    // With sync API, querying non-existent elements returns empty immediately
    const result = $<HTMLElement>(".does-not-exist");
    expect(result.length).toBe(0);
  });

  it("finds elements that already exist in the DOM", () => {
    const element = document.createElement("div");
    element.className = "sync-test-element";
    element.textContent = "I exist already";
    document.body.appendChild(element);

    const result = $<HTMLElement>(".sync-test-element");
    expect(result.length).toBe(1);
    expect(result[0].textContent).toBe("I exist already");

    document.body.removeChild(element);
  });
});

describe("Traversal", () => {
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
    const items = await $("#container").find(".item");
    // Use items.elements.length instead of items.length
    expect(items.length).toBe(3);
  });

  it("gets the parent element", async () => {
    const parent = await $<HTMLElement>(".target").parent();
    // This already uses .elements, should be correct if await resolves properly
    expect(parent[0].id).toBe("container");
  });

  it("gets the next sibling element", async () => {
    const next = await $<HTMLElement>(".target").next();
    // This already uses .elements
    expect(next[0].textContent).toBe("3");
  });

  it("handles next() when there is no next sibling", async () => {
    const next = await $("#container").children().last().next();
    // Use next.length instead of next.elements.length
    expect(next.length).toBe(0);
  });

  it("gets the previous sibling element", async () => {
    const prev = await $<HTMLElement>(".target").prev();
    // This already uses .elements
    expect(prev[0].textContent).toBe("1");
  });

  it("handles prev() when there is no previous sibling", async () => {
    const prev = await $("#container").children().first().prev();
    // Use prev.length instead of prev.elements.length
    expect(prev.length).toBe(0);
  });

  it("gets the closest ancestor matching the selector", async () => {
    const closest = await $<HTMLElement>(".target").closest("div");
    expect(closest[0].id).toBe("container");
  });

  it("gets the first element in the selection", async () => {
    const first = await $<HTMLElement>(".item").first();
    expect(first.length).toBe(1);
    expect(first[0].textContent).toBe("1");
  });

  it("gets the last element in the selection", async () => {
    const last = await $<HTMLElement>(".item").last();
    expect(last.length).toBe(1);
    expect(last[0].textContent).toBe("3");
  });

  it("executes debug callback", async () => {
    let debugCalled = false;
    let elementsInDebug: any[] = [];
    const chain = await $<HTMLElement>(".item")
      .debug((chain) => {
        debugCalled = true;
        elementsInDebug = chain.nodes;
      })
      .html("Debugging");
    expect(debugCalled).toBe(true);
    expect(elementsInDebug.length).toBe(3);
    expect(elementsInDebug[0].textContent).toBe("Debugging");
    expect(chain[0].textContent).toBe("Debugging");
  });
});
