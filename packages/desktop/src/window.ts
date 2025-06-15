import { $ } from "defuss";

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
  title: string;
  icon: string;
  width: number;
  height: number;
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
    const window = this.getWindow(id);
    if (!window) return undefined;

    const updatedWindow: WindowState = {
      ...window,
      ...options,
      id: window.id, // ensure ID remains unchanged
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

  removeWindow(id: string) {
    const window = this.getWindow(id);

    if (!window) return;

    $(window.el).remove(); // Remove the window element from the DOM

    this.windows = this.windows.filter((win) => win.id !== id);

    this.renderWindowsActivationState();
  }
}

// Ensure singleton of WindowManager module-wide
globalThis.__defussWindowManager =
  globalThis.__defussWindowManager || new WindowManager();

export const windowManager = globalThis.__defussWindowManager;
