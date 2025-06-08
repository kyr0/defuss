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
  // Use transform and opacity for hardware acceleration
  const baseTransition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;

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
        enter: filterUndefined({
          opacity: "0",
          transition: baseTransition,
          // Force hardware acceleration
          transform: "translate3d(0, 0, 0)",
        }),
        enterActive: filterUndefined({ opacity: "1" }),
        exit: filterUndefined({
          opacity: "1",
          transition: baseTransition,
          transform: "translate3d(0, 0, 0)",
        }),
        exitActive: filterUndefined({ opacity: "0" }),
      };
    case "slide-left":
      return {
        enter: filterUndefined({
          transform: "translate3d(100%, 0, 0)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(-100%, 0, 0)",
          opacity: "0.5",
        }),
      };
    case "slide-right":
      return {
        enter: filterUndefined({
          transform: "translate3d(-100%, 0, 0)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(100%, 0, 0)",
          opacity: "0.5",
        }),
      };
    case "slide-up":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, 100%, 0)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, -100%, 0)",
          opacity: "0.5",
        }),
      };
    case "slide-down":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, -100%, 0)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 100%, 0)",
          opacity: "0.5",
        }),
      };
    case "zoom":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(0.8, 0.8, 1)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(0.8, 0.8, 1)",
          opacity: "0.5",
        }),
      };
    case "rotate":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, 0, 0) rotate(-180deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0) rotate(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0) rotate(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0) rotate(180deg)",
          opacity: "0.5",
        }),
      };
    case "flip-horizontal":
      return {
        enter: filterUndefined({
          transform:
            "translate3d(0, 0, 0) perspective(1000px) rotateY(-180deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateY(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateY(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateY(180deg)",
          opacity: "0.5",
        }),
      };
    case "flip-vertical":
      return {
        enter: filterUndefined({
          transform:
            "translate3d(0, 0, 0) perspective(1000px) rotateX(-180deg)",
          opacity: "0.5",
          transition: baseTransition,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateX(0deg)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateX(0deg)",
          opacity: "1",
          transition: baseTransition,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0) perspective(1000px) rotateX(180deg)",
          opacity: "0.5",
        }),
      };
    case "bounce":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(0.3, 0.3, 1)",
          opacity: "0.5",
          transition: `transform ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity ${duration}ms ${easing}`,
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
          opacity: "1",
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(1, 1, 1)",
          opacity: "1",
          transition: `transform ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55), opacity ${duration}ms ${easing}`,
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0) scale3d(0.3, 0.3, 1)",
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
 * Create a simple visual overlay for crossfade transitions (simplified approach)
 */
export const createSimpleOverlay = (element: HTMLElement): HTMLElement => {
  const overlay = document.createElement("div");
  const rect = element.getBoundingClientRect();

  applyStyles(overlay, {
    position: "absolute",
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: window.getComputedStyle(element).background || "transparent",
    pointerEvents: "none",
    zIndex: "1000",
  });

  overlay.classList.add("defuss-transition-overlay");
  return overlay;
};

/**
 * Insert overlay into the DOM
 */
export const insertOverlay = (overlay: HTMLElement): void => {
  document.body.appendChild(overlay);
};

/**
 * Remove overlay from the DOM
 */
export const removeOverlay = (overlay: HTMLElement): void => {
  if (overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
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
    let resolved = false;

    const handleTransitionEnd = () => {
      if (!resolved) {
        resolved = true;
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      }
    };

    element.addEventListener("transitionend", handleTransitionEnd);

    // Fallback timeout in case transitionend doesn't fire
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      }
    }, duration + 50);
  });
};

/**
 * Execute a smooth transition using requestAnimationFrame for optimal performance
 */
export const executeTransition = async (
  element: HTMLElement,
  fromStyles: Record<string, string>,
  toStyles: Record<string, string>,
  duration: number,
  delay = 0,
): Promise<void> => {
  // Apply delay if specified
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return new Promise((resolve) => {
    // Apply initial styles
    applyStyles(element, fromStyles);

    // Use requestAnimationFrame to ensure styles are applied before transition
    requestAnimationFrame(() => {
      // Apply target styles to trigger transition
      applyStyles(element, toStyles);

      // Wait for transition to complete
      waitForTransition(element, duration).then(resolve);
    });
  });
};

/**
 * Optimized transition that doesn't require snapshots for most transition types
 */
export const performOptimizedTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
  delay = 0,
): Promise<void> => {
  // Store original styles that we'll modify
  const stylesToStore = ["opacity", "transform", "transition"];
  const originalStyles = storeOriginalStyles(element, stylesToStore);

  try {
    // Step 1: Apply delay if specified
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Step 2: Fade out with exit transition
    await executeTransition(
      element,
      transitionStyles.exit,
      transitionStyles.exitActive,
      duration / 2,
    );

    // Step 3: Update DOM content at lowest opacity/visibility
    await updateCallback();

    // Step 4: Fade in with enter transition
    await executeTransition(
      element,
      transitionStyles.enter,
      transitionStyles.enterActive,
      duration / 2,
    );

    // Step 5: Restore original styles
    restoreOriginalStyles(element, originalStyles);
  } catch (error) {
    // On error, restore original styles
    restoreOriginalStyles(element, originalStyles);
    throw error;
  }
};

/**
 * Non-blocking transition helper that uses requestAnimationFrame for immediate scheduling
 */
