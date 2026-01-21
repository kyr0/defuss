import { $ } from "./dequery.js";
import { vi } from "vitest"; // Import vi

// Remove mocks for scroll methods

describe("Traversal methods", () => {
  let scrollContainer: HTMLElement;
  let scrollTarget: HTMLElement;

  beforeEach(() => {
    // Reset the DOM
    document.body.innerHTML = "";

    // Create a test DOM structure
    document.body.innerHTML = `
      <div id="parent">
        <div class="first-child">First Child</div>
        <div class="middle-child">Middle Child</div>
        <div class="last-child">Last Child</div>
      </div>
      <div id="sibling">Sibling</div>
      
      <div id="nested-structure">
        <div class="level-1">
          <div class="level-2">
            <div class="target-element">Target</div>
          </div>
        </div>
      </div>
      
      <div id="scroll-container" style="height:200px;width:200px;overflow:auto;">
        <div style="height:1000px;width:1000px;">
          <div id="scroll-target" style="position:absolute;top:500px;left:500px;">Target Element</div>
        </div>
      </div>
    `;

    scrollContainer = document.getElementById("scroll-container")!;
    scrollTarget = document.getElementById("scroll-target")!;

    // Mock scroll methods for testing calls
    scrollContainer.scrollTo = vi.fn();
    scrollContainer.scrollBy = vi.fn();
    scrollTarget.scrollIntoView = vi.fn();

    // Ensure mocks are cleared if any were global
    // vi.clearAllMocks(); // Keep if needed for other global mocks
    vi.mocked(scrollContainer.scrollTo).mockClear();
    vi.mocked(scrollContainer.scrollBy).mockClear();
    vi.mocked(scrollTarget.scrollIntoView).mockClear();
  });

  it("can find child elements with find()", async () => {
    const container = document.getElementById(
      "nested-structure",
    ) as HTMLElement;
    const result = await $<HTMLElement>(container).find(".target-element");

    expect(result.length).toBe(1);
    expect(result[0].textContent).toBe("Target");
  });

  it("can get all children with children()", async () => {
    const container = document.getElementById("parent") as HTMLElement;
    const result = await $<HTMLElement>(container).children();

    expect(result.length).toBe(3);
    expect(result[0].className).toBe("first-child");
    expect(result[1].className).toBe("middle-child");
    expect(result[2].className).toBe("last-child");
  });

  it("can get parent element with parent()", async () => {
    const child = document.querySelector(".first-child") as HTMLElement;
    const result = await $<HTMLElement>(child).parent();

    expect(result[0].id).toBe("parent");
  });

  it("can get next sibling with next()", async () => {
    const firstChild = document.querySelector(".first-child") as HTMLElement;
    const result = await $<HTMLElement>(firstChild).next();

    expect(result[0].className).toBe("middle-child");
  });

  it("can get previous sibling with prev()", async () => {
    const lastChild = document.querySelector(".last-child") as HTMLElement;
    const result = await $<HTMLElement>(lastChild).prev();

    expect(result.length).toBe(1);
    expect(result[0].className).toBe("middle-child");
  });

  it("can filter elements by selector", async () => {
    const container = document.getElementById("parent") as HTMLElement;
    const result = await $<HTMLElement>(container)
      .children()
      .filter(".middle-child");

    expect(result.length).toBe(1);
    expect(result[0].className).toBe("middle-child");
  });

  it("can find closest ancestor matching selector", async () => {
    const target = document.querySelector(".target-element") as HTMLElement;
    const result = await $<HTMLElement>(target).closest("#nested-structure");
    expect(result[0].id).toBe("nested-structure");
  });

  it("can chain traversal methods", async () => {
    const container = document.getElementById("parent") as HTMLElement;
    const result = await $<HTMLElement>(container).children().last().prev();

    expect(result[0].className).toBe("middle-child");
  });

  it("fails with error when no elements can be found in time, custome timeout", async () => {
    const container = document.getElementById("parent") as HTMLElement;
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });
    try {
      await $<HTMLElement>(container, { timeout: 50 }).find(".non-existent");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("Timeout after 50ms");
    }
    consoleSpy.mockRestore();
  });

  it("can handle multiple elements in the chain", async () => {
    const allDivs = await $<HTMLElement>("div");
    expect(allDivs.length).toBeGreaterThan(1);

    const parents = await allDivs.parent();
    expect(parents.length).toBeGreaterThan(0);
  });

  it("preserves the correct this context in traversal methods", async () => {
    const container = document.getElementById("parent")!;
    const result = await $<HTMLElement>(container).children().first();
    expect(result.length).toBe(1);
    expect(result[0].className).toBe("first-child");
  });

  describe("Scroll methods", () => {
    it("can scroll to specific coordinates", async () => {
      const scrollToSpy = vi.spyOn(scrollContainer, "scrollTo");
      await $(scrollContainer).scrollTo(100, 200);
      expect(scrollToSpy).toHaveBeenCalledWith(100, 200);
      scrollToSpy.mockRestore();
    });

    it("can scroll to with options object", async () => {
      const scrollToSpy = vi.spyOn(scrollContainer, "scrollTo");
      const options = { top: 150, left: 100 };
      await $(scrollContainer).scrollTo(options);
      expect(scrollToSpy).toHaveBeenCalledWith(options);
      scrollToSpy.mockRestore();
    });

    it("can scroll by specific amount", async () => {
      const scrollBySpy = vi.spyOn(scrollContainer, "scrollBy");
      await $(scrollContainer).scrollBy(50, 75);
      expect(scrollBySpy).toHaveBeenCalledWith(50, 75);
      scrollBySpy.mockRestore();
    });

    it("can scroll by with options object", async () => {
      const scrollBySpy = vi.spyOn(scrollContainer, "scrollBy");
      const options = { top: 50, left: 50 };
      await $(scrollContainer).scrollBy(options);
      expect(scrollBySpy).toHaveBeenCalledWith(options);
      scrollBySpy.mockRestore();
    });

    it("can scroll element into view", async () => {
      const scrollIntoViewSpy = vi.spyOn(scrollTarget, "scrollIntoView");
      await $(scrollTarget).scrollIntoView();
      expect(scrollIntoViewSpy).toHaveBeenCalledWith(undefined);
      scrollIntoViewSpy.mockRestore();
    });

    it("can scroll element into view with options", async () => {
      const scrollIntoViewSpy = vi.spyOn(scrollTarget, "scrollIntoView");
      const options = {
        block: "center",
        inline: "center",
      } as ScrollIntoViewOptions;
      await $(scrollTarget).scrollIntoView(options);
      expect(scrollIntoViewSpy).toHaveBeenCalledWith(options);
      scrollIntoViewSpy.mockRestore();
    });
  });
});
