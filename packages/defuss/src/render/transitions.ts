/**
 * Transition system for defuss DOM updates
 */
export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "slide-up"
  | "slide-down"
  | "zoom"
  | "rotate"
  | "flip-horizontal"
  | "flip-vertical"
  | "bounce"
  | "none";

export interface TransitionStyles {
  enter: Record<string, string>;
  enterActive: Record<string, string>;
  exit: Record<string, string>;
  exitActive: Record<string, string>;
}

export type TransitionsEasing =
  // linear-easing-function
  | "linear"
  // cubic-bezier-easing-function
  | "ease"
  | "ease-in"
  | "ease-out"
  | "ease-in-out"
  // step-easing-function
  | "step-start"
  | "step-end";

export interface TransitionConfig {
  /** Predefined transition type */
  type?: TransitionType;
  /** Custom CSS-in-JS styles for each transition phase */
  styles?: TransitionStyles;
  /** Duration in milliseconds */
  duration?: number;
  /** CSS easing function, e.g. 'ease-in' or 'cubic-bezier(0.1, -0.6, 0.2, 0)' */
  easing?: TransitionsEasing | string;
  /** Delay before starting transition in milliseconds */
  delay?: number;
  /**
   * Target element for applying transition styles
   * - "parent": Apply transition to the parent element (default behavior)
   * - "self": Apply transition to the element itself (child root)
   */
  target?: "parent" | "self";
}

/**
 * Get predefined transition styles based on transition type
 */