export const scheduleTransitionStep = (callback: () => void): void => {
  requestAnimationFrame(callback);
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
    requestAnimationFrame(callback);
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
      requestAnimationFrame(callback);
    }
  };

  element.addEventListener("transitionend", handleTransitionEnd);

  // Fallback timeout in case transitionend doesn't fire
  setTimeout(() => {
    if (!resolved) {
      resolved = true;
      element.removeEventListener("transitionend", handleTransitionEnd);
      requestAnimationFrame(callback);
    }
  }, duration + 50);
};

/**
 * DEPRECATED: Simple snapshot for backwards compatibility
 * NOTE: This is kept for compatibility but is not recommended for performance
 */
export const createContentSnapshot = (element: HTMLElement): HTMLElement => {
  const snapshot = document.createElement("div");
  snapshot.innerHTML = element.innerHTML;

  const rect = element.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(element);

  applyStyles(snapshot, {
    position: "absolute",
    top: `${rect.top + window.scrollY}px`,
    left: `${rect.left + window.scrollX}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    background: computedStyle.background || "transparent",
    pointerEvents: "none",
    zIndex: "1000",
  });

  snapshot.classList.add("defuss-content-snapshot");
  return snapshot;
};

/**
 * DEPRECATED: Insert snapshot for backwards compatibility
 */
export const insertContentSnapshot = (
  snapshot: HTMLElement,
  targetElement: HTMLElement,
): void => {
  document.body.appendChild(snapshot);
};

/**
 * DEPRECATED: Remove snapshot for backwards compatibility
 */
export const removeContentSnapshot = (snapshot: HTMLElement): void => {
  if (snapshot.parentNode) {
    snapshot.parentNode.removeChild(snapshot);
  }
};

/**
 * OPTIMIZED: Simple and efficient transition without snapshots
 * This approach works for 90% of transitions and is much more performant
 */
export const performSimpleTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
  delay = 0,
): Promise<void> => {
  // Store original styles
  const originalStyles = storeOriginalStyles(element, [
    "opacity",
    "transform",
    "transition",
    "position",
    "overflow",
  ]);

  try {
    // Apply delay if specified
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Check if this is a fade transition - use cross-fade approach
    const isFadeTransition =
      transitionStyles.exit.opacity === "1" &&
      transitionStyles.exitActive.opacity === "0" &&
      transitionStyles.enter.opacity === "0" &&
      transitionStyles.enterActive.opacity === "1";

    if (isFadeTransition) {
      await performCrossFadeTransition(
        element,
        transitionStyles,
        updateCallback,
        duration,
      );
    } else {
      // For non-fade transitions, use the original approach
      await performStandardTransition(
        element,
        transitionStyles,
        updateCallback,
        duration,
      );
    }

    // Restore original styles
    restoreOriginalStyles(element, originalStyles);
  } catch (error) {
    // On error, restore original styles
    restoreOriginalStyles(element, originalStyles);
    throw error;
  }
};

/**
 * Perform a true cross-fade transition by overlaying new content on old content
 */
const performCrossFadeTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
): Promise<void> => {
  // Create a snapshot of the current content
  const oldContentSnapshot = element.cloneNode(true) as HTMLElement;

  // Set up the container for cross-fade
  applyStyles(element, {
    position: "relative",
    overflow: "hidden",
  });

  // Update the content immediately (this becomes the new content)
  await updateCallback();

  // Position the old content as an overlay
  applyStyles(oldContentSnapshot, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    opacity: "1",
    transition: `opacity ${duration}ms ${transitionStyles.exit.transition?.split(" ")[2] || "ease-in-out"}`,
    pointerEvents: "none", // Prevent interaction with the overlay
    zIndex: "1",
  });

  // Set initial styles for new content (underneath)
  applyStyles(element, {
    opacity: "0",
    transition: `opacity ${duration}ms ${transitionStyles.enter.transition?.split(" ")[2] || "ease-in-out"}`,
  });

  // Insert the old content snapshot as overlay
  element.appendChild(oldContentSnapshot);

  // Force reflow
  element.offsetHeight;

  // Start the cross-fade: fade out old content and fade in new content
  applyStyles(oldContentSnapshot, { opacity: "0" });
  applyStyles(element, { opacity: "1" });

  // Wait for transition to complete
  await new Promise((resolve) => setTimeout(resolve, duration));

  // Clean up: remove the old content overlay
  if (oldContentSnapshot.parentNode) {
    oldContentSnapshot.parentNode.removeChild(oldContentSnapshot);
  }
};

/**
 * Perform standard transition (non-fade)
 */
const performStandardTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
): Promise<void> => {
  // Step 1: Apply exit styles and trigger transition out
  applyStyles(element, transitionStyles.exit);

  // Force reflow to ensure styles are applied
  element.offsetHeight;

  applyStyles(element, transitionStyles.exitActive);

  // Step 2: Wait for half the transition to complete
  await new Promise((resolve) => setTimeout(resolve, duration / 2));

  // Step 3: Update DOM content at the transition midpoint
  await updateCallback();

  // Step 4: Apply enter styles and transition in
  applyStyles(element, transitionStyles.enter);

  // Force reflow
  element.offsetHeight;

  applyStyles(element, transitionStyles.enterActive);

  // Step 5: Wait for transition to complete
  await waitForTransition(element, duration / 2);
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
