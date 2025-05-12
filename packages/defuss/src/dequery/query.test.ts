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

  it("waits for delayed DOM elements to appear", async () => {
    // Set up a unique ID for our test element
    const testClass = "delayed-element-test";

    // Start a query for an element that doesn't exist yet
    const delayedElementPromise = $<HTMLElement>(`.${testClass}`);

    console.log("Creating selection element somewhere soon...");

    // Create the element after a short delay
    setTimeout(() => {
      console.log("Trigger create DOM element");
      const element = document.createElement("div");
      element.className = testClass;
      element.textContent = "I was created asynchronously";
      console.log("Created DOM element");
      document.body.appendChild(element);
    }, 5);

    console.log("Actually running the seleection (shall wait)...");

    // Wait for the element to be found
    const result = await delayedElementPromise;

    // Verify that the element was found
    expect(result.length).toBe(1);
    expect(result[0].textContent).toBe("I was created asynchronously");

    // Clean up
    document.body.removeChild(document.querySelector(`.${testClass}`)!);
  }, 1000); // Set timeout for the test to 1 second
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
    await $(".item").debug((elements) => {
      debugCalled = true;
      elementsInDebug = Array.isArray(elements) ? elements : [elements];
    });
    expect(debugCalled).toBe(true);
    expect(elementsInDebug.length).toBe(3);
  });
});
