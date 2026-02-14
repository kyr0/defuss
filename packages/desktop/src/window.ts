import { $, type Ref } from "defuss";
import type { WindowRefState } from "./regui/components/window.js";
import { desktopManager } from "./index.js";
import type { Dimensions2D } from "./types.js";
import { debounce } from "defuss-runtime";

export interface CreateWindowOptions {
  id?: string;
  title?: string;
  icon?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  minimizable?: boolean;
  maximizable?: boolean;
  minimized?: boolean;
  maximized?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  resizable?: boolean;
}

export interface WindowState {
  id: string;
  el: HTMLElement;
  ref: Ref<HTMLElement, WindowRefState>;
  title: string;
  icon: string;
  width: number;
  height: number;
  // Previous position and size before maximization or minimization
  prevX: number;
  prevY: number;
  prevWidth: number;
  prevHeight: number;
  // Flag to track if original dimensions have been stored
  originalDimensionsStored: boolean;
  x: number;
  y: number;
  resizable: boolean;
  draggable: boolean;
  closeable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  minimized: boolean;
  maximized: boolean;
}

export const defaultWindowOptions: CreateWindowOptions = {
  title: "Untitled",
  resizable: true,
  minimized: false,
  maximized: false,
  minimizable: true,
  maximizable: true,
  width: 800,
  height: 600,
  x: 0,
  y: 0,
  onClose: () => { },
  onMinimize: () => { },
  onMaximize: () => { },
};

export class WindowManager {
  windows: Array<WindowState> = [];

  constructor() {
    $(() => {
      // Initialize the window manager (guard for test environment)
      if (desktopManager?.onResize) {
        desktopManager.onResize(debounce(this.onDesktopResized.bind(this), 50));
      }
    });
  }

  onDesktopResized(dimensions: Dimensions2D) {
    // Update all maximized windows to fit the new desktop dimensions
    this.windows.forEach((win) => {
      if (win.maximized) {
        // Update the window state with new dimensions
        this.updateWindow(win.id, {
          width: dimensions.width,
          height: dimensions.height,
        });

        // Update the actual DOM element styling
        const $win = $(win.el);
        $win.css({
          width: `${dimensions.width + 6}px`,
          height: `${dimensions.height + 9}px`,
          left: "-3px",
          top: "-3px",
        });
      }
    });
  }

  getActiveWindow(): WindowState | undefined {
    // Find the last non-minimized window
    for (let i = this.windows.length - 1; i >= 0; i--) {
      if (!this.windows[i].minimized) {
        return this.windows[i];
      }
    }
    return undefined; // Return undefined if all windows are minimized
  }

  getWindow(id?: string): WindowState | undefined {
    return this.windows.find((win) => win.id === id);
  }

  setActiveWindow(id: string) {
    const window = this.getWindow(id);
    if (window) {
      // Move the window to the end of the array to mark it as active
      this.windows = this.windows.filter((win) => {
        if (win.id !== id) {
          return true;
        }
        return false; // Remove the current window from its position
      });
      this.windows.push(window);

      this.renderWindowsActivationState();
    }
  }

  renderWindowsActivationState() {
    const activeWindow = this.getActiveWindow();

    if (!activeWindow) return;

    this.windows.forEach(async (win, index) => {
      const $win = await $(win.el);
      const $titleBar = await $(win.el).find(".title-bar");

      // reorder windows based on their index
      await $win.css("z-index", index.toString());

      const hasInactiveClass = async () => await $titleBar.hasClass("inactive");

      if (!(await hasInactiveClass())) {
        await $win.addClass("inactive"); // Set inactive style
        await $titleBar.addClass("inactive"); // Set active window style
      }

      if (win.id === activeWindow.id) {
        if (await hasInactiveClass()) {
          await $win.removeClass("inactive"); // Remove inactive style
          await $titleBar.removeClass("inactive"); // Set active window style
        }
      }
    });
  }

  addWindow(options: CreateWindowOptions): WindowState {
    const id = options.id || crypto.randomUUID();
    const state: Partial<WindowState> = {
      id,
      title: options.title || defaultWindowOptions.title,
      icon: options.icon || defaultWindowOptions.icon,
      width: options.width || defaultWindowOptions.width,
      height: options.height || defaultWindowOptions.height,
      prevX: options.x || defaultWindowOptions.x,
      prevY: options.y || defaultWindowOptions.y,
      prevWidth: options.width || defaultWindowOptions.width,
      prevHeight: options.height || defaultWindowOptions.height,
      originalDimensionsStored: false,
      x: options.x || defaultWindowOptions.x,
      y: options.y || defaultWindowOptions.y,
      resizable:
        options.resizable !== undefined
          ? options.resizable
          : defaultWindowOptions.resizable,
      minimizable:
        options.minimizable !== undefined
          ? options.minimizable
          : defaultWindowOptions.minimizable,
      maximizable:
        options.maximizable !== undefined
          ? options.maximizable
          : defaultWindowOptions.maximizable,
      minimized:
        options.minimized !== undefined
          ? options.minimized
          : defaultWindowOptions.minimized,
      maximized:
        options.maximized !== undefined
          ? options.maximized
          : defaultWindowOptions.maximized,
    };

    // get the most recent windows x and y position
    const activeWindow = this.getActiveWindow();

    if (activeWindow) {
      // Offset by 20px from the last window
      state.x = activeWindow.x + 20;
      state.y = activeWindow.y + 20;
    }

    this.windows.push(state as WindowState);

    return state as WindowState;
  }

