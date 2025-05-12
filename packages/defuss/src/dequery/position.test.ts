// @vitest-environment happy-dom
import { $ } from "./dequery.js";
import { vi } from "vitest";

// Mock getComputedStyle to return predictable values for visibility/dimension tests
const mockGetComputedStyle = vi.fn((el: Element) => {
  const style = el.getAttribute("style") || "";
  const styles: Record<string, string> = {
    display: style.includes("display: none") ? "none" : "block",
    visibility: style.includes("visibility: hidden") ? "hidden" : "visible",
    opacity: style.includes("opacity: 0") ? "0" : "1",
    paddingLeft: style.match(/padding:\s*(\d+)px/)?.[1] || "0",
    paddingRight: style.match(/padding:\s*(\d+)px/)?.[1] || "0",
    paddingTop: style.match(/padding:\s*(\d+)px/)?.[1] || "0",
    paddingBottom: style.match(/padding:\s*(\d+)px/)?.[1] || "0",
    marginLeft: style.match(/margin:\s*(\d+)px/)?.[1] || "0",
    marginRight: style.match(/margin:\s*(\d+)px/)?.[1] || "0",
    marginTop: style.match(/margin:\s*(\d+)px/)?.[1] || "0",
    marginBottom: style.match(/margin:\s*(\d+)px/)?.[1] || "0",
  };
  return {
    getPropertyValue: (prop: string) => styles[prop] || "",
    ...styles, // Allow direct property access
  } as CSSStyleDeclaration;
});

