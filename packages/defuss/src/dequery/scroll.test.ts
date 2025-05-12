import { $ } from "./dequery.js";
import { vi } from "vitest"; // Import vi for spying

// Remove mocks for scroll methods

describe("Scroll methods", () => {
  let scrollContainer: HTMLElement;

  beforeEach(() => {
    // Reset the body and create test elements
    document.body.innerHTML = "";

    // Create a scrollable container
    scrollContainer = document.createElement("div");
    scrollContainer.id = "scroll-container";
    scrollContainer.style.height = "200px";
    scrollContainer.style.width = "200px";
    scrollContainer.style.overflow = "auto";
    // Mock scroll methods directly on the instance for testing calls
    scrollContainer.scrollTo = vi.fn();
    scrollContainer.scrollBy = vi.fn();
    scrollContainer.scrollIntoView = vi.fn();

    // Add content that will make it scrollable
    const content = document.createElement("div");
    content.style.height = "1000px";
    content.style.width = "1000px";

    // Add a target element far down in the content
    const target = document.createElement("div");
    target.id = "scroll-target";
    target.style.position = "absolute";
    target.style.top = "500px";
    target.style.left = "500px";
    target.textContent = "Target Element";
    // Mock scrollIntoView on the target as well
    target.scrollIntoView = vi.fn();

    content.appendChild(target);
    scrollContainer.appendChild(content);
    document.body.appendChild(scrollContainer);

    // Ensure mocks are cleared if any were global (vi.clearAllMocks might not clear instance mocks)
    // vi.clearAllMocks(); // Keep if needed for other global mocks
    vi.mocked(scrollContainer.scrollTo).mockClear();
    vi.mocked(scrollContainer.scrollBy).mockClear();
    vi.mocked(target.scrollIntoView).mockClear();
  });

  it("can scroll to specific coordinates", async () => {
    // Spy on the actual element's method
    const scrollToSpy = vi.spyOn(scrollContainer, "scrollTo");
    await $("#scroll-container").scrollTo(100, 200);
    expect(scrollToSpy).toHaveBeenCalledWith(100, 200);
    scrollToSpy.mockRestore(); // Clean up spy
  });

  it("can scroll to with options object", async () => {
    const scrollToSpy = vi.spyOn(scrollContainer, "scrollTo");
    const options = {
      top: 150,
      left: 100,
      // behavior: 'smooth', // Smooth might be async, test immediate result
    };
    await $("#scroll-container").scrollTo(options);
    expect(scrollToSpy).toHaveBeenCalledWith(options);
    scrollToSpy.mockRestore();
  });

  it("can scroll by specific amount", async () => {
    const scrollBySpy = vi.spyOn(scrollContainer, "scrollBy");
    await $("#scroll-container").scrollBy(50, 75);
    expect(scrollBySpy).toHaveBeenCalledWith(50, 75);
    scrollBySpy.mockRestore();
  });

  it("can scroll by with options object", async () => {
    const scrollBySpy = vi.spyOn(scrollContainer, "scrollBy");
    const options = {
      top: 50,
      left: 50,
      // behavior: 'smooth',
    };
    await $("#scroll-container").scrollBy(options);
    expect(scrollBySpy).toHaveBeenCalledWith(options);
    scrollBySpy.mockRestore();
  });

  it("can scroll element into view", async () => {
    const targetElement = document.getElementById("scroll-target")!;
    const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");
    await $("#scroll-target").scrollIntoView();
    expect(scrollIntoViewSpy).toHaveBeenCalledWith(undefined); // Default argument
    scrollIntoViewSpy.mockRestore();
  });

  it("can scroll element into view with options", async () => {
    const targetElement = document.getElementById("scroll-target")!;
    const scrollIntoViewSpy = vi.spyOn(targetElement, "scrollIntoView");
    const options = {
      // behavior: "smooth",
      block: "center",
      inline: "center",
    } as ScrollIntoViewOptions;
    await $("#scroll-target").scrollIntoView(options);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith(options);
    scrollIntoViewSpy.mockRestore();
  });
});
