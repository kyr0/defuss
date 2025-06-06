import type { DesktopShellTheme } from "./shell.js";

export interface CreateWindowOptions {
  id?: string;
  theme: DesktopShellTheme;
  title: string;
  stateful?: boolean; // if stateful, and if it has an id, it uses windowManagerStore to save its state
  icon?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  draggable?: boolean;
  closeable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  minimized?: boolean;
  maximized?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export interface WindowState {
  id: string;
  theme: string;
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
  theme: "xp",
  title: "New Window",
  stateful: false,
  resizable: true,
  draggable: true,
  closeable: true,
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

export class Window {
  el?: HTMLElement;
  constructor(public options: CreateWindowOptions = defaultWindowOptions) {
    this.options.id = options.id || crypto.randomUUID();

    if (options.stateful && this.options.id) {
      // Load state from windowManagerStore if available
    }

    __defussDesktopManager.placeWindow(this);
  }

  decorate(el: HTMLElement) {
    this.el = el;
    el.classList.add("defuss-window");
    el.style.width = `${this.options.width}px`;
    el.style.height = `${this.options.height}px`;
    el.style.left = `${this.options.x}px`;
    el.style.top = `${this.options.y}px`;

    if (this.options.resizable) {
      el.classList.add("defuss-window-resizable");
    }
    if (this.options.draggable) {
      el.classList.add("defuss-window-draggable");
    }
  }
}
