/**
 * Transition system for defuss DOM updates
 * - "fade" transitions: Snapshots do NOT fade (maintains original appearance during cross-fade)
 * - All other transitions ("slide-left", "slide-right", "shake"): Snapshots fade out with same duration
 */
export type TransitionType =
  | "fade"
  | "slide-left"
  | "slide-right"
  | "shake"
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
 * Determine if a transition type should fade out the snapshot
 * Fade transitions should NOT fade the snapshot, all others should
 */
const shouldFadeSnapshot = (type: TransitionType): boolean => {
  return type !== "fade" && type !== "none";
};

/**
 * Inject shake animation keyframes into the document
 */
const injectShakeKeyframes = (): void => {
  const keyframesId = "defuss-shake-keyframes";

  // Check if keyframes already exist
  if (document.getElementById(keyframesId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = keyframesId;
  style.textContent = `
    @keyframes shake {
      0%, 100% { transform: translate3d(0, 0, 0); }
      10%, 30%, 50%, 70%, 90% { transform: translate3d(-10px, 0, 0); }
      20%, 40%, 60%, 80% { transform: translate3d(10px, 0, 0); }
    }
  `;

  document.head.appendChild(style);
};

/**
 * Get predefined transition styles based on transition type
 */
export const getTransitionStyles = (
  type: TransitionType,
  duration: number,
  easing: TransitionsEasing | string = "ease-in-out",
): TransitionStyles => {
  // Inject shake keyframes if needed
  if (type === "shake") {
    injectShakeKeyframes();
  }

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
    case "shake":
      return {
        enter: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: "none",
        }),
        enterActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36, 0.07, 0.19, 0.97)`,
        }),
        exit: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          transition: "none",
        }),
        exitActive: filterUndefined({
          transform: "translate3d(0, 0, 0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36, 0.07, 0.19, 0.97)`,
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
 * Get transition styles with type information for enhanced snapshot control
 */
export const getTransitionStylesWithType = (
  type: TransitionType,
  duration: number,
  easing: TransitionsEasing | string = "ease-in-out",
): { styles: TransitionStyles; type: TransitionType } => {
  return {
    styles: getTransitionStyles(type, duration, easing),
    type,
  };
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
  transitionType: TransitionType = "fade",
): Promise<void> => {
  // Store original styles that we'll modify
  const stylesToStore = ["opacity", "transform", "transition"];
  const originalStyles = storeOriginalStyles(element, stylesToStore);

  try {
    // Step 1: Apply delay if specified
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Use the simple transition approach with snapshot control
    await performSimpleTransition(
      element,
      transitionStyles,
      updateCallback,
      duration,
      0, // delay already applied above
      transitionType,
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
 * Simple snapshot for backwards compatibility
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
 * Insert snapshot for backwards compatibility
 */
export const insertContentSnapshot = (
  snapshot: HTMLElement,
  targetElement: HTMLElement,
): void => {
  document.body.appendChild(snapshot);
};

/**
 * Remove snapshot for backwards compatibility
 */
export const removeContentSnapshot = (snapshot: HTMLElement): void => {
  if (snapshot.parentNode) {
    snapshot.parentNode.removeChild(snapshot);
  }
};

/**
 * Simple and efficient transition with snapshot fade control
 *
 * @param element - The element to apply the transition to
 * @param transitionStyles - The transition styles for enter/exit phases
 * @param updateCallback - Callback to update the DOM content
 * @param duration - Duration of the transition in milliseconds
 * @param delay - Delay before starting the transition
 * @param transitionType - Type of transition to determine snapshot behavior
 */
export const performSimpleTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
  delay = 0,
  transitionType: TransitionType = "fade",
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

    // Use cross-fade approach for all transitions, with snapshot fade control
    await performCrossFadeTransition(
      element,
      transitionStyles,
      updateCallback,
      duration,
      transitionType,
    );

    // Restore original styles
    restoreOriginalStyles(element, originalStyles);
  } catch (error) {
    // On error, restore original styles
    restoreOriginalStyles(element, originalStyles);
    throw error;
  }
};

/**
 * Perform a cross-fade transition with snapshot fade control
 */
const performCrossFadeTransition = async (
  element: HTMLElement,
  transitionStyles: TransitionStyles,
  updateCallback: () => Promise<void>,
  duration: number,
  transitionType: TransitionType = "fade",
): Promise<void> => {
  const shouldFadeSnap = shouldFadeSnapshot(transitionType);

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
    transition: shouldFadeSnap
      ? `opacity ${duration}ms ${transitionStyles.exit.transition?.split(" ")[2] || "ease-in-out"}`
      : "none",
    pointerEvents: "none",
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
  void element.offsetHeight;

  // Start the transition: fade in new content, and fade out snapshot if needed
  applyStyles(element, { opacity: "1" });
  if (shouldFadeSnap) {
    applyStyles(oldContentSnapshot, { opacity: "0" });
  }

  // Wait for transition to complete
  await new Promise((resolve) => setTimeout(resolve, duration));

  // Clean up: remove the old content overlay
  if (oldContentSnapshot.parentNode) {
    oldContentSnapshot.parentNode.removeChild(oldContentSnapshot);
  }
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