describe("Position and dimension methods", () => {
  let testElement: HTMLElement;
  let hiddenElement: HTMLElement;
  let zeroElement: HTMLElement;
  let parentElement: HTMLElement;
  let childElement: HTMLElement;

  beforeEach(() => {
    // Reset the body and create test elements
    document.body.innerHTML = "";

    // Create a test div
    testElement = document.createElement("div");
    testElement.id = "test-element";
    testElement.style.position = "absolute";
    testElement.style.top = "100px";
    testElement.style.left = "50px";
    testElement.style.width = "200px";
    testElement.style.height = "150px";
    testElement.style.padding = "10px";
    testElement.style.margin = "15px";
    testElement.style.border = "5px solid black";
    // Mock properties that happy-dom might not calculate
    Object.defineProperty(testElement, "offsetTop", {
      value: 100,
      configurable: true,
    });
    Object.defineProperty(testElement, "offsetLeft", {
      value: 50,
      configurable: true,
    });
    Object.defineProperty(testElement, "offsetWidth", {
      value: 230,
      configurable: true,
    }); // 200 + 10*2 padding + 5*2 border
    Object.defineProperty(testElement, "offsetHeight", {
      value: 180,
      configurable: true,
    }); // 150 + 10*2 padding + 5*2 border
    testElement.getBoundingClientRect = vi.fn(() => ({
      top: 100,
      left: 50,
      width: 230, // Includes padding and border
      height: 180, // Includes padding and border
      right: 280,
      bottom: 280,
      x: 50,
      y: 100,
      toJSON: () => ({}),
    }));
    document.body.appendChild(testElement);

    // Create a hidden element
    hiddenElement = document.createElement("div");
    hiddenElement.id = "hidden-element";
    hiddenElement.style.display = "none";
    Object.defineProperty(hiddenElement, "offsetWidth", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(hiddenElement, "offsetHeight", {
      value: 0,
      configurable: true,
    });
    hiddenElement.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    document.body.appendChild(hiddenElement);

    // Create a visible but zero-sized element
    zeroElement = document.createElement("div");
    zeroElement.id = "zero-element";
    zeroElement.style.width = "0";
    zeroElement.style.height = "0";
    Object.defineProperty(zeroElement, "offsetWidth", {
      value: 0,
      configurable: true,
    });
    Object.defineProperty(zeroElement, "offsetHeight", {
      value: 0,
      configurable: true,
    });
    zeroElement.getBoundingClientRect = vi.fn(() => ({
      top: 0,
      left: 0,
      width: 0,
      height: 0,
      right: 0,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));
    document.body.appendChild(zeroElement);

    // Create a nested visible/hidden structure
    parentElement = document.createElement("div");
    parentElement.id = "parent";
    childElement = document.createElement("div");
    childElement.id = "child";
    parentElement.appendChild(childElement);
    document.body.appendChild(parentElement);
    Object.defineProperty(childElement, "offsetWidth", {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(childElement, "offsetHeight", {
      value: 10,
      configurable: true,
    });
    childElement.getBoundingClientRect = vi.fn(() => ({
      top: 10,
      left: 10,
      width: 10,
      height: 10,
      right: 20,
      bottom: 20,
      x: 10,
      y: 10,
      toJSON: () => ({}),
    }));

    // Mock window.getComputedStyle globally
    vi.stubGlobal("getComputedStyle", mockGetComputedStyle);
    // Mock scroll positions
    vi.stubGlobal("scrollY", 10);
    vi.stubGlobal("scrollX", 5);
  });

  afterEach(() => {
    vi.unstubAllGlobals(); // Restore original globals
    vi.clearAllMocks();
  });

  it("can get element position using offsetTop/Left", async () => {
    const pos = await $("#test-element").position();
    expect(pos).toEqual({ top: 100, left: 50 });
  });

  it("can get element offset using getBoundingClientRect", async () => {
    const offset = await $("#test-element").offset();
    // offset = rect.top/left + window.scrollY/X
    expect(testElement.getBoundingClientRect).toHaveBeenCalled();
    expect(offset).toEqual({ top: 100 + 10, left: 50 + 5 });
  });

  it("can get element dimensions using getBoundingClientRect", async () => {
    const dim = await $("#test-element").dimension();
    expect(testElement.getBoundingClientRect).toHaveBeenCalled();
    // Default dimension should return rect.width/height
    expect(dim).toEqual({ width: 230, height: 180 });
  });

  it("can get element dimensions excluding padding", async () => {
    // dimension(false) -> includeMargin=false (ignored), includePadding=false
    const dim = await $("#test-element").dimension(false);
    expect(mockGetComputedStyle).toHaveBeenCalledWith(testElement);
    // width = rect.width - paddingLeft - paddingRight = 230 - 10 - 10 = 210
    // height = rect.height - paddingTop - paddingBottom = 180 - 10 - 10 = 160
    expect(dim).toEqual({ width: 210, height: 160 });
  });

  it("can get element outer dimensions including margin", async () => {
    // dimension(true, true) -> includeMargin=true, includePadding=true (padding is included by default in rect)
    const dim = await $("#test-element").dimension(true, true);
    expect(mockGetComputedStyle).toHaveBeenCalledWith(testElement);
    // width = rect.width = 230
    // height = rect.height = 180
    // outerWidth = width + marginLeft + marginRight = 230 + 15 + 15 = 260
    // outerHeight = height + marginTop + marginBottom = 180 + 15 + 15 = 210
    expect(dim).toEqual({
      width: 230,
      height: 180,
      outerWidth: 260,
      outerHeight: 210,
    });
  });

  it("can determine if element is visible", async () => {
    // #test-element: has dimensions, is attached, style is visible
    const isVisible = await $("#test-element").isVisible();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(testElement);
    expect(isVisible).toBe(true);

    // #hidden-element: display: none
    const isHiddenVisible = await $("#hidden-element").isVisible();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(hiddenElement);
    expect(isHiddenVisible).toBe(false);

    // #zero-element: zero dimensions
    const isZeroVisible = await $("#zero-element").isVisible();
    expect(isZeroVisible).toBe(false);

    // Detached element
    const detached = document.createElement("div");
    Object.defineProperty(detached, "offsetWidth", {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(detached, "offsetHeight", {
      value: 10,
      configurable: true,
    });
    const isDetachedVisible = await $(detached).isVisible();
    expect(isDetachedVisible).toBe(false);

    // Child of hidden parent
    parentElement.style.display = "none";
    // Need to re-mock parentElement's computed style after changing inline style
    mockGetComputedStyle.mockImplementation((el) => {
      const style = el.getAttribute("style") || "";
      const isParent = el.id === "parent";
      const styles: Record<string, string> = {
        display:
          style.includes("display: none") ||
          (isParent && parentElement.style.display === "none")
            ? "none"
            : "block",
        visibility: style.includes("visibility: hidden") ? "hidden" : "visible",
        opacity: style.includes("opacity: 0") ? "0" : "1",
      };
      return {
        getPropertyValue: (prop: string) => styles[prop] || "",
        ...styles,
      } as CSSStyleDeclaration;
    });
    const isChildVisible = await $("#child").isVisible();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(childElement);
    expect(mockGetComputedStyle).toHaveBeenCalledWith(parentElement);
    expect(isChildVisible).toBe(false);
  });

  it("can determine if element is hidden", async () => {
    // #test-element: should not be hidden
    const isTestHidden = await $("#test-element").isHidden();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(testElement);
    expect(isTestHidden).toBe(false);

    // #hidden-element: display: none
    const isHiddenHidden = await $("#hidden-element").isHidden();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(hiddenElement);
    expect(isHiddenHidden).toBe(true);

    // #zero-element: zero dimensions
    const isZeroHidden = await $("#zero-element").isHidden();
    expect(isZeroHidden).toBe(true);

    // Detached element
    const detached = document.createElement("div");
    Object.defineProperty(detached, "offsetWidth", {
      value: 10,
      configurable: true,
    });
    Object.defineProperty(detached, "offsetHeight", {
      value: 10,
      configurable: true,
    });
    const isDetachedHidden = await $(detached).isHidden();
    expect(isDetachedHidden).toBe(true);

    // Child of hidden parent
    parentElement.style.display = "none";
    mockGetComputedStyle.mockImplementation((el) => {
      const style = el.getAttribute("style") || "";
      const isParent = el.id === "parent";
      const styles: Record<string, string> = {
        display:
          style.includes("display: none") ||
          (isParent && parentElement.style.display === "none")
            ? "none"
            : "block",
        visibility: style.includes("visibility: hidden") ? "hidden" : "visible",
        opacity: style.includes("opacity: 0") ? "0" : "1",
      };
      return {
        getPropertyValue: (prop: string) => styles[prop] || "",
        ...styles,
      } as CSSStyleDeclaration;
    });
    const isChildHidden = await $("#child").isHidden();
    expect(mockGetComputedStyle).toHaveBeenCalledWith(childElement);
    expect(mockGetComputedStyle).toHaveBeenCalledWith(parentElement);
    expect(isChildHidden).toBe(true);
  });

  it("considers zero-dimension elements as hidden", async () => {
    // This is effectively tested within isVisible/isHidden tests now
    const isHidden = await $("#zero-element").isHidden();
    expect(isHidden).toBe(true);

    const isVisible = await $("#zero-element").isVisible();
    expect(isVisible).toBe(false);
  });
});
