import { $, type Ref } from "defuss";
import type { WindowRefState } from "./regui/components/window.js";
import { desktopManager } from "./index.js";

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
  ref: Ref<WindowRefState>;
  title: string;
  icon: string;
  width: number;
  height: number;
  // Previous position before maximization or minimization
  prevX: number;
  prevY: number;
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
  onClose: () => {},
  onMinimize: () => {},
  onMaximize: () => {},
};

export class WindowManager {
  windows: Array<WindowState> = [];

  getActiveWindow(): WindowState | undefined {
    return this.windows[this.windows.length - 1]; // Return the last window as active
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

    console.log("window move update stattus", updatedWindow);

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

    // x and y position update (update prev to current position)
    // updateWindow will internally update prevX and prevY
    win = this.updateWindow(id, { prevX: win.x, prevY: win.y })!;

    console.log("[WindowManager] Maximizing window:", id, win);
    // Toggle maximized state
    const isMaximized = !win.maximized;

    // Update the window state
    win = this.updateWindow(id, {
      maximized: isMaximized,
      width: isMaximized ? win.el.clientWidth : win.width,
      height: isMaximized ? win.el.clientHeight : win.height,
      x: isMaximized ? 0 : win.x,
      y: isMaximized ? 0 : win.y,
    })!;

    const desktopDimensions = desktopManager.getDimensions();

    const $win = $(win.el);
    $win.css({
      width: isMaximized ? `${desktopDimensions.width}px` : `${win.width}px`,
      height: isMaximized ? `${desktopDimensions.height}px` : `${win.height}px`,
      left: isMaximized ? "0px" : `${win.x}px`,
      top: isMaximized ? "0px" : `${win.y}px`,
    });

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

    console.log("[WindowManager] Restoring window:", id, win);

    // Restore the window to its previous position and size
    win = this.updateWindow(id, {
      maximized: false,
      width: win.prevX ? win.width : 800, // Default width if not set
      height: win.prevY ? win.height : 600, // Default height if not set
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
  }
}

// Ensure singleton of WindowManager module-wide
globalThis.__defussWindowManager =
  globalThis.__defussWindowManager || new WindowManager();

export const windowManager = globalThis.__defussWindowManager;
