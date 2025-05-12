// @vitest-environment happy-dom
import { $ } from "./dequery.js";

describe("Filter method", () => {
  beforeEach(() => {
    // Reset the body and create test DOM structure
    document.body.innerHTML = `
      <div class="container">
        <div class="item active" data-type="a">Item 1</div>
        <div class="item" data-type="b">Item 2</div>
        <div class="item active special" data-type="c">Item 3</div>
        <div class="item" data-type="a">Item 4</div>
        <div class="special" data-type="d">Not an item</div>
      </div>
    `;
  });

  it("can filter elements by class", async () => {
    const activeItems = await $<HTMLElement>(".item").filter(".active");

    expect(activeItems.length).toBe(2);
    expect(activeItems[0].textContent).toBe("Item 1");
    expect(activeItems[1].textContent).toBe("Item 3");
  });

  it("can filter elements by attribute", async () => {
    const typeAItems = await $<HTMLElement>(".item").filter('[data-type="a"]');

    expect(typeAItems.length).toBe(2);
    expect(typeAItems[0].textContent).toBe("Item 1");
    expect(typeAItems[1].textContent).toBe("Item 4");
  });

  it("can filter with compound selector", async () => {
    const specialActiveItems =
      await $<HTMLElement>(".item").filter(".active.special");

    expect(specialActiveItems.length).toBe(1);
    expect(specialActiveItems[0].textContent).toBe("Item 3");
  });

  it("returns empty set when no elements match filter", async () => {
    const nonExistent = await $<HTMLElement>(".item").filter(".non-existent");

    expect(nonExistent.length).toBe(0);
    expect(nonExistent.length).toBe(0);
  });

  it("can chain filter calls", async () => {
    const result = await $<HTMLElement>(".item")
      .filter(".active")
      .filter('[data-type="c"]');

    expect(result.length).toBe(1);
    expect(result[0].textContent).toBe("Item 3");
  });
});

describe("Prop method", () => {
  beforeEach(() => {
    // Reset the body and create test DOM structure
    document.body.innerHTML = `
      <div class="container">
        <input type="text" id="text-input" value="Hello">
        <input type="checkbox" id="check-input" checked>
        <button id="button" disabled>Click me</button>
        <a id="link" href="https://example.com" tabIndex="1">Example</a>
      </div>
    `;
  });

  it("can get property value", async () => {
    const value = await $("#text-input").prop("value");
    expect(value).toBe("Hello");
  });

  it("can set property value", async () => {
    await $("#text-input").prop("value", "Updated");

    const input = document.getElementById("text-input") as HTMLInputElement;
    expect(input.value).toBe("Updated");
  });

  it("can get boolean property value", async () => {
    const checked = await $("#check-input").prop("checked");
    expect(checked).toBe(true);

    const disabled = await $("#button").prop("disabled");
    expect(disabled).toBe(true);
  });

  it("can set boolean property value", async () => {
    await $("#check-input").prop("checked", false);
    await $("#button").prop("disabled", false);

    const checkbox = document.getElementById("check-input") as HTMLInputElement;
    expect(checkbox.checked).toBe(false);

    const button = document.getElementById("button") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
  });

  it("can get numeric property value", async () => {
    const tabIndex = await $("#link").prop("tabIndex");
    expect(tabIndex).toBe(1);
  });

  it("can set numeric property value", async () => {
    await $("#link").prop("tabIndex", 2);

    const link = document.getElementById("link") as HTMLAnchorElement;
    expect(link.tabIndex).toBe(2);
  });
});