export const getTransitionStyles = (
  type: TransitionType,
  duration: number,
  easing: TransitionsEasing | string = "ease-in-out",
): TransitionStyles => {
  const baseTransition = `all ${duration}ms ${easing}`;

  const filterUndefined = (
    obj: Record<string, string | undefined>,
  ): Record<string, string> => {
    const filtered: Record<string, string> = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (value !== undefined) {
        filtered[key] = value;
      }
    });
    return filtered;
  };

  switch (type) {
    case "fade":
      return {
        enter: filterUndefined({ opacity: "0.5", transition: baseTransition }),
        enterActive: filterUndefined({ opacity: "1" }),
        exit: filterUndefined({ opacity: "1", transition: baseTransition }),
        exitActive: filterUndefined({ opacity: "0.5" }),
      };
    case "slide-left":
      return {
        enter: filterUndefined({
          transform: "translateX(100%)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translateX(0%)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translateX(0%)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translateX(-200%)",
          opacity: "0.5",
        }),
      };
    case "slide-right":
      return {
        enter: filterUndefined({
          transform: "translateX(-200%)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translateX(0%)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translateX(0%)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translateX(100%)",
          opacity: "0.5",
        }),
      };
    case "slide-up":
      return {
        enter: filterUndefined({
          transform: "translateY(100%)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translateY(0%)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translateY(0%)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translateY(-200%)",
          opacity: "0.5",
        }),
      };
    case "slide-down":
      return {
        enter: filterUndefined({
          transform: "translateY(-200%)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translateY(0%)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translateY(0%)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translateY(100%)",
          opacity: "0.5",
        }),
      };
    case "zoom":
      return {
        enter: filterUndefined({
          transform: "scale(0)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({ transform: "scale(1)", opacity: "1" }),
        exit: filterUndefined({
          transform: "scale(1)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({ transform: "scale(0)", opacity: "0" }),
      };
    case "rotate":
      return {
        enter: filterUndefined({
          transform: "rotate(-360deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "rotate(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "rotate(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "rotate(360deg)",
          opacity: "0.5",
        }),
      };
    case "flip-horizontal":
      return {
        enter: filterUndefined({
          transform: "perspective(1000px) rotateY(-360deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "perspective(1000px) rotateY(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "perspective(1000px) rotateY(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "perspective(1000px) rotateY(360deg)",
          opacity: "0.5",
        }),
      };
    case "flip-vertical":
      return {
        enter: filterUndefined({
          transform: "perspective(1000px) rotateX(-360deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "perspective(1000px) rotateX(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "perspective(1000px) rotateX(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "perspective(1000px) rotateX(360deg)",
          opacity: "0.5",
        }),
      };
    case "bounce":
      return {
        enter: filterUndefined({
          transform: "scale(0.3)",
          opacity: "0.5",
          transition: `all ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
        }),
        enterActive: filterUndefined({
          transform: "scale(1)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "scale(1)",
          opacity: "1",
          transition: `all ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
        }),
        exitActive: filterUndefined({
          transform: "scale(0.3)",
          opacity: "0.5",
        }),
      };
    default:
      return {
        enter: {},
        enterActive: {},
        exit: {},
        exitActive: {},
      };
  }
};

/**
 * Apply styles to an element
 */
export const applyStyles = (
  element: HTMLElement,
  styles: Record<string, string | number>,
) => {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, String(value));
  });
};

/**
 * Create a visual snapshot of the current content for crossfade transitions
 */
export const createContentSnapshot = (element: HTMLElement): HTMLElement => {
  // Clone the current content
  const snapshot = element.cloneNode(true) as HTMLElement;

  // Get the computed styles and position of the original element
  const computedStyle = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  // Style the snapshot to be positioned exactly over the original
  applyStyles(snapshot, {
    position: "absolute",
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    zIndex: "-1", // Behind the original content
    pointerEvents: "none", // Don't interfere with interactions
    // Copy important visual styles
    background: computedStyle.background,
    border: computedStyle.border,
    borderRadius: computedStyle.borderRadius,
    boxShadow: computedStyle.boxShadow,
    // Preserve text and content styles
    font: computedStyle.font,
    color: computedStyle.color,
    textAlign: computedStyle.textAlign,
    lineHeight: computedStyle.lineHeight,
  });

  // Add a unique class for identification
  snapshot.classList.add("defuss-content-snapshot");

  return snapshot;
};

/**
 * Insert content snapshot into the DOM
 */
export const insertContentSnapshot = (
  snapshot: HTMLElement,
  targetElement: HTMLElement,
): void => {
  // Insert the snapshot into the document body or the nearest positioned parent
  const positionedParent = getPositionedParent(targetElement);
  (positionedParent || document.body).appendChild(snapshot);
};

/**
 * Remove content snapshot from the DOM
 */
export const removeContentSnapshot = (snapshot: HTMLElement): void => {
  if (snapshot.parentNode) {
    snapshot.parentNode.removeChild(snapshot);
  }
};

/**
 * Find the nearest positioned parent element
 */
const getPositionedParent = (element: HTMLElement): HTMLElement | null => {
  let parent = element.parentElement;
  while (parent) {
    const style = window.getComputedStyle(parent);
    if (style.position !== "static") {
      return parent;
    }
    parent = parent.parentElement;
  }
  return null;
};

/**
 * Default transition configuration
 */
export const DEFAULT_TRANSITION_CONFIG: TransitionConfig = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
  target: "parent",
};

/**
 * Create a promise that resolves after a transition completes
 */
export const waitForTransition = (
  element: HTMLElement,
  duration: number,
): Promise<void> => {
  return new Promise((resolve) => {
    const handleTransitionEnd = () => {
      element.removeEventListener("transitionend", handleTransitionEnd);
      resolve();
    };

    element.addEventListener("transitionend", handleTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(resolve, duration + 50);
  });
};

/**
 * Non-blocking transition helper that uses queueMicrotask for immediate scheduling
 */
export const scheduleTransitionStep = (callback: () => void): void => {
  queueMicrotask(callback);
};

/**
 * Non-blocking delay that uses setTimeout without blocking
 */
export const scheduleDelayedStep = (
  callback: () => void,
  delay: number,
): void => {
  if (delay > 0) {
    setTimeout(callback, delay);
  } else {
    queueMicrotask(callback);
  }
};

/**
 * Non-blocking transition waiter that uses setTimeout with callback
 */
export const scheduleTransitionEnd = (
  element: HTMLElement,
  duration: number,
  callback: () => void,
): void => {
  let resolved = false;

  const handleTransitionEnd = () => {
    if (!resolved) {
      resolved = true;
      element.removeEventListener("transitionend", handleTransitionEnd);
      queueMicrotask(callback);
    }
  };

  element.addEventListener("transitionend", handleTransitionEnd);

  // Fallback timeout in case transitionend doesn't fire
  setTimeout(() => {
    if (!resolved) {
      resolved = true;
      element.removeEventListener("transitionend", handleTransitionEnd);
      queueMicrotask(callback);
    }
  }, duration + 50);
};

/**
 * Store original styles of an element before applying transition styles
 */
export const storeOriginalStyles = (
  element: HTMLElement,
  styleProperties: string[],
): Record<string, string> => {
  const originalStyles: Record<string, string> = {};

  styleProperties.forEach((property) => {
    // Get the current computed or inline style value
    const currentValue =
      element.style.getPropertyValue(property) ||
      window.getComputedStyle(element).getPropertyValue(property);
    originalStyles[property] = currentValue;
  });

  return originalStyles;
};

/**
 * Restore original styles to an element after transition completes
 */
export const restoreOriginalStyles = (
  element: HTMLElement,
  originalStyles: Record<string, string>,
): void => {
  Object.entries(originalStyles).forEach(([property, value]) => {
    if (value) {
      element.style.setProperty(property, value);
    } else {
      // If the original value was empty, remove the property
      element.style.removeProperty(property);
    }
  });
};
