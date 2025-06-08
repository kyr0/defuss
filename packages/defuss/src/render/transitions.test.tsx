// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "../render/client.js";
import { updateDom } from "../render/isomorph.js";
import type { TransitionConfig } from "../render/transitions.js";

describe("updateDom method with Transition Effects", () => {
  let container: HTMLElement;
  let testElement: HTMLElement;

  beforeEach(async () => {
    // Use happy-dom's built-in document
    document.body.innerHTML = "";

    // Create test elements using render function
    container = (await render(
      <div id="container">
        <div id="test-element">Original content</div>
      </div>,
    )) as HTMLElement;

    document.body.appendChild(container);
    testElement = container.querySelector("#test-element") as HTMLElement;
  });

  it("should update content without transition config", async () => {
    await updateDom(
      "<div>Updated content</div>",
      [testElement],
      1000,
      DOMParser,
    );

    expect(testElement.innerHTML).toBe("<div>Updated content</div>");
  });

  it("should update content with fade transition", async () => {
    const transitionConfig: TransitionConfig = {
      type: "fade",
      duration: 100, // Short duration for test
    };

    await updateDom(
      "<div>Faded content</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Faded content</div>");
  });

  it("should update content with slide transition", async () => {
    const transitionConfig: TransitionConfig = {
      type: "slide-left",
      duration: 100,
      easing: "ease-in-out",
    };

    await updateDom(
      "<div>Slided content</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Slided content</div>");
  });

  it("should update content with custom transition styles", async () => {
    const transitionConfig: TransitionConfig = {
      styles: {
        enter: { opacity: "0", transform: "scale(0.8)" },
        enterActive: { opacity: "1", transform: "scale(1)" },
        exit: { opacity: "1", transform: "scale(1)" },
        exitActive: { opacity: "0", transform: "scale(1.1)" },
      },
      duration: 100,
    };

    await updateDom(
      "<div>Custom transition content</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Custom transition content</div>");
  });

  it("should handle transition with delay", async () => {
    const transitionConfig: TransitionConfig = {
      type: "bounce",
      duration: 100,
      delay: 50,
    };

    const startTime = Date.now();
    await updateDom(
      "<div>Delayed content</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );
    const endTime = Date.now();

    // Should take at least the delay time + transition duration
    expect(endTime - startTime).toBeGreaterThanOrEqual(150);
    expect(testElement.innerHTML).toBe("<div>Delayed content</div>");
  });

  it("should handle elements without parent gracefully", async () => {
    // Create isolated element without parent
    const element = document.createElement("div");
    element.innerHTML = "Isolated content";

    const transitionConfig: TransitionConfig = {
      type: "fade",
      duration: 100,
    };

    // Should not throw error even without parent
    await expect(
      updateDom(
        "<div>Updated isolated</div>",
        [element],
        1000,
        DOMParser,
        transitionConfig,
      ),
    ).resolves.not.toThrow();
  });

  it("should handle none transition type", async () => {
    const transitionConfig: TransitionConfig = {
      type: "none",
    };

    await updateDom(
      "<div>No transition content</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>No transition content</div>");
  });

  it("should apply transition to parent element when target is 'parent'", async () => {
    const transitionConfig: TransitionConfig = {
      type: "fade",
      duration: 100,
      target: "parent",
    };

    await updateDom(
      "<div>Content with parent target</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Content with parent target</div>");
  });

  it("should apply transition to element itself when target is 'self'", async () => {
    const transitionConfig: TransitionConfig = {
      type: "slide-left",
      duration: 100,
      target: "self",
    };

    await updateDom(
      "<div>Content with self target</div>",
      [testElement],
      1000,
      DOMParser,
      transitionConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Content with self target</div>");
  });

  it("should handle snapshot fade behavior correctly for different transition types", async () => {
    // Test fade transition (should NOT fade snapshot)
    const fadeConfig: TransitionConfig = {
      type: "fade",
      duration: 100,
    };

    await updateDom(
      "<div>Fade transition content</div>",
      [testElement],
      1000,
      DOMParser,
      fadeConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Fade transition content</div>");

    // Test zoom transition (should fade snapshot)
    const zoomConfig: TransitionConfig = {
      type: "zoom",
      duration: 100,
    };

    await updateDom(
      "<div>Zoom transition content</div>",
      [testElement],
      1000,
      DOMParser,
      zoomConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Zoom transition content</div>");

    // Test bounce transition (should fade snapshot)
    const bounceConfig: TransitionConfig = {
      type: "bounce",
      duration: 100,
    };

    await updateDom(
      "<div>Bounce transition content</div>",
      [testElement],
      1000,
      DOMParser,
      bounceConfig,
    );

    expect(testElement.innerHTML).toBe("<div>Bounce transition content</div>");
  });

  it("should handle target 'self' even without parent element", async () => {
    // Create isolated element without parent
    const element = document.createElement("div");
    element.innerHTML = "Isolated content";

    const transitionConfig: TransitionConfig = {
      type: "zoom",
      duration: 100,
      target: "self",
    };

    // Should work fine with self target even without parent
    await expect(
      updateDom(
        "<div>Updated isolated with self target</div>",
        [element],
        1000,
        DOMParser,
        transitionConfig,
      ),
    ).resolves.not.toThrow();

    expect(element.innerHTML).toBe("<div>Updated isolated with self target</div>");
  });
});
