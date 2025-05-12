// @vitest-environment happy-dom
import { $ } from "./dequery.js";

describe("CSS styling methods", () => {
  beforeEach(() => {
    // Reset the body and create test elements
    document.body.innerHTML = "";

    // Create a test div
    const div = document.createElement("div");
    div.id = "style-element";
    document.body.appendChild(div);
  });

  it("can set a single CSS property", async () => {
    await $("#style-element").css("color", "red");
    const element = document.getElementById("style-element") as HTMLElement;

    expect(element.style.color).toBe("red");
  });

  it("can get a CSS property value", async () => {
    const element = document.getElementById("style-element") as HTMLElement;
    element.style.fontSize = "16px";

    const fontSize = await $("#style-element").css("font-size");
    expect(fontSize).toBe("16px");
  });

  it("can set multiple CSS properties at once", async () => {
    await $("#style-element").css({
      backgroundColor: "blue",
      padding: "10px",
      borderRadius: "5px",
    });

    const element = document.getElementById("style-element") as HTMLElement;
    expect(element.style.backgroundColor).toBe("blue");
    expect(element.style.padding).toBe("10px");
    expect(element.style.borderRadius).toBe("5px");
  });

  it("can animate a class by adding and removing it after a delay", async () => {
    vi.useFakeTimers();

    await $("#style-element").animateClass("animated-class", 500);

    const element = document.getElementById("style-element") as HTMLElement;
    expect(element.classList.contains("animated-class")).toBe(true);

    vi.advanceTimersByTime(400);
    expect(element.classList.contains("animated-class")).toBe(true);

    vi.advanceTimersByTime(200);
    expect(element.classList.contains("animated-class")).toBe(false);

    vi.useRealTimers();
  });
});
