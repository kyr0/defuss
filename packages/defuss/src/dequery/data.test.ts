// @vitest-environment happy-dom
import { $ } from "./dequery.js";

describe("Data methods", () => {
  beforeEach(() => {
    // Reset the body and create test elements
    document.body.innerHTML = "";

    // Create a test div with data attributes
    const div = document.createElement("div");
    div.id = "data-element";
    div.dataset.testValue = "initial-value";
    div.dataset.numericValue = "42";
    document.body.appendChild(div);
  });

  it("can get a data attribute value", async () => {
    const value = await $("#data-element").data("testValue");
    expect(value).toBe("initial-value");
  });

  it("can set a data attribute value", async () => {
    await $("#data-element").data("testValue", "updated-value");

    const element = document.getElementById("data-element") as HTMLElement;
    expect(element.dataset.testValue).toBe("updated-value");
  });

  it("can set a new data attribute", async () => {
    await $("#data-element").data("newAttribute", "new-value");

    const element = document.getElementById("data-element") as HTMLElement;
    expect(element.dataset.newAttribute).toBe("new-value");
  });

  it("returns undefined for non-existent data attribute", async () => {
    const value = await $("#data-element").data("nonExistent");
    expect(value).toBeUndefined();
  });

  it("can update multiple elements with the same data attribute", async () => {
    // Add more elements
    const div1 = document.createElement("div");
    div1.className = "multi-data";
    document.body.appendChild(div1);

    const div2 = document.createElement("div");
    div2.className = "multi-data";
    document.body.appendChild(div2);

    // Set data attribute on all elements with class 'multi-data'
    await $(".multi-data").data("shared", "common-value");

    // Check that all elements received the data attribute
    const elements = document.querySelectorAll(
      ".multi-data",
    ) as NodeListOf<HTMLElement>;
    expect(elements.length).toBe(2);

    elements.forEach((element) => {
      expect(element.dataset.shared).toBe("common-value");
    });
  });
});