  updateWindow(
    id: string,
    options: Partial<WindowState>,
  ): WindowState | undefined {
    const win = this.getWindow(id);
    if (!win) return undefined;

    // special case for prevX and prevY
    if (win.x) {
      options.prevX = win.x;
    }

    if (win.y) {
      options.prevY = win.y;
    }

    const updatedWindow: WindowState = {
      ...win,
      ...options,
      id: win.id, // ensure ID remains unchanged
    };

    // Update the window status in the list
    this.windows = this.windows.map((win) =>
      win.id === id
        ? {
          ...win,
          ...updatedWindow,
        }
        : win,
    );
    return updatedWindow;
  }

  closeWindow(id: string) {
    const win = this.getWindow(id);

    if (!win) return;

    $(win.el).remove(); // Remove the window element from the DOM

    this.windows = this.windows.filter((win) => win.id !== id);

    this.renderWindowsActivationState();

    win.ref.state?.onClose?.(); // Trigger the close callback if provided
  }

  maximizeWindow(id: string) {
    let win = this.getWindow(id);
    if (!win) return;

    // Toggle maximized state
    const isMaximized = !win.maximized;

    // Store current ACTUAL dimensions before maximizing (only once)
    if (isMaximized) {
      // Only store original dimensions if we've never stored them before
      if (!win.originalDimensionsStored) {
        // Get actual rendered dimensions
        const actualWidth = win.el.offsetWidth || win.width;
        const actualHeight = win.el.offsetHeight || win.height;
        win = this.updateWindow(id, {
          prevX: win.x,
          prevY: win.y,
          prevWidth: actualWidth,
          prevHeight: actualHeight,
          originalDimensionsStored: true,
        })!;
      } else {
        // Just update position but keep original dimensions
        win = this.updateWindow(id, {
          prevX: win.x,
          prevY: win.y,
        })!;
      }
    }

    const desktopDimensions = desktopManager.getDimensions();

    // Get fresh window data after storing previous values
    const freshWin = this.getWindow(id)!;

    // Update the window state
    win = this.updateWindow(id, {
      maximized: isMaximized,
      width: isMaximized ? desktopDimensions.width : freshWin.prevWidth,
      height: isMaximized ? desktopDimensions.height : freshWin.prevHeight,
      x: isMaximized ? 0 : freshWin.prevX,
      y: isMaximized ? 0 : freshWin.prevY,
    })!;

    const $win = $(win.el);
    $win.css({
      width: isMaximized
        ? `${desktopDimensions.width + 6}px`
        : `${win.width}px`,
      height: isMaximized
        ? `${desktopDimensions.height + 9}px`
        : `${win.height}px`,
      left: isMaximized ? "-3px" : `${win.x}px`,
      top: isMaximized ? "-3px" : `${win.y}px`,
    });

    // Update the title bar button state
    this.toggleTitleBarMaximizedButtonState(id);

    // Trigger the maximize callback if provided
    if (isMaximized) {
      win.ref.state?.onMaximize?.();
    }
  }

  minimizeWindow(id: string) {
    let win = this.getWindow(id);
    if (!win) return;

    // x and y position update (update prev to current position)
    win = this.updateWindow(id, { prevX: win.x, prevY: win.y })!;

    // Toggle minimized state
    const isMinimized = !win.minimized;

    // Update the window state
    win = this.updateWindow(id, {
      minimized: isMinimized,
      width: isMinimized ? 0 : win.width,
      height: isMinimized ? 0 : win.height,
      x: isMinimized ? -10000 : win.x, // Move off-screen when minimized
      y: isMinimized ? -10000 : win.y,
    })!;

    const $win = $(win.el);
    $win.css({
      width: isMinimized ? "0px" : `${win.width}px`,
      height: isMinimized ? "0px" : `${win.height}px`,
      left: isMinimized ? "-10000px" : `${win.x}px`,
      top: isMinimized ? "-10000px" : `${win.y}px`,
    });

    // Trigger the minimize callback if provided
    if (isMinimized) {
      win.ref.state?.onMinimize?.();
    }
  }

  restoreWindow(id: string) {
    let win = this.getWindow(id);
    if (!win) return;

    // Restore the window to its previous position and size
    win = this.updateWindow(id, {
      maximized: false,
      width: win.prevWidth || 800, // Use stored previous width
      height: win.prevHeight || 600, // Use stored previous height
      x: win.prevX || 0,
      y: win.prevY || 0,
    })!;

    const $win = $(win.el);
    $win.css({
      width: `${win.width}px`,
      height: `${win.height}px`,
      left: `${win.x}px`,
      top: `${win.y}px`,
    });

    // Update the title bar button state
    this.toggleTitleBarMaximizedButtonState(id);
  }

  toggleTitleBarMaximizedButtonState(id: string) {
    const win = this.getWindow(id);
    if (!win) return;

    // Toggle maximized state
    const isMaximized = !win.maximized;

    $(win.el)
      .query(
        isMaximized
          ? "button[aria-label='Restore']"
          : "button[aria-label='Maximize']",
      )
      .attr("aria-label", isMaximized ? "Maximize" : "Restore");
  }
}

// Ensure singleton of WindowManager module-wide
globalThis.__defussWindowManager =
  globalThis.__defussWindowManager || new WindowManager();

export const windowManager = globalThis.__defussWindowManager;
